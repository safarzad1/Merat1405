import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 3 * 1024 * 1024;
type Target = "RESEARCH_WORKSHEET" | "RESEARCH_ASSIGNMENT";
function target(value: unknown): Target {
  if (value === "RESEARCH_WORKSHEET" || value === "RESEARCH_ASSIGNMENT") return value;
  throw new ApiError(400, "TARGET", "نوع سند محقق معتبر نیست.");
}
function fileName(name: string): string {
  const value = name.trim();
  if (!value || value.length > 255 || /[\\/\x00-\x1f\x7f]/.test(value) || value === "." || value === "..")
    throw new ApiError(400, "FILENAME", "نام فایل معتبر نیست.");
  return value;
}
function sniff(bytes: Buffer, name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if ((ext === "jpg" || ext === "jpeg") && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return "image/jpeg";
  if (ext === "webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  throw new ApiError(415, "FILE_TYPE", "فقط تصویر JPG، PNG یا WEBP مجاز است. PDF پذیرفته نمی‌شود.");
}
function failProvinceDocument(error: unknown) {
  const e = error as {number?: unknown; originalError?: {info?: {number?: unknown}}; message?: unknown};
  const code = typeof e?.number === "number" ? e.number : e?.originalError?.info?.number;
  if (typeof code === "number" && code >= 56300 && code < 56400)
    return fail(new ApiError(409, `SQL_${code}`, String(e.message || "ثبت پیوست مجاز نیست.")));
  // Missing procedure/table, schema drift, and cross-database access are
  // infrastructure errors. Return a safe diagnostic code, not raw SQL details.
  // Keep the complete exception in server logs for administrators.
  const known: Record<number, [string, string]> = {
    2812: ["DOCUMENT_PROCEDURE_MISSING", "پروسیجر پیوست محقق در پایگاه داده نصب نشده است."],
    208: ["DOCUMENT_TABLE_MISSING", "جدول موردنیاز پیوست‌ها در پایگاه داده یافت نشد."],
    207: ["DOCUMENT_SCHEMA_MISMATCH", "ساختار جدول پیوست‌ها با نسخه برنامه سازگار نیست."],
    229: ["DOCUMENT_DB_PERMISSION", "دسترسی پایگاه داده به اسناد محقق کافی نیست."],
    916: ["DOCUMENT_FILES_DB_ACCESS", "دسترسی به پایگاه داده فایل‌ها برقرار نیست."],
    4060: ["DOCUMENT_DB_CONNECTION", "اتصال به پایگاه داده فایل‌ها برقرار نیست."],
  };
  if (typeof code === "number" && known[code]) {
    const [diagnostic, message] = known[code];
    console.error("ProvinceInvestigatorDocuments SQL failure", error);
    return fail(new ApiError(503, diagnostic, message));
  }
  return fail(error);
}
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const kind = target(req.nextUrl.searchParams.get("targetEntity"));
    const recordId = requiredInt(req.nextUrl.searchParams.get("targetRecordId"), "شناسه سند");
    return respond(await execute("TahghighatV2.SP_ListProvinceInvestigatorDocuments", q => q
      .input("TargetEntity", sql.VarChar(40), kind)
      .input("TargetRecordId", sql.BigInt, recordId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return failProvinceDocument(error); }
}
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BYTES + 128_000) throw new ApiError(413, "FILE_SIZE", "حجم درخواست زیاد است.");
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
      throw new ApiError(415, "FORM", "درخواست باید شامل فایل باشد.");
    const body = await req.formData();
    const kind = target(body.get("targetEntity"));
    const recordId = requiredInt(body.get("targetRecordId"), "شناسه سند");
    const description = body.get("description");
    if (typeof description !== "string" || description.length > 1500)
      throw new ApiError(400, "DESCRIPTION", "توضیحات پیوست باید حداکثر ۱۵۰۰ نویسه باشد.");
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES)
      throw new ApiError(413, "FILE_SIZE", "یک فایل با حداکثر حجم ۳ مگابایت انتخاب کنید.");
    const name = fileName(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new ApiError(413, "FILE_SIZE", "حجم فایل زیاد است.");
    const mime = sniff(bytes, name);
    const rows = await executeMutation("TahghighatV2.SP_UploadProvinceInvestigatorDocument", q => q
      .input("TargetEntity", sql.VarChar(40), kind)
      .input("TargetRecordId", sql.BigInt, recordId)
      .input("OriginalFileName", sql.NVarChar(255), name)
      .input("MimeType", sql.NVarChar(100), mime)
      .input("FileData", sql.VarBinary(sql.MAX), bytes)
      .input("AttachmentDescription", sql.NVarChar(1500), description.trim() || null)
      .input("UserId", sql.BigInt, userId));
    return NextResponse.json({ok:true,attachmentId:rows[0].AttachmentId}, {status:201, headers:{"Cache-Control":"no-store"}});
  } catch(error) {return failProvinceDocument(error);}
}

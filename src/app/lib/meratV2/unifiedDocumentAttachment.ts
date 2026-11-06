import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, fail, requireSameOrigin } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const TARGETS = ["RESEARCH_WORKSHEET", "RESEARCH_ASSIGNMENT", "COUNTY_REPLY_EVENT", "COUNTY_SUMMARY", "HOZE_SUMMARY", "PROVINCE_SUMMARY"] as const;
export type DocumentTarget = typeof TARGETS[number];

function getTarget(value: string | null): DocumentTarget {
  if (value && (TARGETS as readonly string[]).includes(value)) return value as DocumentTarget;
  throw new ApiError(400, "TARGET", "نوع سند معتبر نیست.");
}
function positiveId(value: string | null): number {
  if (!value || !/^\d{1,15}$/.test(value)) throw new ApiError(400, "TARGET_ID", "شناسه سند معتبر نیست.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new ApiError(400, "TARGET_ID", "شناسه سند معتبر نیست.");
  return n;
}
function attachmentId(value: string | null): string {
  if (!value || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))
    throw new ApiError(400, "ATTACHMENT_ID", "شناسه پیوست معتبر نیست.");
  return value;
}
function safeName(value: string): string {
  const name = value.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").trim() || "";
  if (!name || name.length > 255 || name === "." || name === "..")
    throw new ApiError(400, "FILENAME", "نام فایل معتبر نیست.");
  return name;
}
function mimeFromBytes(bytes: Buffer, fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (ext === "png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if ((ext === "jpg" || ext === "jpeg") && bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))) return "image/jpeg";
  if (ext === "webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  throw new ApiError(415, "FILE_TYPE", "فقط PDF، JPG، PNG و WEBP پذیرفته می‌شوند.");
}
function targetForRequest(req: NextRequest, forced?: DocumentTarget): { entity: DocumentTarget; id: number } {
  const query = req.nextUrl.searchParams;
  const entity = forced ?? getTarget(query.get("targetEntity"));
  const id = positiveId(query.get("targetRecordId") ?? query.get("worksheetId"));
  return { entity, id };
}

/** Both legacy worksheet routes and new summary routes call the SAME stored procedures. */
export async function listDocumentAttachments(req: NextRequest, forced?: DocumentTarget): Promise<NextResponse> {
  try {
    const userId = await authenticatedUserId();
    const target = targetForRequest(req, forced);
    const rows = await execute("TahghighatV2.SP_ListDocumentAttachments", q => q
      .input("TargetEntity", sql.VarChar(40), target.entity)
      .input("TargetRecordId", sql.BigInt, target.id)
      .input("UserId", sql.BigInt, userId));
    return NextResponse.json({ ok: true, data: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return fail(error); }
}

export async function uploadDocumentAttachment(req: NextRequest, forced?: DocumentTarget): Promise<NextResponse> {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    if (Number(req.headers.get("content-length") || 0) > MAX_FILE_BYTES + 128_000)
      throw new ApiError(413, "FILE_SIZE", "حجم پیوست بیش از حد مجاز است.");
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
      throw new ApiError(415, "FORM", "درخواست باید multipart/form-data باشد.");
    const form = await req.formData();
    const entity = forced ?? getTarget(String(form.get("targetEntity") ?? ""));
    const id = positiveId(String(form.get("targetRecordId") ?? form.get("worksheetId") ?? ""));
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "FILE", "فایل الزامی است.");
    if (file.size < 1 || file.size > MAX_FILE_BYTES)
      throw new ApiError(413, "FILE_SIZE", "حجم فایل باید حداکثر ۳ مگابایت باشد.");
    const name = safeName(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = mimeFromBytes(bytes, name);
    const uploadProcedure = entity === "COUNTY_SUMMARY" || entity === "HOZE_SUMMARY"
      ? "TahghighatV2.SP_UploadSummaryDocumentAttachment"
      : "TahghighatV2.SP_UploadDocumentAttachment";
    const rows = await execute(uploadProcedure, q => q
      .input("TargetEntity", sql.VarChar(40), entity)
      .input("TargetRecordId", sql.BigInt, id)
      .input("OriginalFileName", sql.NVarChar(255), name)
      .input("MimeType", sql.NVarChar(100), mime)
      .input("FileData", sql.VarBinary(sql.MAX), bytes)
      .input("UserId", sql.BigInt, userId));
    if (rows.length !== 1 || (rows[0]?.IsSuccess !== true && rows[0]?.IsSuccess !== 1))
      throw new ApiError(409, "SQL_NOT_ACKNOWLEDGED", "ثبت پیوست تأیید نشد.");
    return NextResponse.json({ ok: true, attachmentId: rows[0].AttachmentId },
      { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function downloadDocumentAttachment(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await authenticatedUserId();
    const id = attachmentId(req.nextUrl.searchParams.get("attachmentId"));
    const rows = await execute("TahghighatV2.SP_DownloadDocumentAttachment", q => q
      .input("AttachmentId", sql.UniqueIdentifier, id)
      .input("UserId", sql.BigInt, userId));
    const file = rows[0];
    if (!file || !(file.FileData instanceof Uint8Array))
      throw new ApiError(404, "NOT_FOUND", "فایل یافت نشد.");
    const bytes = new Uint8Array(file.FileData);
    const name = safeName(String(file.OriginalFileName));
    return new NextResponse(bytes, { status: 200, headers: {
      "Content-Type": String(file.MimeType),
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store, max-age=0",
    } });
  } catch (error) { return fail(error); }
}

export async function deleteDocumentAttachment(req: NextRequest): Promise<NextResponse> {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const id = attachmentId(req.nextUrl.searchParams.get("attachmentId"));
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json"))
      throw new ApiError(415, "JSON", "درخواست حذف باید JSON باشد.");
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 4096) throw new ApiError(413, "BODY_SIZE", "حجم درخواست زیاد است.");
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 4096) throw new ApiError(413, "BODY_SIZE", "حجم درخواست زیاد است.");
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new ApiError(400, "JSON", "JSON معتبر نیست."); }
    // Deletion is confirmed in the UI; the server supplies an auditable system reason.
    // Do not rely on a mutable client-submitted reason.
    const reason = "حذف پیوست با تأیید کاربر";
    const rows = await execute("TahghighatV2.SP_DeleteDocumentAttachment", q => q
      .input("AttachmentId", sql.UniqueIdentifier, id)
      .input("UserId", sql.BigInt, userId)
      .input("Reason", sql.NVarChar(500), reason));
    if (rows.length !== 1 || (rows[0]?.IsSuccess !== true && rows[0]?.IsSuccess !== 1))
      throw new ApiError(409, "SQL_NOT_ACKNOWLEDGED", "حذف پیوست تأیید نشد.");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

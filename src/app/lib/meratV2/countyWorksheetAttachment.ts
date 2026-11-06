import { ApiError, authenticatedUserId, execute, fail, requireSameOrigin } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
import { NextRequest, NextResponse } from "next/server";

/** Files go directly from server to SQL VARBINARY(MAX); never saved to a local folder. */
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export function worksheetIdFrom(value: string | null): number {
  if (!value || !/^\d{1,15}$/.test(value))
    throw new ApiError(400, "WORKSHEET_ID", "شناسه کاربرگ معتبر نیست.");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new ApiError(400, "WORKSHEET_ID", "شناسه کاربرگ معتبر نیست.");
  return id;
}

export function attachmentIdFrom(value: string | null): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new ApiError(400, "ATTACHMENT_ID", "شناسه پیوست معتبر نیست.");
  return value;
}

export function safeName(filename: string): string {
  const name = filename.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim() ?? "";
  if (!name || name.length > 255 || name === "." || name === "..")
    throw new ApiError(400, "FILENAME", "نام فایل معتبر نیست.");
  return name;
}

/** Trust bytes, not the client-provided Content-Type. */
export function mimeFromSignature(bytes: Buffer, name: string): string {
  const extension = name.toLowerCase().split(".").pop();
  if (extension === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-")
    return "application/pdf";
  if (extension === "png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    return "image/png";
  if ((extension === "jpg" || extension === "jpeg") && bytes.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (extension === "webp" && bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  throw new ApiError(415, "FILE_TYPE", "فقط PDF، JPG، PNG و WEBP معتبر پذیرفته می‌شوند.");
}

export async function uploadWorksheetAttachment(req: NextRequest): Promise<NextResponse> {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_ATTACHMENT_BYTES + 256_000)
      throw new ApiError(413, "FILE_TOO_LARGE", "حجم فایل نباید بیشتر از ۳ مگابایت باشد.");
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
      throw new ApiError(415, "FORM_TYPE", "درخواست باید از نوع multipart/form-data باشد.");
    const form = await req.formData();
    const worksheetId = worksheetIdFrom(String(form.get("worksheetId") ?? ""));
    const uploaded = form.get("file");
    if (!(uploaded instanceof File))
      throw new ApiError(400, "FILE_REQUIRED", "فایل پیوست الزامی است.");
    if (uploaded.size < 1 || uploaded.size > MAX_ATTACHMENT_BYTES)
      throw new ApiError(413, "FILE_TOO_LARGE", "حجم فایل باید بین ۱ بایت و ۳ مگابایت باشد.");
    const filename = safeName(uploaded.name);
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    const mime = mimeFromSignature(bytes, filename);
    const rows = await execute("TahghighatV2.SP_CountyUploadWorksheetAttachment", q => q
      .input("WorksheetId", sql.BigInt, worksheetId)
      .input("OriginalFileName", sql.NVarChar(255), filename)
      .input("MimeType", sql.NVarChar(100), mime)
      .input("FileData", sql.VarBinary(sql.MAX), bytes)
      .input("UserId", sql.BigInt, userId));
    if (rows[0]?.IsSuccess !== true && rows[0]?.IsSuccess !== 1)
      throw new Error("SQL attachment upload not acknowledged");
    return NextResponse.json({ ok: true, attachmentId: rows[0]?.AttachmentId },
      { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function listWorksheetAttachments(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await authenticatedUserId();
    const worksheetId = worksheetIdFrom(req.nextUrl.searchParams.get("worksheetId"));
    const rows = await execute("TahghighatV2.SP_CountyListWorksheetAttachments", q => q
      .input("WorksheetId", sql.BigInt, worksheetId)
      .input("UserId", sql.BigInt, userId));
    return NextResponse.json({ ok: true, data: rows },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function downloadWorksheetAttachment(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await authenticatedUserId();
    const attachmentId = attachmentIdFrom(req.nextUrl.searchParams.get("attachmentId"));
    const rows = await execute("TahghighatV2.SP_CountyDownloadWorksheetAttachment", q => q
      .input("AttachmentId", sql.UniqueIdentifier, attachmentId)
      .input("UserId", sql.BigInt, userId));
    const record = rows[0];
    if (!record || !(record.FileData instanceof Uint8Array))
      throw new ApiError(404, "NOT_FOUND", "پیوست یافت نشد.");
    const filename = safeName(String(record.OriginalFileName));
    const content = new Uint8Array(record.FileData);
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": String(record.MimeType),
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) { return fail(error); }
}

export async function deleteWorksheetAttachment(req: NextRequest): Promise<NextResponse> {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const attachmentId = attachmentIdFrom(req.nextUrl.searchParams.get("attachmentId"));
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json"))
      throw new ApiError(415, "JSON_REQUIRED", "نوع درخواست باید JSON باشد.");
    const body = await req.json() as { reason?: unknown };
    const reason = body?.reason;
    if (typeof reason !== "string" || !reason.trim() || reason.length > 1000)
      throw new ApiError(400, "REASON", "علت حذف، حداکثر ۱۰۰۰ نویسه، الزامی است.");
    const rows = await execute("TahghighatV2.SP_CountyDeleteWorksheetAttachment", q => q
      .input("AttachmentId", sql.UniqueIdentifier, attachmentId)
      .input("UserId", sql.BigInt, userId)
      .input("Reason", sql.NVarChar(1000), reason.trim()));
    if (rows[0]?.IsSuccess !== true && rows[0]?.IsSuccess !== 1)
      throw new Error("SQL attachment delete not acknowledged");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

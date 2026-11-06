import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, executeMutation, fail, requireSameOrigin, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const LIMIT = 3 * 1024 * 1024;
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    if (Number(req.headers.get("content-length") || 0) > LIMIT + 128_000)
      throw new ApiError(413, "FILE_SIZE", "حجم فایل بیش از حد مجاز است.");
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
      throw new ApiError(415, "FORM", "درخواست باید شامل تصویر باشد.");
    const body = await req.formData();
    const worksheetId = requiredInt(body.get("worksheetId"), "شناسه کاربرگ");
    const page = requiredInt(body.get("page"), "شماره صفحه");
    if (page !== 1 && page !== 2) throw new ApiError(400, "PAGE", "فقط صفحه اول یا دوم معتبر است.");
    const expectedRaw = body.get("expectedAttachmentId");
    let expectedAttachmentId: string | null = null;
    if (expectedRaw !== null) {
      if (typeof expectedRaw !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expectedRaw))
        throw new ApiError(400, "ATTACHMENT_ID", "شناسه سند قبلی معتبر نیست.");
      expectedAttachmentId = expectedRaw;
    }
    const file = body.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > LIMIT)
      throw new ApiError(413, "FILE_SIZE", "تصویر باید حداکثر سه مگابایت باشد.");
    const name = file.name.trim();
    if (!name || name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(name))
      throw new ApiError(400, "FILENAME", "نام تصویر معتبر نیست.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = name.toLowerCase().split(".").pop();
    let mime: string;
    if (ext === "png" && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = "image/png";
    else if ((ext === "jpg" || ext === "jpeg") && bytes.subarray(0,3).equals(Buffer.from([255,216,255]))) mime = "image/jpeg";
    else if (ext === "webp" && bytes.subarray(0,4).toString("ascii") === "RIFF" && bytes.subarray(8,12).toString("ascii") === "WEBP") mime = "image/webp";
    else throw new ApiError(415, "FILE_TYPE", "تنها تصاویر PNG، JPG و WEBP مجاز هستند.");
    const rows = await executeMutation("TahghighatV2.SP_UploadWorksheetSummaryPage", q => q
      .input("WorksheetId",sql.BigInt,worksheetId)
      .input("Page",sql.Int,page)
      .input("UserId",sql.BigInt,userId)
      .input("OriginalFileName",sql.NVarChar(255),name)
      .input("MimeType",sql.NVarChar(100),mime)
      .input("FileData",sql.VarBinary(sql.MAX),bytes)
      .input("ExpectedAttachmentId",sql.UniqueIdentifier,expectedAttachmentId));
    if (!rows.length || (rows[0].IsSuccess !== 1 && rows[0].IsSuccess !== true))
      throw new ApiError(409,"NOT_ACKNOWLEDGED","ثبت تصویر تأیید نشد.");
    return NextResponse.json({ok:true,attachmentId:rows[0].AttachmentId},{status:201,headers:{"Cache-Control":"no-store"}});
  } catch (error) { return fail(error); }
}

import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, fail, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const guid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const parentId = requiredInt(request.nextUrl.searchParams.get("parentReferralId"), "شناسه ارجاع استان");
    const childId = requiredInt(request.nextUrl.searchParams.get("childReferralId"), "شناسه ارجاع مقصد");
    const attachmentId = request.nextUrl.searchParams.get("attachmentId");
    if (!attachmentId || !guid.test(attachmentId))
      throw new ApiError(400, "ATTACHMENT_ID", "شناسه پیوست معتبر نیست.");
    const rows = await execute("TahghighatV2.SP_GetProvinceChildDossierFile", q => q
      .input("ParentReferralId", sql.BigInt, parentId)
      .input("ChildReferralId", sql.BigInt, childId)
      .input("AttachmentId", sql.UniqueIdentifier, attachmentId)
      .input("UserId", sql.BigInt, userId));
    const file = rows[0];
    if (!file || !(file.FileData instanceof Uint8Array))
      throw new ApiError(404, "NOT_FOUND", "فایل در محدوده ارجاع این استان یافت نشد.");
    const bytes = new Uint8Array(file.FileData);
    const mime = String(file.MimeType || "application/octet-stream");
    const name = String(file.OriginalFileName || "document").split(/[\\/]/).pop()!
      .replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255);
    return new NextResponse(bytes, {headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store, max-age=0"
    }});
  } catch (error) { return fail(error); }
}

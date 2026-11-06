import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, fail, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const guid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** File bytes are returned only after verifying director + owning province + case tree in SQL. */
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(request.nextUrl.searchParams.get("referralId"), "ارجاع استان");
    const attachmentId = request.nextUrl.searchParams.get("attachmentId");
    if (!attachmentId || !guid.test(attachmentId))
      throw new ApiError(400, "ATTACHMENT_ID", "شناسه پیوست معتبر نیست.");
    const rows = await execute("TahghighatV2.SP_GetDirectorReviewDossierFile", query => query
      .input("ReferralId", sql.BigInt, referralId)
      .input("AttachmentId", sql.UniqueIdentifier, attachmentId)
      .input("UserId", sql.BigInt, userId));
    const file = rows[0];
    if (!file || !(file.FileData instanceof Uint8Array))
      throw new ApiError(404, "NOT_FOUND", "سند در محدوده پرونده این استان یافت نشد.");
    const bytes = new Uint8Array(file.FileData);
    const name = String(file.OriginalFileName || "document").split(/[\\/]/).pop()!
      .replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255);
    return new NextResponse(bytes, { headers: {
      "Content-Type": String(file.MimeType || "application/octet-stream"),
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store, max-age=0"
    } });
  } catch (error) { return fail(error); }
}

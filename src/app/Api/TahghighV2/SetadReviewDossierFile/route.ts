import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, fail, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** File access requires the same server-side case and post permission checks as the dossier. */
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(req.nextUrl.searchParams.get("referralId"), "ارجاع");
    const attachmentId = req.nextUrl.searchParams.get("attachmentId");
    if (!attachmentId || !uuid.test(attachmentId))
      throw new ApiError(400, "INVALID_ATTACHMENT", "شناسه سند معتبر نیست.");
    const rows = await execute("TahghighatV2.SP_GetSetadReviewDossierFile", query => query
      .input("ReferralId", sql.BigInt, referralId)
      .input("AttachmentId", sql.UniqueIdentifier, attachmentId)
      .input("UserId", sql.BigInt, userId));
    const file = rows[0];
    if (!file || !(file.FileData instanceof Uint8Array))
      throw new ApiError(404, "DOCUMENT_NOT_FOUND", "سند در محدوده این پرونده یافت نشد.");
    const bytes = new Uint8Array(file.FileData);
    const safeName = String(file.OriginalFileName || "document")
      .split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255);
    return new NextResponse(bytes, { headers: {
      "Content-Type": String(file.MimeType || "application/octet-stream"),
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store, max-age=0"
    }});
  } catch (error) { return fail(error); }
}

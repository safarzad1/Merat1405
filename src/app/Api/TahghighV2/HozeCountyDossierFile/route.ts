import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, fail, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const guid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const hozeId = requiredInt(req.nextUrl.searchParams.get("hozeReferralId"), "ارجاع حوزه");
    const countyId = requiredInt(req.nextUrl.searchParams.get("countyReferralId"), "ارجاع شهرستان");
    const attachmentId = req.nextUrl.searchParams.get("attachmentId");
    if (!attachmentId || !guid.test(attachmentId))
      throw new ApiError(400, "ATTACHMENT_ID", "شناسه پیوست معتبر نیست.");
    const rows = await execute("TahghighatV2.SP_GetHozeCountyDossierFile", q => q
      .input("HozeReferralId", sql.BigInt, hozeId)
      .input("CountyReferralId", sql.BigInt, countyId)
      .input("AttachmentId", sql.UniqueIdentifier, attachmentId)
      .input("UserId", sql.BigInt, userId));
    const file = rows[0];
    if (!file || !(file.FileData instanceof Uint8Array))
      throw new ApiError(404, "NOT_FOUND", "پیوست در محدوده پرونده این حوزه یافت نشد.");
    const mime = String(file.MimeType);
    const name = String(file.OriginalFileName ?? "document")
      .split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255);
    const bytes = new Uint8Array(file.FileData);
    return new NextResponse(bytes, { headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store, max-age=0",
    }});
  } catch (error) { return fail(error); }
}

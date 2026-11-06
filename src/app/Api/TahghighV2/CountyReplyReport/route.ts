import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const id = requiredInt(req.nextUrl.searchParams.get("countyReferralId"), "ارجاع شهرستان");
    return respond(await execute("TahghighatV2.SP_GetCountyReplyReport", q => q
      .input("CountyReferralId", sql.BigInt, id).input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    // The combined report may be much longer than a single investigator's summary;
    // enforce a route-local byte limit without widening limits for other APIs.
    if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json"))
      throw new ApiError(415, "CONTENT_TYPE", "نوع درخواست معتبر نیست.");
    if (Number(req.headers.get("content-length") || 0) > 350000)
      throw new ApiError(413, "REPORT_TOO_LARGE", "حجم متن خروجی بیش از حد مجاز است.");
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 350000)
      throw new ApiError(413, "REPORT_TOO_LARGE", "حجم متن خروجی بیش از حد مجاز است.");
    let body: unknown;
    try { body = JSON.parse(raw); }
    catch { throw new ApiError(400, "INVALID_JSON", "اطلاعات ارسالی معتبر نیست."); }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new ApiError(400, "INVALID_JSON", "ساختار متن خروجی معتبر نیست.");
    const b = body as Record<string,unknown>;
    const id = requiredInt(b.countyReferralId, "ارجاع شهرستان");
    if (typeof b.reportText !== "string" || b.reportText.trim().length < 20 || b.reportText.trim().length > 80000)
      throw new ApiError(400, "REPORT_TEXT", "متن خروجی باید بین ۲۰ تا ۸۰٬۰۰۰ نویسه باشد.");
    if (!Array.isArray(b.assignmentIds) || b.assignmentIds.length < 1 || b.assignmentIds.length > 20)
      throw new ApiError(400, "ASSIGNMENTS", "فهرست محققان معتبر نیست.");
    const ids = b.assignmentIds.map(value => requiredInt(value, "شناسه محقق"));
    if (new Set(ids).size !== ids.length)
      throw new ApiError(400, "ASSIGNMENTS", "شناسه محقق تکراری است.");
    return respond(await executeMutation("TahghighatV2.SP_SaveCountyReplyReport", q => q
      .input("CountyReferralId", sql.BigInt, id)
      .input("ReportText", sql.NVarChar(sql.MAX), b.reportText as string)
      .input("AssignmentIdsJson", sql.NVarChar(sql.MAX), JSON.stringify(ids))
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

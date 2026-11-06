import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    const rows = await executeMutation("TahghighatV2.SP_HozeDeleteUntouchedCountyReferral", q => q
      .input("HozeReferralId", sql.BigInt, requiredInt(body.hozeReferralId, "شناسه ارجاع حوزه"))
      .input("CountyReferralId", sql.BigInt, requiredInt(body.countyReferralId, "شناسه ارجاع شهرستان"))
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch (error) {
    return fail(error);
  }
}

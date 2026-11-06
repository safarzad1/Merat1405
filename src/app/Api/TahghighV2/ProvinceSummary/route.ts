import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    const rows = await executeMutation("TahghighatV2.SP_SaveProvinceSummary", q => q
      .input("ReferralId", sql.BigInt, requiredInt(b.referralId,"ارجاع"))
      .input("SummaryText", sql.NVarChar(sql.MAX), requiredText(b.summaryText,"جمع‌بندی"))
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch(e) { return fail(e); }
}

import { NextRequest } from "next/server";
import { authenticatedUserId, action, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    const level = action(body.targetLevel, ["OSTAN", "HOZE"]);
    const result = await executeMutation("TahghighatV2.SP_DelegateChild", query => query
      .input("ParentReferralId", sql.BigInt, requiredInt(body.parentReferralId, "ارجاع مادر"))
      .input("DestinationCityId", sql.Int, requiredInt(body.destinationCityId, "مقصد"))
      .input("TargetLevel", sql.VarChar(20), level)
      .input("Description", sql.NVarChar(sql.MAX), requiredText(body.description, "شرح ارجاع"))
      .input("UserId", sql.BigInt, userId));
    return respond(result);
  } catch (error) { return fail(error); }
}

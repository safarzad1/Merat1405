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
    const rows = await executeMutation("TahghighatV2.SP_CreateInitialFromSetad", q => q
      .input("CodeEntekhabat", sql.Int, requiredInt(b.codeEntekhabat, "انتخابات"))
      .input("CodeHozeh", sql.Int, requiredInt(b.codeHozeh, "حوزه"))
      .input("ShomarehParvandeh", sql.BigInt, requiredInt(b.shomarehParvandeh, "شماره پرونده"))
      .input("OstanCityId", sql.Int, requiredInt(b.ostanCityId, "استان مقصد"))
      .input("Description", sql.NVarChar(sql.MAX), requiredText(b.description, "شرح ارجاع"))
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch(e) { return fail(e); }
}

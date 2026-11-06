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
    const result = await executeMutation("TahghighatV2.SP_ChildAction", query => query
      .input("ChildReferralId", sql.BigInt, requiredInt(body.childReferralId, "ارجاع فرعی"))
      .input("ActionCode", sql.VarChar(40), action(body.actionCode, ["CHILD_START", "CHILD_REPLY"]))
      .input("Description", sql.NVarChar(sql.MAX), requiredText(body.description, "توضیحات", 10000))
      .input("UserId", sql.BigInt, userId));
    return respond(result);
  } catch (error) { return fail(error); }
}

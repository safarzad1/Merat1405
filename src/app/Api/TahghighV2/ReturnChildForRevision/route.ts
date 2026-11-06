import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    const reason = requiredText(body.reason, "دلیل برگشت", 4000);
    if (reason.length < 5) throw new Error("دلیل برگشت باید حداقل پنج نویسه باشد.");
    const result = await executeMutation("TahghighatV2.SP_ReturnChildForRevision", q => q
      .input("ParentReferralId", sql.BigInt, requiredInt(body.parentReferralId, "ارجاع فرستنده"))
      .input("ChildReferralId", sql.BigInt, requiredInt(body.childReferralId, "ارجاع مقصد"))
      .input("Reason", sql.NVarChar(4000), reason)
      .input("UserId", sql.BigInt, userId));
    return respond(result);
  } catch (error) { return fail(error); }
}

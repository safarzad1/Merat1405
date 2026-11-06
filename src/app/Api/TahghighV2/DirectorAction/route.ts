import { NextRequest } from "next/server";
import { authenticatedUserId, action, executeMutation, fail, ApiError, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    const actionCode = action(b.actionCode,["DIRECTOR_APPROVE","RETURN_PROVINCE"]);
    // Approval may be submitted without a comment; returning to the expert requires a reason.
    if (b.description != null && typeof b.description !== "string")
      throw new ApiError(400, "INVALID_INPUT", "متن توضیحات نامعتبر است.");
    const description = actionCode === "RETURN_PROVINCE"
      ? requiredText(b.description,"دلیل برگشت")
      : (typeof b.description === "string" ? b.description.trim() : "");
    if (description.length > 6000)
      throw new ApiError(400, "INVALID_INPUT", "متن توضیحات بیش از ۶۰۰۰ نویسه است.");
    const rows = await executeMutation("TahghighatV2.SP_DirectorAction", q => q
      .input("ReferralId", sql.BigInt, requiredInt(b.referralId,"ارجاع"))
      .input("ActionCode", sql.VarChar(40), actionCode)
      .input("Description", sql.NVarChar(sql.MAX), description || null)
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch(e) { return fail(e); }
}

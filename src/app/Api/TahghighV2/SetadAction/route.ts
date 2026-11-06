import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, action, respond, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    const actionCode = action(body.actionCode, ["SETAD_APPROVE", "RETURN_PROVINCE", "SETAD_NOTE"]);
    if (body.description != null && typeof body.description !== "string")
      throw new ApiError(400, "INVALID_INPUT", "متن توضیحات معتبر نیست.");
    const description = actionCode === "SETAD_APPROVE"
      ? (typeof body.description === "string" ? body.description.trim() : "")
      : requiredText(body.description, actionCode === "RETURN_PROVINCE" ? "دلیل برگشت" : "نظر کارشناسی", 6000);
    if (description.length > 6000) throw new ApiError(400, "INVALID_INPUT", "متن توضیحات بیش از حد مجاز است.");
    const rows = await executeMutation("TahghighatV2.SP_SetadAction", q => q
      .input("ReferralId", sql.BigInt, requiredInt(body.referralId, "ارجاع"))
      .input("ActionCode", sql.VarChar(40), actionCode)
      .input("Description", sql.NVarChar(sql.MAX), description || null)
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch (e) { return fail(e); }
}

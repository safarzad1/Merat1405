import { NextRequest } from "next/server";
import { authenticatedUserId, action, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    const a = action(b.actionCode,["START_PROVINCE","NO_RESEARCH","SUBMIT_DIRECTOR"]);
    const desc = a === "START_PROVINCE" ? (typeof b.description === "string" ? b.description.trim().slice(0,6000) : "") : requiredText(b.description,"توضیحات");
    // Finalization is a server-side prerequisite: bypassing the UI must not send
    // a draft province summary to the director.
    if (a === "SUBMIT_DIRECTOR") {
      const forms = await execute("TahghighatV2.SP_GetProvinceSummaryForm", q => q
        .input("ReferralId", sql.BigInt, requiredInt(b.referralId,"ارجاع"))
        .input("UserId", sql.BigInt, userId));
      if (forms.length !== 1 || !Boolean(forms[0]?.IsFormFinalized) ||
          !String(forms[0]?.SummaryText ?? "").trim())
        throw new ApiError(409,"FORM_NOT_FINALIZED","ابتدا فرم جمع‌بندی استان را تأیید نهایی و تصاویر آن را ثبت کنید.");
    }
    const rows = await executeMutation("TahghighatV2.SP_ProvinceAction", q => q
      .input("ReferralId", sql.BigInt, requiredInt(b.referralId,"ارجاع"))
      .input("ActionCode", sql.VarChar(40), a)
      .input("Description", sql.NVarChar(sql.MAX), desc)
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch(e) { return fail(e); }
}

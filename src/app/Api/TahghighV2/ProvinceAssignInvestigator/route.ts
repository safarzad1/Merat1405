import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    const dueDate = b.dueDatePersian == null || b.dueDatePersian === "" ? null : b.dueDatePersian;
    if (dueDate !== null && (typeof dueDate !== "string" || !/^1[34][0-9]{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(dueDate)))
      throw new ApiError(400, "INVALID_PERSIAN_DATE", "تاریخ باید مانند 1405/08/15 باشد.");
    return respond(await executeMutation("TahghighatV2.SP_AssignProvinceInvestigator", q => q
      .input("ReferralId",sql.BigInt,requiredInt(b.referralId,"شناسه ارجاع"))
      .input("InvestigatorKey",sql.BigInt,requiredInt(b.investigatorKey,"شناسه محقق"))
      .input("Instruction",sql.NVarChar(sql.MAX),requiredText(b.instruction,"شرح مأموریت",6000))
      .input("UserId",sql.BigInt,userId)
      .input("DueDatePersian",sql.Char(10),dueDate)));
  } catch(e) { return fail(e); }
}

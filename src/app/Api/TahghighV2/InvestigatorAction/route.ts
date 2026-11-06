import { NextRequest } from "next/server";
import { authenticatedUserId, action, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    const actionCode = action(b.actionCode, ["INVESTIGATOR_START","CLOSE_ASSIGNMENT"]);
    const summary = actionCode === "CLOSE_ASSIGNMENT" ? requiredText(b.summary,"جمع‌بندی",6000) : null;
    return respond(await executeMutation("TahghighatV2.SP_InvestigatorAction", q => q
      .input("AssignmentId",sql.BigInt,requiredInt(b.assignmentId,"شناسه انتساب"))
      .input("ActionCode",sql.VarChar(40),actionCode)
      .input("UserId",sql.BigInt,userId)
      .input("Summary",sql.NVarChar(sql.MAX),summary)));
  } catch(e) { return fail(e); }
}

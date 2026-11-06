import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Officer records a worksheet for an investigator, who need not have a login. */
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    return respond(await executeMutation("TahghighatV2.SP_HozeOfficerSaveWorksheet", q => q
      .input("AssignmentId", sql.BigInt, requiredInt(body.assignmentId, "شناسه انتساب"))
      .input("ReportText", sql.NVarChar(sql.MAX), requiredText(body.reportText, "متن کاربرگ", 12000))
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

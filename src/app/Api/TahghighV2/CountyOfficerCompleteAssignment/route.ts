import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The authenticated county representative completes a registry-only investigator's work. */
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const userId = await authenticatedUserId();
    const body = await jsonBody(request);
    const assignmentId = requiredInt(body.assignmentId, "شناسه انتساب");
    const summary = requiredText(body.summary, "جمع‌بندی محقق", 12000).trim();
    if (summary.length < 50) {
      throw new ApiError(400, "INVESTIGATOR_SUMMARY_TOO_SHORT", "جمع‌بندی محقق باید حداقل ۵۰ نویسه باشد.");
    }
    return respond(await executeMutation("TahghighatV2.SP_CountyOfficerCompleteAssignment", query => query
      .input("AssignmentId", sql.BigInt, assignmentId)
      .input("Summary", sql.NVarChar(sql.MAX), summary)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

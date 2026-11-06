import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const assignmentId = requiredInt(req.nextUrl.searchParams.get("assignmentId"), "شناسه انتساب");
    const kind = req.nextUrl.searchParams.get("kind");
    if (kind !== null && kind !== "report") throw new ApiError(400, "KIND", "نوع درخواست معتبر نیست.");
    const sp = kind === "report"
      ? "TahghighatV2.SP_GetCountyInvestigatorReport"
      : "TahghighatV2.SP_GetCountyInvestigatorSummary";
    return respond(await execute(sp, q => q.input("AssignmentId", sql.BigInt, assignmentId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    const assignmentId = requiredInt(body.assignmentId, "شناسه انتساب");
    const summaryText = typeof body.summaryText === "string" ? body.summaryText.trim() : "";
    if (summaryText.length < 50 || summaryText.length > 12000)
      throw new ApiError(400, "SUMMARY_TEXT", "متن جمع‌بندی بین ۵۰ تا ۱۲۰۰۰ نویسه الزامی است.");
    return respond(await executeMutation("TahghighatV2.SP_SaveCountyInvestigatorSummary", q => q
      .input("AssignmentId", sql.BigInt, assignmentId)
      .input("SummaryText", sql.NVarChar(sql.MAX), summaryText)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

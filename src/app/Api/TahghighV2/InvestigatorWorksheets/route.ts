import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const assignmentId = requiredInt(req.nextUrl.searchParams.get("assignmentId"),"شناسه انتساب");
    return respond(await execute("TahghighatV2.SP_GetAssignmentWorksheets", q => q
      .input("AssignmentId",sql.BigInt,assignmentId).input("UserId",sql.BigInt,userId)));
  } catch(e) { return fail(e); }
}

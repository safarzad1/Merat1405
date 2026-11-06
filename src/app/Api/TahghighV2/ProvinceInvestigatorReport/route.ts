import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read all applicant fields from one database-side, assignment-scoped source.
// The stored procedure reproduces the old report computations while retaining
// the narrower V2 province permission check. Never accept a case number from
// the client and never expose all columns of Davtalab.Ashkhas.
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const assignmentId = requiredInt(req.nextUrl.searchParams.get("assignmentId"), "شناسه انتساب");
    return respond(await execute("TahghighatV2.SP_GetProvinceInvestigatorReport", q => q
      .input("AssignmentId", sql.BigInt, assignmentId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

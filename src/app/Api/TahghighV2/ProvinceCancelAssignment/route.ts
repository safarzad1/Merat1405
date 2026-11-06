import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    return respond(await executeMutation("TahghighatV2.SP_CancelProvinceAssignment", q => q
      .input("AssignmentId",sql.BigInt,requiredInt(b.assignmentId,"شناسه انتساب"))
      .input("Reason",sql.NVarChar(sql.MAX),requiredText(b.reason,"علت لغو",2000))
      .input("UserId",sql.BigInt,userId)));
  } catch(e) { return fail(e); }
}

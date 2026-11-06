import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    const rows = await executeMutation("TahghighatV2.SP_DeleteUntouchedChildReferral", q => q
      .input("ParentReferralId", sql.BigInt, requiredInt(body.parentReferralId, "شناسه ارجاع اصلی"))
      .input("ChildReferralId", sql.BigInt, requiredInt(body.childReferralId, "شناسه ارجاع زیرمجموعه"))
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch (error) {
    return fail(error);
  }
}

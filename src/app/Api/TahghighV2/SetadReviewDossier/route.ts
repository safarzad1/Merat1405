import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(req.nextUrl.searchParams.get("referralId"), "ارجاع");
    return respond(await execute("TahghighatV2.SP_GetSetadReviewDossier", query => query
      .input("ReferralId", sql.BigInt, referralId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

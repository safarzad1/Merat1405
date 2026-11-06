import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only, province-scoped director review: root summary and all child investigations. */
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(request.nextUrl.searchParams.get("referralId"), "ارجاع استان");
    return respond(await execute("TahghighatV2.SP_GetDirectorReviewDossier", query => query
      .input("ReferralId", sql.BigInt, referralId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

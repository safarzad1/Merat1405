import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const parentReferralId = requiredInt(request.nextUrl.searchParams.get("parentReferralId"), "شناسه ارجاع استان");
    const rows = await execute("TahghighatV2.SP_GetProvinceCountyConsolidation", q => q
      .input("ParentReferralId", sql.BigInt, parentReferralId)
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch (error) { return fail(error); }
}

import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const hozeId = requiredInt(req.nextUrl.searchParams.get("hozeReferralId"), "ارجاع حوزه");
    const countyId = requiredInt(req.nextUrl.searchParams.get("countyReferralId"), "ارجاع شهرستان");
    return respond(await execute("TahghighatV2.SP_GetHozeCountyDossier", q => q
      .input("HozeReferralId", sql.BigInt, hozeId)
      .input("CountyReferralId", sql.BigInt, countyId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

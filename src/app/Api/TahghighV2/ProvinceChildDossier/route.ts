import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const parentId = requiredInt(request.nextUrl.searchParams.get("parentReferralId"), "شناسه ارجاع استان");
    const childId = requiredInt(request.nextUrl.searchParams.get("childReferralId"), "شناسه ارجاع مقصد");
    return respond(await execute("TahghighatV2.SP_GetProvinceChildDossier", q => q
      .input("ParentReferralId", sql.BigInt, parentId)
      .input("ChildReferralId", sql.BigInt, childId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

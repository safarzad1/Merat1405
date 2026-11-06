import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const childId = requiredInt(req.nextUrl.searchParams.get("childReferralId"), "ارجاع مقصد");
    return respond(await execute("TahghighatV2.SP_GetChildReturnNotice", q => q
      .input("ChildReferralId", sql.BigInt, childId)
      .input("UserId", sql.BigInt, userId)));
  } catch (error) { return fail(error); }
}

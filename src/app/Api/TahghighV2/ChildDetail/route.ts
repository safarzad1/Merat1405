import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const child = requiredInt(req.nextUrl.searchParams.get("childReferralId"), "ارجاع فرعی");
    const rows = await execute("TahghighatV2.SP_GetChildDetail", query => query
      .input("ChildReferralId", sql.BigInt, child)
      .input("UserId", sql.BigInt, userId));
    if (rows.length !== 1) throw new ApiError(404, "NOT_FOUND", "ارجاعی در محدوده شما یافت نشد.");
    return respond(rows);
  } catch (error) { return fail(error); }
}

import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, ApiError, respond, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const raw = req.nextUrl.searchParams.get("referralId");
    if (!raw) throw new ApiError(400, "REQUIRED_ID", "شناسه ارجاع الزامی است.");
    const referralId = requiredInt(raw, "ارجاع");
    const rows = await execute("TahghighatV2.SP_GetReferralDetail", q => q
      .input("ReferralId", sql.BigInt, referralId)
      .input("UserId", sql.BigInt, userId));
    if (rows.length !== 1) throw new ApiError(404, "NOT_FOUND", "ارجاع قابل مشاهده یافت نشد.");
    return respond(rows);
  } catch (e) { return fail(e); }
}

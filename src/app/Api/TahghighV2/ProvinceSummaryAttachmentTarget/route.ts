import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns the persisted ProvinceSummary.SummaryId and server-derived write permission. */
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(request.nextUrl.searchParams.get("referralId"), "شناسه ارجاع");
    const rows = await execute("TahghighatV2.SP_GetProvinceSummaryAttachmentTarget", q => q
      .input("ReferralId", sql.BigInt, referralId)
      .input("UserId", sql.BigInt, userId));
    return respond(rows);
  } catch (error) { return fail(error); }
}

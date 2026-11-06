import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
import { withReturnNotices } from "@/app/lib/meratV2/withReturnNotices";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const page = requiredInt(req.nextUrl.searchParams.get("page") ?? "1", "شماره صفحه");
    const size = requiredInt(req.nextUrl.searchParams.get("pageSize") ?? "25", "تعداد در صفحه");
    const rows = await execute("TahghighatV2.SP_GetChildInbox", query => query
      .input("UserId", sql.BigInt, userId)
      .input("Page", sql.Int, page)
      .input("PageSize", sql.Int, size));
    return respond(await withReturnNotices(rows, "ReferralId"));
  } catch (error) { return fail(error); }
}

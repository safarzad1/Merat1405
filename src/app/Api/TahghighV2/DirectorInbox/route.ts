import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, ApiError, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const page = Number(req.nextUrl.searchParams.get("page") || 1);
    const pageSize = Number(req.nextUrl.searchParams.get("pageSize") || 25);
    if (!Number.isSafeInteger(page) || page<1 || !Number.isSafeInteger(pageSize) || pageSize<1 || pageSize>100)
      throw new ApiError(400, "INVALID_PAGING", "شماره صفحه یا اندازه صفحه نامعتبر است.");
    const rows = await execute("TahghighatV2.SP_GetDirectorInbox", q => q
      .input("UserId", sql.BigInt, userId).input("Page", sql.Int, page).input("PageSize", sql.Int, pageSize));
    return respond(rows);
  } catch(e) { return fail(e); }
}

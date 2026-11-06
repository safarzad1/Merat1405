import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, ApiError, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const mode = req.nextUrl.searchParams.get("mode");
    const page = Number(req.nextUrl.searchParams.get("page") || 1);
    const pageSize = Number(req.nextUrl.searchParams.get("pageSize") || 20);
    if (mode !== "WORKING" && mode !== "DECIDED")
      throw new ApiError(400, "INVALID_MODE", "نوع فهرست معتبر نیست.");
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new ApiError(400, "INVALID_PAGING", "شماره یا اندازه صفحه معتبر نیست.");
    return respond(await execute("TahghighatV2.SP_GetSetadOverview", query => query
      .input("UserId", sql.BigInt, userId)
      .input("Mode", sql.VarChar(15), mode)
      .input("Page", sql.Int, page)
      .input("PageSize", sql.Int, pageSize)));
  } catch (error) { return fail(error); }
}

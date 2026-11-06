import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser } from "../_shared";
import { validatePersonSearch } from "@/lib/newsPhase13Validation";

export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try {
    const b = await req.json();
    await assertSessionUser(req, positiveNumber(b.userId, "UserId"));
    const { search, page, sizePage } = validatePersonSearch(b);
    const pool = await getConnection();
    const result = await pool.request()
      .input("ShomareKhabar", sql.BigInt, positiveNumber(b.shomareKhabar, "شماره خبر"))
      .input("UserId", sql.BigInt, positiveNumber(b.userId, "UserId"))
      .input("Search", sql.NVarChar(150), search)
      .input("Page", sql.Int, page)
      .input("SizePage", sql.Int, sizePage)
      .execute("Akhbar.SP_SearchAshkhas");
    return NextResponse.json({ status: 200, data: result.recordset || [] });
  } catch (err) { return errorResponse(err); }
}

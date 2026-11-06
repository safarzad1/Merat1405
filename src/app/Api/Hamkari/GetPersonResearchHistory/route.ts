import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
    const body = await req.json();
    const personId = Number(body?.personId);
    if (!Number.isSafeInteger(personId) || personId <= 0) {
      return NextResponse.json({ status: 400, error: "PersonId is invalid" }, { status: 400 });
    }
    const page = Math.min(1000000, Math.max(1, Math.floor(Number(body?.page) || 1)));
    const pool = await getConnection();
    const result = await pool.request()
      .input("PersonId", sql.BigInt, personId)
      .input("Page", sql.Int, page)
      .input("SizePage", sql.Int, 15)
      .execute("[Hamkari].[SP_GetPersonResearchHistory]");
    return NextResponse.json({ status: 200, data: result.recordset || [] });
  } catch (error) {
    return NextResponse.json({ status: 500, error: error instanceof Error ? error.message : "خطا در دریافت سوابق تحقیق" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";

export const dynamic = "force-dynamic";

// Title comes from the authenticated user's database record, not browser storage.
// FullOnvanPost already contains the job title and the assigned city/province.
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (req.cookies.get("merat-new-session")?.value !== "1") {
    return NextResponse.json({ message: "UNAUTHORIZED" }, { status: 401, headers });
  }
  try {
    const actor = await getAuthActor(req.cookies.get("token")?.value);
    const pool = await getConnection();
    const result = await pool.request()
      .input("UserId", sql.BigInt, actor.userId)
      .query(`SELECT TOP (1) LTRIM(RTRIM(COALESCE(FullOnvanPost, N''))) AS PositionTitle
              FROM dbo.Vbl_Users WHERE UserId = @UserId AND IsActive = 1`);
    const positionTitle = String(result.recordset?.[0]?.PositionTitle ?? "").trim();
    if (!positionTitle) return NextResponse.json({ positionTitle: "" }, { headers });
    return NextResponse.json({ positionTitle }, { headers });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ message: "POSITION_UNAVAILABLE" }, { status, headers });
  }
}

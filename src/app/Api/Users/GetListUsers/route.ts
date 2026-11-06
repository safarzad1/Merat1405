import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { assertMahalInScope } from "@/lib/userScope";

export async function POST(req: NextRequest) {
  try {
    const { mahal, search } = await req.json();
    if (!mahal) return NextResponse.json({ error: "mahal required" }, { status: 400 });
    await assertMahalInScope(req.cookies.get("token")?.value, Number(mahal));

    const pool = await getConnection();
    const rawSearch = String(search ?? "").trim();
    let normalizedSearch = rawSearch;
    if (rawSearch) {
      const normalized = await pool.request().input("SearchText", sql.NVarChar(sql.MAX), rawSearch)
        .query("SELECT [dbo].[NormalizePersianText](@SearchText) AS NormalizedSearch");
      normalizedSearch = String(normalized.recordset?.[0]?.NormalizedSearch ?? rawSearch).trim();
    }
    const result = await pool.request().input("Mahal", sql.Int, mahal).input("Search", sql.NVarChar(200), normalizedSearch)
      .execute("[Users].[SP_GetListUsers]");
    const flags = await pool.request().input("MahalPrefix",sql.NVarChar(30),String(mahal)+"%")
      .query("SELECT UserId, CAST(IsAdmin AS bit) AS IsAdmin FROM dbo.Users WHERE CONVERT(NVARCHAR(30),Mahal) LIKE @MahalPrefix");
    const byId = new Map((flags.recordset || []).map((row: {UserId:number; IsAdmin:boolean|number}) => [String(row.UserId), row.IsAdmin]));
    return NextResponse.json({ status: 200, data: (result.recordset || []).map((row: {UserId:number}) => ({...row, IsAdmin: (byId.get(String(row.UserId)) === true || byId.get(String(row.UserId)) === 1)})) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ status: 403, error: "دسترسی به کاربران این محدوده مجاز نیست." }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

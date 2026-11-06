import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";

export async function POST(req: NextRequest) {
  try {
    const actor = await getAuthActor(req.cookies.get("token")?.value);
    if (actor.mahal !== 1) return NextResponse.json({ status: 403, error: "دسترسی به کاربران ستاد مجاز نیست." }, { status: 403 });
    const body = await req.json();
    const search = String(body.search ?? "").trim().slice(0, 150);
    const pool = await getConnection();
    const result = await pool.request().input("Search", sql.NVarChar(150), search).execute("Users.SP_GetSetadUsers");
    const flags = await pool.request().query("SELECT UserId, CAST(IsAdmin AS bit) AS IsAdmin FROM dbo.Users WHERE Mahal=1");
    const byId = new Map((flags.recordset || []).map((row: {UserId:number; IsAdmin:boolean|number}) => [String(row.UserId), row.IsAdmin]));
    return NextResponse.json({ status: 200, data: (result.recordset || []).map((row: {UserId:number}) => ({ ...row, IsAdmin: (byId.get(String(row.UserId)) === true || byId.get(String(row.UserId)) === 1) })) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    if (message === "UNAUTHORIZED") return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ status: 500, error: message }, { status: 500 });
  }
}

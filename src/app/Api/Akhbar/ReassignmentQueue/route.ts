import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { requireAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { actor, pool } = await requireAdmin(req.cookies.get("token")?.value);
    const search = (req.nextUrl.searchParams.get("search") || "").trim().slice(0, 120);
    const onlyBlocked = req.nextUrl.searchParams.get("onlyBlocked") !== "0";
    const result = await pool.request()
      .input("AdminUserId", sql.BigInt, actor.userId)
      .input("Search", sql.NVarChar(120), search || null)
      .input("OnlyBlocked", sql.Bit, onlyBlocked)
      .input("MaxRows", sql.Int, 100)
      .execute("Akhbar.SP_GetKhabarReassignmentQueue");
    return NextResponse.json({ status: 200, items: result.recordset || [] }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ status, error: status === 403 ? "فقط مدیر سامانه اجازه بازتخصیص دارد." :
      status === 401 ? "نشست معتبر نیست." : "دریافت کارتابل‌های قابل بازتخصیص انجام نشد. SQL فاز ۸ را بررسی کنید." },
      { status, headers: { "Cache-Control": "private, no-store" } });
  }
}

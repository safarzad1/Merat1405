import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { requireAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { actor, pool } = await requireAdmin(req.cookies.get("token")?.value);
    const search = (req.nextUrl.searchParams.get("search") || "").trim().slice(0, 120);
    const threshold = Number(req.nextUrl.searchParams.get("hours") ?? "48");
    const level = Number(req.nextUrl.searchParams.get("level") ?? "0");
    const onlyOverdue = req.nextUrl.searchParams.get("onlyOverdue") === "1";
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 720 ||
        !Number.isInteger(level) || level < 0 || level > 4) {
      return NextResponse.json({ error: "پارامترهای گزارش نامعتبر است." }, { status: 400 });
    }
    const result = await pool.request()
      .input("AdminUserId", sql.BigInt, actor.userId)
      .input("OverdueHours", sql.Int, threshold)
      .input("Level", sql.Int, level)
      .input("Search", sql.NVarChar(120), search || null)
      .input("OnlyOverdue", sql.Bit, onlyOverdue)
      .input("MaxRows", sql.Int, 100)
      .execute("Akhbar.SP_GetNewsAgingDashboard");
    const sets = Object.values(result.recordsets ?? {});
    return NextResponse.json({ status: 200,
      summary: sets[0]?.[0] || null,
      levels: sets[1] || [],
      owners: sets[2] || [],
      news: sets[3] || [] },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ status: code,
      error: code === 401 ? "نشست معتبر نیست." : code === 403
        ? "فقط مدیر سامانه مجاز به مشاهده گزارش پایش اخبار است."
        : "دریافت گزارش ممکن نشد. نصب SQL فاز ۹ و اتصال دیتابیس را بررسی کنید." },
      { status: code, headers: { "Cache-Control": "private, no-store" } });
  }
}

import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { requireAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { actor, pool } = await requireAdmin(req.cookies.get("token")?.value);
    const r = await pool.request()
      .input("AdminUserId", sql.BigInt, actor.userId)
      .input("MaxRows", sql.Int, 100)
      .execute("Akhbar.SP_CheckKhabarWorkflowIntegrity");
    const sets = Object.values(r.recordsets ?? {});
    return NextResponse.json({ status: 200,
      summary: sets[0]?.[0] || null,
      issues: sets[1] || [],
      coverage: sets[2] || [] },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ status,
      error: status === 401 ? "نشست معتبر نیست." : status === 403
        ? "فقط مدیر سامانه مجاز به بررسی گردش اخبار است."
        : "بررسی گردش اخبار انجام نشد. SQL فاز ۶ و اتصال دیتابیس را بررسی کنید." },
      { status, headers: { "Cache-Control": "private, no-store" } });
  }
}

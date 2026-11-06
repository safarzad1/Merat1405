import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { requireAdmin } from "@/lib/adminAccess";

export async function POST(req: NextRequest) {
  try {
    const { actor, pool } = await requireAdmin(req.cookies.get("token")?.value);
    const input = await req.json();
    const fields = [input.newsNo, input.targetUserId, input.expectedOldUserId, input.expectedKartablId].map(Number);
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (fields.some(n => !Number.isSafeInteger(n) || n <= 0) || reason.length < 5 || reason.length > 1000)
      return NextResponse.json({ status: 422, error: "خبر، مسئول جایگزین یا علت بازتخصیص معتبر نیست." }, { status: 422 });
    const result = await pool.request()
      .input("AdminUserId", sql.BigInt, actor.userId)
      .input("ShomareKhabar", sql.BigInt, fields[0])
      .input("TargetUserId", sql.BigInt, fields[1])
      .input("Reason", sql.NVarChar(1000), reason)
      .input("ExpectedOldUserId", sql.BigInt, fields[2])
      .input("ExpectedKartablId", sql.BigInt, fields[3])
      .execute("Akhbar.SP_ReassignKhabar");
    return NextResponse.json({ status: 200, data: result.recordset?.[0] || null },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "UNAUTHORIZED" || message === "FORBIDDEN") {
      const status = message === "UNAUTHORIZED" ? 401 : 403;
      return NextResponse.json({ status, error: "مجوز انجام این اقدام را ندارید." }, { status });
    }
    const err = e as { number?: number; originalError?: { info?: { number?: number; message?: string } }; message?: string };
    const code = Number(err.number ?? err.originalError?.info?.number ?? 0);
    if (code >= 51801 && code <= 51812)
      return NextResponse.json({ status: 409, error: err.originalError?.info?.message || err.message || "امکان بازتخصیص وجود ندارد." }, { status: 409 });
    return NextResponse.json({ status: 500, error: "بازتخصیص انجام نشد؛ تنظیمات دیتابیس و SQL فاز ۸ را بررسی کنید." }, { status: 500 });
  }
}

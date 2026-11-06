import { NextRequest, NextResponse } from "next/server";
import { authenticatedUserId, jsonBody, requireSameOrigin } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

const reply = (status: number, message: string) =>
  NextResponse.json({ ok: status === 200, message }, { status, headers });

/** Self-service only. Current password is checked atomically in the database.
 * Uses the same Persian-digit normalization as the existing login routine. */
export async function POST(req: NextRequest) {
  let userId: number;
  try { userId = await authenticatedUserId(); }
  catch { return reply(401, "برای تغییر کلمه عبور وارد حساب شوید."); }
  try { requireSameOrigin(req); }
  catch { return reply(403, "مبدأ درخواست معتبر نیست."); }

  let body: Record<string, unknown>;
  try { body = await jsonBody(req); }
  catch { return reply(400, "درخواست تغییر کلمه عبور معتبر نیست."); }
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!current || current.length > 250) return reply(400, "کلمه عبور فعلی را وارد کنید.");
  if (next !== next.trim() || next.length < 8 || next.length > 250)
    return reply(400, "کلمه عبور جدید باید ۸ تا ۲۵۰ نویسه و بدون فاصله ابتدا یا انتها باشد.");
  if (!/[^\d\s]/u.test(next) || !/[\d۰-۹٠-٩]/u.test(next))
    return reply(400, "کلمه عبور جدید باید ترکیبی از حرف یا نماد و عدد باشد.");
  if (confirm !== next) return reply(400, "تکرار کلمه عبور جدید یکسان نیست.");
  if (next === current) return reply(400, "کلمه عبور جدید باید متفاوت از کلمه عبور فعلی باشد.");

  try {
    const pool = await getMeratPool();
    const result = await pool.request()
      .input("UserId", sql.BigInt, userId)
      .input("CurrentPassword", sql.NVarChar(250), current)
      .input("NewPassword", sql.NVarChar(250), next)
      .query(`
        SET NOCOUNT ON;
        UPDATE dbo.Users
           SET [Password] = LTRIM(RTRIM(dbo.fn_ChangeNumber(@NewPassword)))
         WHERE UserId = @UserId
           AND IsActive = 1
           AND [Password] = dbo.fn_ChangeNumber(@CurrentPassword);
        SELECT @@ROWCOUNT AS UpdatedCount;
      `);
    if (Number(result.recordset?.[0]?.UpdatedCount) !== 1)
      return reply(400, "کلمه عبور فعلی صحیح نیست یا حساب غیرفعال شده است.");
    return reply(200, "کلمه عبور با موفقیت تغییر یافت.");
  } catch (error) {
    console.error("MyPassword POST", error);
    return reply(500, "تغییر کلمه عبور انجام نشد؛ دوباره تلاش کنید.");
  }
}

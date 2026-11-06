import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { verifyToken } from "@/lib/auth";
import { getConnection } from "@/lib/db";
import { DEFAULT_THEME_SETTINGS, validateThemeSettings } from "@/lib/themeSettings";

export const dynamic = "force-dynamic";

function userIdOf(req: NextRequest): number | null {
  if (req.cookies.get("merat-new-session")?.value !== "1") return null;
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token) as { userId?: number | string };
    const id = Number(payload.userId);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const userId = userIdOf(req);
  if (!userId) return NextResponse.json({ error: "ورود به سامانه لازم است" }, { status: 401 });
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("UserId", sql.BigInt, userId)
      .execute("dbo.SP_MeratTheme_Get");
    const row = result.recordset?.[0];
    const data = row ? validateThemeSettings({
      themeId: row.ThemeId,
      primaryColor: row.PrimaryColor,
      sidebarColor: row.SidebarColor,
      backgroundColor: row.BackgroundColor,
      cardColor: row.CardColor,
      fontScale: row.FontScale,
      cardDensity: row.CardDensity,
    }) : null;
    return NextResponse.json({ data: data || DEFAULT_THEME_SETTINGS }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Theme preferences GET failed", error);
    return NextResponse.json({ error: "خواندن تنظیمات ظاهر ممکن نشد؛ اسکریپت SQL را بررسی کنید" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = userIdOf(req);
  if (!userId) return NextResponse.json({ error: "ورود به سامانه لازم است" }, { status: 401 });
  let payload: unknown;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 400 }); }
  const settings = validateThemeSettings(payload);
  if (!settings) return NextResponse.json({ error: "تنظیمات رنگ یا اندازه معتبر نیست" }, { status: 400 });
  try {
    const pool = await getConnection();
    await pool.request()
      .input("UserId", sql.BigInt, userId)
      .input("ThemeId", sql.NVarChar(50), settings.themeId)
      .input("PrimaryColor", sql.VarChar(7), settings.primaryColor)
      .input("SidebarColor", sql.VarChar(7), settings.sidebarColor)
      .input("BackgroundColor", sql.VarChar(7), settings.backgroundColor)
      .input("CardColor", sql.VarChar(7), settings.cardColor)
      .input("FontScale", sql.SmallInt, settings.fontScale)
      .input("CardDensity", sql.NVarChar(12), settings.cardDensity)
      .execute("dbo.SP_MeratTheme_Save");
    return NextResponse.json({ data: settings, success: true });
  } catch (error) {
    console.error("Theme preferences POST failed", error);
    return NextResponse.json({ error: "ذخیره تنظیمات ظاهر انجام نشد" }, { status: 500 });
  }
}

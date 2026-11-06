import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getAuthActor } from "@/lib/userScope";
import { getConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const denied = (e: unknown) => e instanceof Error && e.message === "UNAUTHORIZED";
export async function GET(req: NextRequest) {
 try {
  const actor = await getAuthActor(req.cookies.get("token")?.value);
  const pool = await getConnection();
  // Lazy, idempotent refresh: no background process or recurring request implied.
  await pool.request().input("UserId", sql.BigInt, actor.userId)
    .execute("Akhbar.SP_RefreshNewsOverdueAlerts");
  const r = await pool.request().input("UserId", sql.BigInt, actor.userId)
    .execute("Akhbar.SP_GetNewsOverdueNotifications");
  const sets = Object.values(r.recordsets ?? {});
  return NextResponse.json({ status: 200, summary: sets[0]?.[0] ||
   { OpenCount: 0, UnreadCount: 0 }, items: sets[1] || [] }, { headers });
 } catch(e) {
  return NextResponse.json({ status: denied(e)?401:500,
   error: denied(e) ? "نشست معتبر نیست." : "بازیابی هشدارهای اخبار ممکن نشد؛ SQL فاز ۱۰ را بررسی کنید." },
   { status: denied(e)?401:500, headers });
 }
}
export async function POST(req: NextRequest) {
 try {
  const actor = await getAuthActor(req.cookies.get("token")?.value);
  const body = await req.json();
  const alertId = Number(body?.alertId);
  const action = body?.action;
  if (!Number.isSafeInteger(alertId) || alertId<1 || !["SEEN","ACK"].includes(action))
   return NextResponse.json({error:"شناسه اعلان یا اقدام نامعتبر است."},{status:400,headers});
  const pool = await getConnection();
  await pool.request().input("UserId",sql.BigInt,actor.userId)
   .input("AlertId",sql.BigInt,alertId).input("Action",sql.NVarChar(12),action)
   .execute("Akhbar.SP_MarkNewsOverdueNotification");
  return NextResponse.json({status:200,success:true},{headers});
 } catch(e) {
  return NextResponse.json({error:denied(e)?"نشست معتبر نیست.":"ثبت اقدام اعلان مجاز نیست یا انجام نشد."},
   {status:denied(e)?401:403,headers});
 }
}

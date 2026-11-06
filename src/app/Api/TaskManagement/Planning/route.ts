import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getAuthActor } from "@/lib/userScope";
import { getConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

async function getActor(req: NextRequest): Promise<number> {
  if (req.cookies.get("merat-new-session")?.value !== "1") throw new Error("UNAUTHORIZED");
  const token = req.cookies.get("token")?.value;
  return (await getAuthActor(token)).userId;
}
function id(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))) : Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("شناسه انتخاب‌شده معتبر نیست.");
  return n;
}
function boolean(v: unknown): boolean {
  if (typeof v !== "boolean") throw new Error("وضعیت انتخاب‌شده معتبر نیست.");
  return v;
}
function year(v: unknown): number {
  const n = Number(typeof v === "string" ? v.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))) : v);
  if (!Number.isInteger(n) || n < 1300 || n > 1600) throw new Error("سال شمسی معتبر نیست.");
  return n;
}
function quarter(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error("فصل انتخاب‌شده معتبر نیست.");
  return n;
}
function target(v: unknown): number {
  const n = Number(typeof v === "string" ? v.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/٫/g,".") : v);
  if (v === "" || v == null || !Number.isFinite(n) || n < 0 || n > 9999999999999999 || Math.abs(Math.round(n * 100) - n * 100) > 1e-7)
    throw new Error("مقدار هدف باید یک عدد نامنفی با حداکثر دو رقم اعشار باشد.");
  return n;
}
function resultError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // Do not disclose server details. Business errors from the new SPs use 573xx.
  const business = /\b573\d{2}\b/.test(message) || /معتبر نیست|مجاز نیست|وظیفه|استان|هدف|شناسه|فصل|سال شمسی|مقدار/.test(message);
  console.error("TaskManagementV2 planning", err);
  return NextResponse.json({ error: business ? message : "عملیات انجام نشد؛ نصب SQL فاز سوم و ارتباط دیتابیس بررسی شود." },
    { status: business ? 400 : 500, headers });
}
export async function GET(req: NextRequest) {
  let userId: number;
  try { userId = await getActor(req); }
  catch { return NextResponse.json({ error: "نشست معتبر نیست." }, { status: 401, headers }); }
  try {
    const pool = await getConnection();
    const province = req.nextUrl.searchParams.get("provinceId");
    if (province) {
      const results = await pool.request().input("UserId", sql.BigInt, userId)
        .input("ProvinceCityId", sql.BigInt, id(province))
        .execute("TaskManagementV2.SP_GetProvinceUsers");
      return NextResponse.json({ users: results.recordset ?? [] }, { headers });
    }
    const taskId = id(req.nextUrl.searchParams.get("taskId"));
    const results = await pool.request().input("UserId", sql.BigInt, userId)
      .input("TaskId", sql.BigInt, taskId).execute("TaskManagementV2.SP_GetTaskPlanning");
    return NextResponse.json({ provinces: results.recordsets?.[0] ?? [], targets: results.recordsets?.[1] ?? [], assignments: results.recordsets?.[2] ?? [] }, { headers });
  } catch (e) { return resultError(e); }
}
export async function POST(req: NextRequest) {
  let userId: number;
  try { userId = await getActor(req); }
  catch { return NextResponse.json({ error: "نشست معتبر نیست." }, { status: 401, headers }); }
  let data: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("payload");
    data = raw as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400, headers }); }
  try {
    const pool = await getConnection();
    const r = pool.request().input("UserId", sql.BigInt, userId);
    let procedure: string;
    switch (data.action) {
      case "saveTarget":
        procedure = "TaskManagementV2.SP_SaveTarget";
        r.input("TaskId", sql.BigInt, id(data.taskId))
          .input("TargetId", sql.BigInt, data.targetId == null ? null : id(data.targetId))
          .input("ProvinceCityId", sql.BigInt, id(data.provinceId))
          .input("PersianYear", sql.SmallInt, year(data.year))
          .input("Quarter", sql.TinyInt, quarter(data.quarter))
          .input("TargetValue", sql.Decimal(18, 2), target(data.value));
        break;
      case "setAssignee":
        procedure = "TaskManagementV2.SP_SetTargetAssignee";
        r.input("TargetId", sql.BigInt, id(data.targetId))
          .input("AssigneeUserId", sql.BigInt, id(data.assigneeUserId))
          .input("IsActive", sql.Bit, boolean(data.active));
        break;
      case "publishTarget":
        procedure = "TaskManagementV2.SP_SetTargetPublication";
        r.input("TargetId", sql.BigInt, id(data.targetId))
          .input("Publish", sql.Bit, boolean(data.publish));
        break;
      case "removeTarget":
        procedure = "TaskManagementV2.SP_RemoveTarget";
        r.input("TargetId", sql.BigInt, id(data.targetId));
        break;
      default:
        return NextResponse.json({ error: "عملیات ناشناخته است." }, { status: 400, headers });
    }
    const result = await r.execute(procedure);
    return NextResponse.json({ success: true, result: result.recordset?.[0] ?? null }, { headers });
  } catch (e) { return resultError(e); }
}

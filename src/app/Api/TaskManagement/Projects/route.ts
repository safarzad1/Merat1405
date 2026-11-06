import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getAuthActor } from "@/lib/userScope";
import { getConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

const jsonHeaders = { "Cache-Control": "no-store" };
const dateRegex = /^1[3-5]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
function numerals(value: string) {
  return value.replace(/[۰-۹]/g, v => String("۰۱۲۳۴۵۶۷۸۹".indexOf(v)))
    .replace(/[٠-٩]/g, v => String("٠١٢٣٤٥٦٧٨٩".indexOf(v)));
}
function safeDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("تاریخ واردشده معتبر نیست.");
  const normalized = numerals(value.trim().replace(/-/g, "/"));
  if (!dateRegex.test(normalized)) throw new Error("تاریخ باید به‌صورت ۱۴۰۵/۰۸/۱۵ وارد شود.");
  const [, month, day] = normalized.split("/").map(Number);
  if ((month > 6 && day > 30) || (month === 12 && day > 30)) throw new Error("روز واردشده برای این ماه معتبر نیست.");
  return normalized;
}
function positiveId(value: unknown, optional = false): number | null {
  if (optional && (value === undefined || value === null || value === "")) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("شناسه نامعتبر است.");
  return n;
}
function requiredTitle(value: unknown): string {
  if (typeof value !== "string") throw new Error("عنوان وارد نشده است.");
  const v = value.trim();
  if (!v || v.length > 200) throw new Error("عنوان باید بین ۱ تا ۲۰۰ نویسه باشد.");
  return v;
}
function optionalDescription(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 4000) throw new Error("توضیحات بیش از حد مجاز است.");
  return value.trim() || null;
}
function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const isBusinessError = /\b57\d{3}\b/.test(message) || /مجاز نیست|معتبر نیست|پیدا نشد|قابل حذف نیست|قابل بستن نیست|محدوده پروژه|عنوان|توضیحات|تاریخ|شناسه|وضعیت|حذف|فعال|بسته/.test(message);
  console.error("TaskManagementV2 project action failed", err);
  return NextResponse.json({ error: isBusinessError ? message.replace(/^.*?(?=مجوز|شناسه|عنوان|تاریخ|پروژه|وظیفه|فقط|دسترسی)/, "") : "عملیات انجام نشد. اتصال دیتابیس و SQL فاز دوم را بررسی کنید." },
    { status: isBusinessError ? 400 : 500, headers: jsonHeaders });
}
async function actor(req: NextRequest) {
  if (req.cookies.get("merat-new-session")?.value !== "1") throw new Error("UNAUTHORIZED");
  return getAuthActor(req.cookies.get("token")?.value);
}
export async function GET(req: NextRequest) {
  let userId: number;
  try { userId = (await actor(req)).userId; }
  catch { return NextResponse.json({ error: "ابتدا وارد سامانه شوید." }, { status: 401, headers: jsonHeaders }); }
  try {
    const projectId = positiveId(req.nextUrl.searchParams.get("projectId"));
    const pool = await getConnection();
    const result = await pool.request()
      .input("UserId", sql.BigInt, userId)
      .input("ProjectId", sql.BigInt, projectId)
      .execute("TaskManagementV2.SP_GetProjectTasks");
    return NextResponse.json({ project: result.recordsets?.[0]?.[0] ?? null, tasks: result.recordsets?.[1] ?? [] }, { headers: jsonHeaders });
  } catch (err) { return errorResponse(err); }
}
export async function POST(req: NextRequest) {
  let userId: number;
  try { userId = (await actor(req)).userId; }
  catch { return NextResponse.json({ error: "ابتدا وارد سامانه شوید." }, { status: 401, headers: jsonHeaders }); }
  let data: Record<string, unknown>;
  try {
    const payload: unknown = await req.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
    data = payload as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400, headers: jsonHeaders }); }
  try {
    const action = String(data.action ?? "");
    const pool = await getConnection();
    const r = pool.request().input("UserId", sql.BigInt, userId);
    let procedure: string;
    switch (action) {
      case "saveProject": {
        const startDate = safeDate(data.startDate);
        const endDate = safeDate(data.endDate);
        if (startDate && endDate && startDate > endDate) throw new Error("تاریخ پایان باید پس از شروع باشد.");
        procedure = "TaskManagementV2.SP_SaveProject";
        r.input("ProjectId", sql.BigInt, positiveId(data.projectId, true))
          .input("Title", sql.NVarChar(200), requiredTitle(data.title))
          .input("Description", sql.NVarChar(sql.MAX), optionalDescription(data.description))
          .input("StartDatePersian", sql.Char(10), startDate)
          .input("EndDatePersian", sql.Char(10), endDate);
        break;
      }
      case "saveTask": {
        const startDate = safeDate(data.startDate);
        const dueDate = safeDate(data.endDate);
        if (startDate && dueDate && startDate > dueDate) throw new Error("تاریخ پایان باید پس از شروع باشد.");
        procedure = "TaskManagementV2.SP_SaveTask";
        r.input("ProjectId", sql.BigInt, positiveId(data.projectId))
          .input("TaskId", sql.BigInt, positiveId(data.taskId, true))
          .input("Title", sql.NVarChar(200), requiredTitle(data.title))
          .input("Description", sql.NVarChar(sql.MAX), optionalDescription(data.description))
          .input("StartDatePersian", sql.Char(10), startDate)
          .input("DueDatePersian", sql.Char(10), dueDate);
        break;
      }
      case "setStatus": {
        procedure = "TaskManagementV2.SP_SetProjectStatus";
        const status = String(data.status ?? "");
        if (status !== "ACTIVE" && status !== "CLOSED") throw new Error("وضعیت واردشده معتبر نیست.");
        r.input("ProjectId", sql.BigInt, positiveId(data.projectId))
          .input("StatusCode", sql.VarChar(15), status);
        break;
      }
      case "removeProject":
        procedure = "TaskManagementV2.SP_DeleteProject";
        r.input("ProjectId", sql.BigInt, positiveId(data.projectId));
        break;
      case "removeTask":
        procedure = "TaskManagementV2.SP_DeleteTask";
        r.input("TaskId", sql.BigInt, positiveId(data.taskId));
        break;
      default: return NextResponse.json({ error: "عملیات شناخته نشد." }, { status: 400, headers: jsonHeaders });
    }
    const result = await r.execute(procedure);
    return NextResponse.json({ success: true, result: result.recordset?.[0] ?? null }, { headers: jsonHeaders });
  } catch (err) { return errorResponse(err); }
}

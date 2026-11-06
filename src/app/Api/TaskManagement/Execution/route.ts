import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";

export const dynamic = "force-dynamic";
const responseHeaders = { "Cache-Control": "private, no-store" };
const normalizeDigits = (s: string) => s.replace(/[۰-۹٠-٩]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c) : "٠١٢٣٤٥٦٧٨٩".indexOf(c)));

function positiveId(v: unknown, optional = false): number | null {
  if (optional && (v == null || v === "")) return null;
  const n = Number(typeof v === "string" ? normalizeDigits(v) : v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("شناسه معتبر نیست.");
  return n;
}
function date(v: unknown): string {
  if (typeof v !== "string") throw new Error("تاریخ فعالیت معتبر نیست.");
  const s = normalizeDigits(v.trim().replace(/-/g,"/"));
  if (!/^1[3-5]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(s)) throw new Error("تاریخ باید به صورت شمسی وارد شود.");
  const [, month, day] = s.split("/").map(Number);
  if ((month >= 7 && day > 30)) throw new Error("روز واردشده معتبر نیست.");
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Tehran"}).formatToParts(new Date());
  const part=(kind:string)=>String(parts.find(x=>x.type===kind)?.value??"").padStart(kind==="year"?4:2,"0");
  if(s > `${part("year")}/${part("month")}/${part("day")}`) throw new Error("تاریخ فعالیت نمی‌تواند در آینده باشد.");
  return s;
}
function value(v: unknown): number {
  const s = typeof v === "string" ? normalizeDigits(v).replace(/٫/g,".") : v;
  const n = Number(s);
  if (v == null || v === "" || !Number.isFinite(n) || n <= 0 || n > 9999999999999999 || Math.abs(Math.round(n*100)-n*100)>1e-7)
    throw new Error("مقدار عملکرد باید بزرگ‌تر از صفر و دارای حداکثر دو رقم اعشار باشد.");
  return n;
}
async function actor(req: NextRequest): Promise<number> {
  if (req.cookies.get("merat-new-session")?.value !== "1") throw new Error("UNAUTHORIZED");
  return (await getAuthActor(req.cookies.get("token")?.value)).userId;
}
function failure(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error("TaskManagementV2 execution", e);
  const denied = /5740[123]|5741[356]|5742[13]|مجاز نیست|مأموریت/.test(message);
  const business = /\b574\d{2}\b|شرح فعالیت|شناسه معتبر|تاریخ|مقدار عملکرد|شناسه/.test(message);
  const userMessage = business || denied ? (message.match(/[^\r\n]*[\u0600-\u06FF][^\r\n]*/)?.[0] ?? "درخواست معتبر نیست.") : "خطا در دریافت یا ثبت گزارش؛ SQL فاز چهارم را بررسی کنید.";
  return NextResponse.json({ error: userMessage }, { status: denied ? 403 : business ? 400 : 500, headers: responseHeaders });
}
export async function GET(req: NextRequest) {
  let userId: number;
  try { userId = await actor(req); }
  catch { return NextResponse.json({ error: "نشست کاربر معتبر نیست." }, { status: 401, headers: responseHeaders }); }
  try {
    const targetId = positiveId(req.nextUrl.searchParams.get("targetId"));
    const pool = await getConnection();
    const r = await pool.request().input("UserId",sql.BigInt,userId).input("TargetId",sql.BigInt,targetId)
      .execute("TaskManagementV2.SP_GetTargetExecution");
    return NextResponse.json({ target:r.recordsets?.[0]?.[0]??null, assignees:r.recordsets?.[1]??[],
      reports:r.recordsets?.[2]??[], files:r.recordsets?.[3]??[], history:r.recordsets?.[4]??[], reviewEvents:r.recordsets?.[5]??[] }, { headers:responseHeaders });
  } catch (e) { return failure(e); }
}
export async function POST(req: NextRequest) {
  let userId: number;
  try { userId = await actor(req); }
  catch { return NextResponse.json({ error: "نشست کاربر معتبر نیست." }, { status: 401, headers: responseHeaders }); }
  let payload: Record<string, unknown>;
  try {
    const data: unknown = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    payload = data as Record<string,unknown>;
  } catch { return NextResponse.json({ error:"درخواست نامعتبر است." }, { status:400, headers:responseHeaders }); }
  try {
    const pool = await getConnection();
    const request = pool.request().input("UserId",sql.BigInt,userId);
    let procedure: string;
    switch (payload.action) {
      case "save": {
        procedure="TaskManagementV2.SP_SaveProgress";
        const description = typeof payload.description === "string" ? payload.description.trim() : "";
        if (!description || description.length > 2000) throw new Error("شرح فعالیت باید بین ۱ تا ۲۰۰۰ نویسه باشد.");
        request.input("AssignmentId",sql.BigInt,positiveId(payload.assignmentId))
          .input("RecordId",sql.BigInt,positiveId(payload.recordId,true))
          .input("ActivityDatePersian",sql.Char(10),date(payload.date))
          .input("Description",sql.NVarChar(2000),description)
          .input("ActualValue",sql.Decimal(18,2),value(payload.value));
        break;
      }
      case "delete":
        procedure="TaskManagementV2.SP_DeleteProgress";
        request.input("RecordId",sql.BigInt,positiveId(payload.recordId));
        break;
      default: return NextResponse.json({ error:"عملیات نامعتبر است." }, { status:400,headers:responseHeaders });
    }
    const result=await request.execute(procedure);
    return NextResponse.json({ success:true, result:result.recordset?.[0]??null }, { headers:responseHeaders });
  } catch(e) { return failure(e); }
}

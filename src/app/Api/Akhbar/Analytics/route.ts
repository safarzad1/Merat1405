import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";
import { buildNewsAnalyticsExcel } from "@/lib/newsExcel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noCache = { "Cache-Control": "private, no-store" };
const validDate = (s: string) => !s || /^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(s);
const levels = ["", "ستاد", "استان", "حوزه", "شهرستان"];
const minutes = (v: unknown) => typeof v === "number" ? Math.round(v * 10) / 600 : "";
const cols = (pairs: Array<[string, string]>) => pairs.map(([key, title]) => ({ key, title }));

// Transitional compatibility: an older installed SP_GetNewsAnalytics may still return
// the saved DFN IDs under the legacy display label «کد علت: ...».
// Resolve these with the same PID=71104 catalog used by news-return validation.
// Never send raw internal reason IDs to the dashboard or the Excel export.
const toLatinDigits = (value: string) => value.replace(/[\u06f0-\u06f9\u0660-\u0669]/g, (char) => {
  const cp = char.charCodeAt(0);
  return String(cp >= 0x06f0 && cp <= 0x06f9 ? cp - 0x06f0 : cp - 0x0660);
});
type AnalyticsReturnReason = { Reason: string; ReturnCount: number };
function applyReturnReasonTitles(
  rows: AnalyticsReturnReason[],
  catalog: ReadonlyMap<string, string>
): AnalyticsReturnReason[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const raw = String(row.Reason ?? "").trim();
    const match = raw.match(/^کد\s*علت\s*[:：]\s*(.+)$/u);
    let title = raw;
    if (match) {
      const ids = Array.from(new Set(toLatinDigits(match[1]).split(/[,،;؛\s]+/u).map(x => x.trim()).filter(Boolean)));
      const labels = Array.from(new Set(ids.map(id => catalog.get(id)).filter((x): x is string => Boolean(x))));
      title = labels.length ? labels.join("، ") : "علت ثبت‌شده (عنوان در فهرست موجود نیست)";
    }
    if (!title) title = "علت ثبت نشده";
    totals.set(title, (totals.get(title) ?? 0) + Number(row.ReturnCount ?? 0));
  }
  return Array.from(totals, ([Reason, ReturnCount]) => ({ Reason, ReturnCount }))
    .sort((a, b) => b.ReturnCount - a.ReturnCount || a.Reason.localeCompare(b.Reason, "fa"));
}


export async function GET(req: NextRequest) {
  try {
    const actor = await getAuthActor(req.cookies.get("token")?.value);
    const qp = req.nextUrl.searchParams;
    const dateFrom = qp.get("from") || "";
    const dateTo = qp.get("to") || "";
    const province = Number(qp.get("province") || "0");
    const level = Number(qp.get("level") || "0");
    const status = qp.get("status") || "ALL";
    const search = (qp.get("search") || "").trim();
    const excel = qp.get("format") === "xlsx";
    if (!validDate(dateFrom) || !validDate(dateTo) || (dateFrom && dateTo && dateFrom > dateTo) ||
      !Number.isSafeInteger(province) || province < 0 || !Number.isInteger(level) || level < 0 || level > 4 ||
      !["ALL", "DRAFT", "OPEN", "RETURNED", "FINAL"].includes(status) || search.length > 120) {
      return NextResponse.json({ error: "مقادیر فیلتر گزارش نامعتبر است." }, { status: 400, headers: noCache });
    }
    const pool = await getConnection();
    const result = await pool.request()
      .input("UserId", sql.BigInt, actor.userId)
      .input("DateFrom", sql.NVarChar(10), dateFrom || null)
      .input("DateTo", sql.NVarChar(10), dateTo || null)
      .input("ProvinceId", sql.BigInt, province || null)
      .input("OrgLevel", sql.TinyInt, level)
      .input("Status", sql.NVarChar(15), status)
      .input("Search", sql.NVarChar(120), search || null)
      .input("MaxDetails", sql.Int, excel ? 2000 : 100)
      .execute("Akhbar.SP_GetNewsAnalytics");
    const rs = Object.values(result.recordsets ?? {});
    const rawReasons = (rs[3] || []) as AnalyticsReturnReason[];
    const needsLegacyReasonTranslation = rawReasons.some(r => /^کد\s*علت\s*[:：]/u.test(String(r.Reason || "").trim()));
    const returnReasonCatalog = new Map<string, string>();
    if (needsLegacyReasonTranslation) {
      const lookup = await pool.request().query("SELECT ID, NameFarsi FROM dbo.DFN WHERE PID=71104");
      for (const item of lookup.recordset || []) {
        const name = String(item.NameFarsi ?? "").trim();
        if (name) returnReasonCatalog.set(String(item.ID), name);
      }
    }
    const reasons = applyReturnReasonTitles(rawReasons, returnReasonCatalog);
    const payload = { summary: rs[0]?.[0] || null, stages: rs[1] || [], provinces: rs[2] || [],
      reasons, owners: rs[4] || [], details: rs[5] || [], provinceOptions: rs[6] || [] };
    if (!excel) return NextResponse.json({ status: 200, ...payload }, { headers: noCache });
    const sheets = [
      { name: "خلاصه", headers: cols([["Metric", "شاخص"], ["Value", "مقدار"]]), rows: [
        ["کل اخبار", payload.summary?.TotalNews], ["پیشخوان شخصی", payload.summary?.MyInboxCount],
        ["ارسال‌شده (دارای سابقه)", payload.summary?.SentCount], ["تأییدشده (دارای سابقه)", payload.summary?.ApprovedCount],
        ["دارای سابقه برگشت", payload.summary?.EverReturnedCount], ["پیش‌نویس", payload.summary?.DraftCount],
        ["در گردش", payload.summary?.OpenCount], ["نهایی", payload.summary?.FinalCount],
        ["برگشتی جاری", payload.summary?.ReturnedCount], ["دیرکرددار", payload.summary?.OverdueCount],
        ["تعداد رخدادهای برگشت", payload.summary?.ReturnActions], ["مراحل تکمیل‌شده قابل محاسبه", payload.summary?.CompletedHops],
        ["زمان نامعتبر", payload.summary?.UnknownAgeCount], ["از تاریخ", dateFrom || "همه"],
        ["تا تاریخ", dateTo || "همه"], ["شناسه استان", province || "همه استان‌های مجاز"],
        ["سطح مسئول جاری", levels[level] || "همه"], ["وضعیت", status], ["جست‌وجو", search || "—"]
      ].map(([Metric, Value]) => ({ Metric, Value })) },
      { name: "مراحل", headers: cols([["Stage", "مرحله"], ["CompletedHops", "مراحل تکمیل‌شده"], ["AvgHours", "میانگین زمان رسیدگی (ساعت)"], ["OpenNews", "اخبار باز"], ["OverdueNews", "دیرکرددار"]]),
        rows: payload.stages.map((r: Record<string, unknown>) => ({ Stage: levels[Number(r.OrgLevel)], CompletedHops: r.CompletedHops, AvgHours: minutes(r.AvgMinutes === null ? undefined : Number(r.AvgMinutes)), OpenNews: r.OpenNews, OverdueNews: r.OverdueNews })) },
      { name: "استان‌ها", headers: cols([["ProvinceName", "استان"], ["TotalNews", "کل اخبار"], ["OpenCount", "در گردش"], ["FinalCount", "نهایی"], ["ReturnedCount", "برگشتی جاری"], ["OverdueCount", "دیرکرددار"], ["AvgMinutes", "میانگین دقیقه رسیدگی"]]), rows: payload.provinces },
      { name: "علت برگشت", headers: cols([["Reason", "علت برگشت"], ["ReturnCount", "تعداد دفعات"]]), rows: payload.reasons },
      { name: "مسئولان", headers: cols([["FullName", "نام مسئول"], ["PostName", "پست"], ["Actions", "تعداد اقدامات"], ["ReturnedActions", "برگشت‌های انجام‌شده"], ["OpenNews", "اخبار باز"], ["OverdueNews", "دیرکرددار"]]), rows: payload.owners },
      { name: "جزئیات اخبار", headers: cols([["ShomareKhabar", "شماره"], ["OnvanKhabar", "عنوان"], ["CreateDateTime", "تاریخ ثبت"], ["ProvinceName", "استان"], ["CurrentStatusCode", "وضعیت"], ["CurrentOwner", "مسئول"], ["InboxDateTime", "ورود کارتابل"], ["AgeMinutes", "مدت توقف (دقیقه)"], ["IsOverdue", "دیرکرد"], ["ActiveCount", "تعداد کارتابل فعال"]]), rows: payload.details },
    ];
    const file = buildNewsAnalyticsExcel(sheets);
    return new NextResponse(new Uint8Array(file), { headers: { ...noCache,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="merat-news-analytics.xlsx"',
      "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    console.error("News analytics failed", error);
    return NextResponse.json({ error: status === 500 ? "دریافت گزارش ممکن نشد؛ نصب SQL فاز ۱۱ را بررسی کنید." : "دسترسی مجاز نیست." }, { status, headers: noCache });
  }
}

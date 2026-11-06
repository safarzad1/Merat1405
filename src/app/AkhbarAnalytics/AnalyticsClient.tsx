"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Download, Filter, RefreshCw, Search, AlertTriangle } from "lucide-react";
import NewsJalaliDatePicker from "@/app/AkhbarManage/NewsJalaliDatePicker";
import styles from "./Analytics.module.css";

type Filters = { from: string; to: string; province: string; level: string; status: string; search: string };
type Summary = { TotalNews: number; MyInboxCount: number; SentCount: number; ApprovedCount: number; EverReturnedCount: number; DraftCount: number; OpenCount: number; FinalCount: number; ReturnedCount: number; OverdueCount: number; UnknownAgeCount: number; ReturnActions: number; CompletedHops: number };
type Stage = { OrgLevel: number; CompletedHops: number; AvgMinutes: number | null; OpenNews: number; OverdueNews: number; LongestOpenMinutes: number | null };
type Province = { ProvinceId: number; ProvinceName: string; TotalNews: number; OpenCount: number; FinalCount: number; ReturnedCount: number; OverdueCount: number; AvgMinutes: number | null };
type Reason = { Reason: string; ReturnCount: number };
type Owner = { UserId: number; FullName: string; PostName: string; Actions: number; ReturnedActions: number; OpenNews: number; OverdueNews: number };
type Detail = { ShomareKhabar: number; OnvanKhabar: string; CreateDateTime: string; ProvinceName: string; CurrentStatusCode: string; CurrentOwner: string; InboxDateTime: string | null; AgeMinutes: number | null; IsOverdue: boolean; ActiveCount: number | null };
type Report = { summary: Summary; stages: Stage[]; provinces: Province[]; reasons: Reason[]; owners: Owner[]; details: Detail[]; provinceOptions: Array<{ ProvinceId: number; ProvinceName: string }> };

const empty: Filters = { from: "", to: "", province: "", level: "0", status: "ALL", search: "" };
const levelNames = ["نامشخص", "ستاد", "استان", "حوزه", "شهرستان"];
const statusNames: Record<string, string> = { ALL: "همه وضعیت‌ها", DRAFT: "پیش‌نویس", OPEN: "در گردش", RETURNED: "برگشت‌شده", FINAL: "نهایی‌شده" };
const fa = (n: unknown) => Number(n ?? 0).toLocaleString("fa-IR", { maximumFractionDigits: 1 });
const hours = (n: number | null | undefined) => n == null ? "—" : `${fa(n / 60)} ساعت`;
function params(f: Filters) { const p = new URLSearchParams(); Object.entries(f).forEach(([key, v]) => { if (v && !(key === "level" && v === "0") && !(key === "status" && v === "ALL")) p.set(key, v); }); return p; }
function statusLabel(code: string) { return code === "PISHNEVIS" ? "پیش‌نویس" : (code === "TAEED_NAHAEI_SETAD" || code === "TAEED_NAHAEI_HOZE") ? "نهایی" : code?.startsWith("BARGASHT_") ? "برگشتی" : "در گردش"; }

export default function AnalyticsClient() {
 const [filters, setFilters] = useState<Filters>(empty);
 const [applied, setApplied] = useState<Filters>(empty);
 const [report, setReport] = useState<Report | null>(null);
 const [busy, setBusy] = useState(false);
 const [downloading, setDownloading] = useState(false);
 const [error, setError] = useState("");
 const [openFilters, setOpenFilters] = useState(false);
 const [focus, setFocus] = useState<"stage" | "province">("stage");
 const requestSequence = useRef(0);
 const fetchReport = useCallback(async (f: Filters, signal?: AbortSignal) => {
   const response = await fetch(`/Api/Akhbar/Analytics?${params(f).toString()}`, { credentials: "same-origin", cache: "no-store", signal });
   const payload = await response.json();
   if (!response.ok) throw new Error(payload.error || "دریافت گزارش ناموفق بود.");
   return payload as Report;
 }, []);
 useEffect(() => {
   const controller = new AbortController();
   const requestId=++requestSequence.current;
   setBusy(true);
   fetchReport(empty, controller.signal).then(data => { if (requestId === requestSequence.current) setReport(data); })
     .catch(e => { if (requestId === requestSequence.current && e.name !== "AbortError") setError(e.message); })
     .finally(() => { if (requestId === requestSequence.current && !controller.signal.aborted) setBusy(false); });
   return () => controller.abort();
 }, [fetchReport]);
 async function apply(f: Filters) {
   const requestId=++requestSequence.current;
   if (f.from && f.to && f.from > f.to) { setError("تاریخ شروع نباید بعد از پایان باشد."); return; }
   setBusy(true); setError("");
   try { const next = await fetchReport(f);
     if (requestId === requestSequence.current) { setReport(next); setApplied({ ...f }); setFilters({ ...f }); }
   } catch (e) { if (requestId === requestSequence.current) setError(e instanceof Error ? e.message : "خطای دریافت گزارش"); }
   finally { if (requestId === requestSequence.current) setBusy(false); }
 }
 async function excel() {
   setDownloading(true); setError("");
   try {
     const p = params(applied); p.set("format", "xlsx");
     const res = await fetch(`/Api/Akhbar/Analytics?${p.toString()}`, { credentials: "same-origin", cache: "no-store" });
     if (!res.ok) { const data = await res.json().catch(() => null); throw new Error(data?.error || "ساخت فایل Excel ناموفق بود."); }
     const blob = await res.blob(), url = URL.createObjectURL(blob);
     const a = document.createElement("a"); a.href = url; a.download = "merat-news-analytics.xlsx"; document.body.appendChild(a); a.click(); a.remove();
     window.setTimeout(() => URL.revokeObjectURL(url), 1000);
   } catch (e) { setError(e instanceof Error ? e.message : "دریافت Excel ممکن نشد."); }
   finally { setDownloading(false); }
 }
 const maxStage = useMemo(() => Math.max(1, ...((report?.stages || []).map(x => x.AvgMinutes || 0))), [report]);
 const maxProvince = useMemo(() => Math.max(1, ...((report?.provinces || []).map(x => Number(x.TotalNews)))), [report]);
 const summary = report?.summary;
 const metrics = summary ? [
   ["کل اخبار", summary.TotalNews], ["در گردش", summary.OpenCount], ["نهایی", summary.FinalCount],
   ["برگشتی جاری", summary.ReturnedCount], ["دیرکرددار", summary.OverdueCount], ["پیش‌نویس", summary.DraftCount],
 ] : [];
 return <div className={styles.layout} dir="rtl">
   <header className={styles.head}>
     <div className={styles.heading}><BarChart3 size={22}/><div><h1>اخبار زیرمجموعه</h1><p>آمار بر اساس حوزه سازمانی کاربر، همراه با گردش، برگشت و وضعیت رسیدگی</p></div></div>
     <div className={styles.actions}>
       <button type="button" className={styles.subtle} onClick={() => setOpenFilters(v => !v)} aria-expanded={openFilters}><Filter size={15}/> فیلترها</button>
       <button type="button" className={styles.subtle} onClick={() => apply(applied)} disabled={busy}><RefreshCw size={15}/> به‌روزرسانی</button>
       <button type="button" className={styles.primary} onClick={excel} disabled={!report || downloading || busy}><Download size={15}/>{downloading ? "در حال تهیه..." : "خروجی Excel"}</button>
     </div>
   </header>
   {openFilters && <form className={styles.filters} onSubmit={(e: FormEvent) => { e.preventDefault(); apply(filters); }}>
     <label>از تاریخ ثبت (شمسی)<NewsJalaliDatePicker value={filters.from} onChange={from => setFilters(p => ({ ...p, from }))} label="تاریخ شروع گزارش"/></label>
     <label>تا تاریخ ثبت (شمسی)<NewsJalaliDatePicker value={filters.to} onChange={to => setFilters(p => ({ ...p, to }))} label="تاریخ پایان گزارش"/></label>
     <label>استان<select value={filters.province} onChange={e => setFilters(p => ({ ...p, province: e.target.value }))}>
       <option value="">همه استان‌های مجاز</option>{(report?.provinceOptions || []).map(p => <option key={p.ProvinceId} value={p.ProvinceId}>{p.ProvinceName}</option>)}
     </select></label>
     <label>سطح مسئول جاری<select value={filters.level} onChange={e => setFilters(p => ({ ...p, level: e.target.value }))}>
       <option value="0">همه سطوح</option>{levelNames.slice(1).map((name, i) => <option key={i} value={i+1}>{name}</option>)}
     </select></label>
     <label>وضعیت خبر<select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>{Object.entries(statusNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
     <label className={styles.search}>عنوان یا شماره خبر<input value={filters.search} maxLength={120} placeholder="جست‌وجو..." onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}/></label>
     <button type="submit" className={styles.primary} disabled={busy}><Search size={15}/> نمایش</button>
     <button type="button" className={styles.subtle} disabled={busy} onClick={() => apply(empty)}>پاک‌کردن</button>
   </form>}
   {error && <div role="alert" className={styles.error}>{error}</div>}
   {busy && <p className={styles.info} role="status">در حال محاسبه گزارش...</p>}
   {summary && <>
     <div className={styles.metrics}>{metrics.map(([name, value]) => <div key={name}><span>{name}</span><strong>{fa(value)}</strong></div>)}</div>
     <div className={styles.twoColumns}>
       <section className={styles.card}>
         <div className={styles.sectionHead}><h2>تحلیل مراحل گردش</h2><span>میانگین زمان رسیدگی تکمیل‌شده</span></div>
         <div className={styles.chart}>
           {(report?.stages || []).map(s => <button type="button" key={s.OrgLevel} className={styles.barRow}
              title={`فیلتر سطح ${levelNames[s.OrgLevel]}`} onClick={() => apply({ ...applied, level: String(s.OrgLevel) })}>
             <span className={styles.barLabel}>{levelNames[s.OrgLevel]}</span><span className={styles.track}><span className={styles.bar} style={{ width: `${Math.max(0, 100 * (s.AvgMinutes || 0) / maxStage)}%` }}/></span>
             <span className={styles.barValue}>{hours(s.AvgMinutes)}</span></button>)}
         </div>
         <div className={styles.tableScroll}><table><thead><tr><th>مرحله</th><th>مراحل تکمیل‌شده</th><th>باز</th><th>دیرکرد</th></tr></thead><tbody>
           {(report?.stages || []).map(s => <tr key={s.OrgLevel}><td>{levelNames[s.OrgLevel]}</td><td>{fa(s.CompletedHops)}</td><td>{fa(s.OpenNews)}</td><td>{fa(s.OverdueNews)}</td></tr>)}</tbody></table></div>
       </section>
       <section className={styles.card}>
         <div className={styles.sectionHead}><h2>مقایسه استان‌ها</h2><span>تعداد خبر یکتا در محدوده مجاز</span></div>
         <div className={styles.chart}>
           {(report?.provinces || []).slice(0, 9).map(p => <button type="button" key={p.ProvinceId}
             className={styles.barRow} title={`مشاهده اخبار ${p.ProvinceName}`} onClick={() => apply({ ...applied, province: String(p.ProvinceId) })}>
             <span className={styles.barLabel}>{p.ProvinceName}</span><span className={styles.track}><span className={styles.barSecondary} style={{ width: `${100 * Number(p.TotalNews) / maxProvince}%` }}/></span>
             <span className={styles.barValue}>{fa(p.TotalNews)}</span></button>)}
           {!report?.provinces.length && <p className={styles.info}>اطلاعاتی برای نمایش وجود ندارد.</p>}
         </div>
         <div className={styles.tableScroll}><table><thead><tr><th>استان</th><th>کل</th><th>نهایی</th><th>دیرکرد</th><th>میانگین رسیدگی</th></tr></thead><tbody>
           {(report?.provinces || []).map(p => <tr key={p.ProvinceId}><td>{p.ProvinceName}</td><td>{fa(p.TotalNews)}</td><td>{fa(p.FinalCount)}</td><td>{fa(p.OverdueCount)}</td><td>{hours(p.AvgMinutes)}</td></tr>)}</tbody></table></div>
       </section>
     </div>
     <div className={styles.twoColumns}>
       <section className={styles.card}>
         <div className={styles.sectionHead}><h2>علت برگشت</h2><span>{fa(summary.ReturnActions)} رخداد برگشت</span></div>
         <div className={styles.tableScroll}><table><thead><tr><th>علت برگشت</th><th>تعداد دفعات</th></tr></thead><tbody>
           {(report?.reasons || []).map((r,i) => <tr key={`${r.Reason}-${i}`}><td>{r.Reason}</td><td>{fa(r.ReturnCount)}</td></tr>)}
           {!report?.reasons.length && <tr><td colSpan={2}>برگشتی ثبت نشده است.</td></tr>}</tbody></table></div>
         <p className={styles.note}>برگشت‌های یک خبر به‌عنوان رخداد مستقل شمارش می‌شوند؛ تعداد خبر یکتا در کارت‌های بالا جداگانه محاسبه شده است.</p>
       </section>
       <section className={styles.card}>
         <div className={styles.sectionHead}><h2>حجم رسیدگی مسئولان</h2><span>تعداد اقدامات واقعی و کارتابل باز</span></div>
         <div className={styles.tableScroll}><table><thead><tr><th>مسئول</th><th>باز</th><th>اقدامات</th><th>برگشت</th></tr></thead><tbody>
           {(report?.owners || []).map(o => <tr key={o.UserId}><td>{o.FullName}<small>{o.PostName}</small></td><td>{fa(o.OpenNews)}</td><td>{fa(o.Actions)}</td><td>{fa(o.ReturnedActions)}</td></tr>)}
           {!report?.owners.length && <tr><td colSpan={4}>موردی یافت نشد.</td></tr>}</tbody></table></div>
       </section>
     </div>
     <section className={styles.card}>
       <div className={styles.sectionHead}><h2>جزئیات اخبار</h2><span>نمایش حداکثر ۱۰۰ خبر با فیلترهای فعلی</span></div>
       <div className={styles.tableScroll}><table><thead><tr><th>شماره</th><th>عنوان خبر</th><th>استان</th><th>تاریخ ثبت</th><th>وضعیت</th><th>مسئول جاری</th><th>توقف فعلی</th></tr></thead><tbody>
         {(report?.details || []).map(d => <tr key={d.ShomareKhabar}><td>{fa(d.ShomareKhabar)}</td><td>{d.OnvanKhabar}</td><td>{d.ProvinceName}</td><td dir="ltr">{d.CreateDateTime}</td><td>{statusLabel(d.CurrentStatusCode)} {d.IsOverdue && <span className={styles.overdue}>دیرکرد</span>}</td><td>{d.CurrentOwner || "—"}</td><td>{hours(d.AgeMinutes)}</td></tr>)}
         {!report?.details.length && <tr><td colSpan={7}>خبری مطابق فیلترها پیدا نشد.</td></tr>}</tbody></table></div>
       {Number(summary.TotalNews) > 2000 && <p className={styles.warn}><AlertTriangle size={14}/> خروجی Excel حداکثر ۲۰۰۰ ردیف جزئیات دارد؛ آمار تجمیعی همه اخبار مجاز را پوشش می‌دهد. برای جزئیات بیشتر بازه تاریخ را محدود کنید.</p>}
     </section>
     <p className={styles.note}>«ارسال‌شده»، «تأییدشده» و «دارای سابقه برگشت» تعداد خبرهای یکتا با حداقل یک رخداد مربوط در تاریخچه هستند؛ این شاخص‌ها با وضعیت جاری هم‌پوشانی دارند. «پیشخوان من» صرفاً اخبار منتظر اقدام خود کاربر است؛ پیش‌نویس‌های ارسال‌نشده فقط برای ایجادکننده در آمار قابل مشاهده‌اند.</p>
     <p className={styles.footnote}>تمام نتایج بر اساس تاریخ <strong>ثبت خبر</strong> و محدوده مجاز کاربر است. میانگین زمان رسیدگی (برحسب ساعت) صرفاً برای مراحل تکمیل‌شده و دارای دو اقدام معتبر در تاریخچه محاسبه می‌شود. زمان توقف فعلی مستقل گزارش می‌شود. بازتخصیص خبر به‌عنوان ثبت خبر جدید شمرده نمی‌شود. این آمار به‌تنهایی معیار کیفیت عملکرد کارکنان نیست.</p>
   </>}
 </div>;
}

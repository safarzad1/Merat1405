"use client";

import { useEffect, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import s from "../hoze/HozeCase.module.css";

const human = (n: number) => n.toLocaleString("fa-IR");
const clean = (value: unknown) => String(value ?? "").trim();
function draftReport(people: V2Row[], counties: V2Row[], hozeName: string) {
  const chunks: string[] = [];
  people.filter(p => String(p.StatusCode) !== "CANCELLED").forEach(p => {
    chunks.push(`${human(chunks.length + 1)}. ${clean(p.FullName) || "محقق ثبت‌شده"} — محقق حوزه انتخابیه ${hozeName}\n${clean(p.Summary) || "جمع‌بندی محقق ثبت نشده است."}`);
  });
  counties.filter(c => c.CountyReferralId != null).forEach(c => {
    const reply = clean(c.CountySummaryText);
    chunks.push(`${human(chunks.length + 1)}. نتیجه شهرستان فرعی ${clean(c.CountyName) || clean(c.CountyCityId)}\n${reply || "پاسخی ثبت نشده است."}`);
  });
  return chunks.join("\n\n");
}

export default function HozeProvinceSendModal({ hozeReferralId, onClose, onSent, readOnly = false }: {
  hozeReferralId: number; onClose: () => void; onSent: () => void; readOnly?: boolean;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ investigators: 0, counties: 0 });
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [consolidations, assignments, details, counties] = await Promise.all([
          meratV2Request(`/Api/TahghighV2/HozeConsolidation?hozeReferralId=${hozeReferralId}`),
          meratV2Request(`/Api/TahghighV2/HozeAssignments?hozeReferralId=${hozeReferralId}`),
          meratV2Request(`/Api/TahghighV2/HozeCaseDetail?hozeReferralId=${hozeReferralId}`),
          meratV2Request(`/Api/TahghighV2/HozeCountyReferrals?hozeReferralId=${hozeReferralId}`),
        ]);
        if (!live) return;
        const existing = clean(consolidations[0]?.HozeSummaryText);
        const countyRows = consolidations.filter(c => c.CountyReferralId != null);
        const openCounty = counties.some(c => ![true,1,"1"].includes(c.IsClosed as string | number | boolean));
        const openInvestigator = assignments.some(a => ["PENDING", "IN_PROGRESS"].includes(String(a.StatusCode)));
        const canSend = [true,1,"1"].includes(details[0]?.CanSendProvince as string | number | boolean);
        setComplete(canSend && !openCounty && !openInvestigator && !Number(details[0]?.OpenCounties) && !Number(details[0]?.OpenInvestigators));
        setCounts({investigators: assignments.filter(a => String(a.StatusCode) !== "CANCELLED").length, counties: countyRows.length});
        const generated = draftReport(assignments, countyRows, clean(details[0]?.HozeName));
        const report = readOnly ? existing : (existing && /[۰-۹0-9]+\. .*محقق حوزه انتخابیه/.test(existing)
          ? existing : generated);
        setSaved(existing); setText(report);
      } catch (e) { if(live) setError(e instanceof Error ? e.message : "دریافت نتیجه‌ها انجام نشد."); }
      finally { if(live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [hozeReferralId, readOnly]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  async function save() {
    if (readOnly || !complete || text.trim().length < 20 || text.trim().length > 10000 || busy) return false;
    setBusy(true); setError("");
    try {
      await meratV2Request("/Api/TahghighV2/SaveHozeSummary", {hozeReferralId, summaryText: text.trim()});
      setText(text.trim()); setSaved(text.trim());
      return true;
    } catch(e) {setError(e instanceof Error ? e.message : "ذخیره جمع‌بندی انجام نشد."); return false;}
    finally {setBusy(false);}
  }
  async function send() {
    if (readOnly || !complete || text.trim().length < 20 || text.trim().length > 10000 || busy) return;
    setBusy(true);setError("");
    try {
      // Never transmit an unsaved or stale draft as a final response.
      if (text.trim() !== saved.trim()) {
        await meratV2Request("/Api/TahghighV2/SaveHozeSummary", {hozeReferralId, summaryText:text.trim()});
        setSaved(text.trim());
      }
      await meratV2Request("/Api/TahghighV2/ChildAction", {
        childReferralId: hozeReferralId, actionCode:"CHILD_REPLY", description:text.trim()
      });
      onSent();
    } catch(e) {setError(e instanceof Error ? e.message : "ارسال پرونده به استان انجام نشد.");}
    finally {setBusy(false);}
  }
  return <div className={s.modalOverlay} role="presentation">
    <section className={`${s.modal} ${s.hozeProvinceSendModal}`} role="dialog" aria-modal="true" aria-labelledby="hoze-province-send-title" dir="rtl">
      <header className={s.modalHeader}>
        <div><strong id="hoze-province-send-title">{readOnly ? "متن نهایی ارسال‌شده به استان" : "جمع‌بندی تحقیقات و ارسال پرونده به استان"}</strong>
          <p className={s.replyHeaderHint}>{readOnly ? "نسخه ثبت‌شده در زمان ارسال پرونده؛ فقط‌خواندنی" : "ابتدا جمع‌بندی محققان حوزه، سپس پاسخ شهرستان‌های فرعی در یک متن یکپارچه ثبت می‌شود."}</p></div>
        <button type="button" className={s.modalClose} disabled={busy} onClick={onClose} aria-label="بستن">×</button>
      </header>
      <div className={s.modalBody}>
        {loading ? <p className={s.hint}>در حال دریافت جمع‌بندی‌های پرونده…</p> : <>
          <div className={s.countyReadonlyStats}>
            <span>محققان حوزه: <b>{human(counts.investigators)}</b></span>
            <span>شهرستان‌های فرعی: <b>{human(counts.counties)}</b></span>
            <span>{readOnly ? "پرونده به استان ارسال شده است" : complete ? "تمام ارجاعات تعیین‌تکلیف شده‌اند" : "ارجاع ناتمام یا مجوز ارسال وجود ندارد"}</span>
          </div>
          <label className={s.label} htmlFor="hoze-final-consolidated-report">{readOnly ? "متن خروجی ثبت‌شده" : "متن خروجی یکپارچه پرونده برای استان"}</label>
          <textarea id="hoze-final-consolidated-report" className={`${s.field} ${s.replyReportTextarea}`}
            value={text} onChange={e => setText(e.target.value)} maxLength={10000} readOnly={readOnly || !complete || busy}
            aria-label="جمع‌بندی نهایی حوزه برای استان" aria-readonly={readOnly} />
          <div className={s.replyMeta}><span>{readOnly ? "نسخه نهایی · فقط‌خواندنی" : text.trim() === saved.trim() && saved ? "نسخه ذخیره‌شده" : "تغییرات ذخیره‌نشده"}</span><span>{human(text.length)} / ۱۰٬۰۰۰ نویسه</span></div>
          {!readOnly && !complete && <p className={s.warning}>امکان ارسال فقط پس از تکمیل تمام مأموریت‌ها و دریافت تمام پاسخ‌های شهرستان فعال است.</p>}
        </>}
        {error && <p className={s.error} role="alert">{error}</p>}
      </div>
      <footer className={s.modalActions}>
        <button type="button" className={s.outlineButton} disabled={busy} onClick={onClose}>{readOnly ? "بستن" : "انصراف"}</button>
        {!readOnly && <button type="button" className={s.greenButton} disabled={loading || !complete || busy || text.trim().length < 20 || text.trim()===saved.trim()} onClick={() => void save()}>ذخیره متن خروجی</button>}
        {!readOnly && <button type="button" className={s.primary} disabled={loading || !complete || busy || text.trim().length < 20} onClick={() => void send()}>{busy ? "در حال ثبت…" : "ثبت متن خروجی و ارسال به استان"}</button>}
      </footer>
    </section>
  </div>;
}

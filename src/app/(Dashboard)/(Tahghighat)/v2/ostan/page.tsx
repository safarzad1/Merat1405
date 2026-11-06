"use client";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { WorkflowHero, StateChip, EmptyMessage, AppNotice, SectionTitle, workflowStyles as u } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import ProvinceHozeResults from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceHozeResults";
import ProvinceCountyResults from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceCountyResults";
import ProvinceInvestigatorPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceInvestigatorPanel";
import SummaryAttachmentsPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/SummaryAttachmentsPanel";
import SearchableDropdown from "@/component/Dropdown/SearchableDropdown";

const PAGE_SIZE = 20;
const labelStyle: CSSProperties = { display: "block", marginTop: 16, fontWeight: 600 };
const fieldStyle: CSSProperties = { display: "block", width: "100%", padding: 10, marginTop: 6 };
const buttonStyle: CSSProperties = { padding: "10px 14px", margin: "4px", cursor: "pointer" };
const textOf = (v: unknown) => v == null ? "—" : String(v);
const numOf = (v: unknown) => Number(v || 0);
const actions = ["PROVINCE_INBOX", "PROVINCE_WORKING", "PROVINCE_RETURNED"];

export default function ProvinceV2Inbox() {
  const [rows, setRows] = useState<V2Row[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<V2Row | null>(null);
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState("");
  const [provinceSummaryId, setProvinceSummaryId] = useState<number | null>(null);
  const [provinceSummaryReadOnly, setProvinceSummaryReadOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");

  // Deep-link from the unchanged legacy workbench's case preview.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("referralId");
    const referralId = Number(value);
    if (value && Number.isSafeInteger(referralId) && referralId > 0) {
      setSelected(referralId);
    }
  }, []);

  const load = useCallback(async () => {
    const result = await meratV2Request(`/Api/TahghighV2/ProvinceInbox?page=${page}&pageSize=${PAGE_SIZE}`);
    setRows(result);
    return result;
  }, [page]);

  useEffect(() => {
    let active = true;
    void load().then(() => { if (active) setError(""); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "خطای دریافت کارتابل استان"); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setDetail(null); setSummary(""); setProvinceSummaryId(null); setProvinceSummaryReadOnly(true);
      return;
    }
    let active = true;
    setDetail(null); setDetailLoading(true); setProvinceSummaryId(null); setProvinceSummaryReadOnly(true);
    void meratV2Request(`/Api/TahghighV2/ReferralDetail?referralId=${selected}`)
      .then(details => {
        if (!active) return;
        const item = details[0] || null;
        setDetail(item);
        setSummary(item && typeof item.SummaryText === "string" ? item.SummaryText : "");
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "دریافت جزئیات پرونده ناموفق بود."); })
      .finally(() => { if (active) setDetailLoading(false); });
    void meratV2Request(`/Api/TahghighV2/ProvinceSummaryAttachmentTarget?referralId=${selected}`)
      .then(targets => {
        if (!active) return;
        const targetId = Number(targets[0]?.SummaryId ?? 0);
        setProvinceSummaryId(Number.isSafeInteger(targetId) && targetId > 0 ? targetId : null);
        setProvinceSummaryReadOnly(!Boolean(targets[0]?.CanWrite));
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "دریافت مجوز پیوست جمع‌بندی استان ناموفق بود."); });
    return () => { active = false; };
  }, [selected]);

  const state = textOf(detail?.StateCode);
  const hasPending = numOf(detail?.PendingChildReferrals) > 0 || numOf(detail?.PendingAssignments) > 0;
  const isAvailable = detail != null && !busy && !detailLoading && actions.includes(state);
  const canStart = isAvailable && state === "PROVINCE_INBOX";
  const canNoResearch = isAvailable && !hasPending && reason.trim().length > 0;
  const canSaveSummary = isAvailable && ["PROVINCE_WORKING", "PROVINCE_RETURNED"].includes(state) && summary.trim().length > 0;
  const canSubmit = isAvailable && !hasPending && ["PROVINCE_WORKING", "PROVINCE_RETURNED"].includes(state)
    && typeof detail?.SummaryText === "string" && detail.SummaryText.trim().length > 0 && reason.trim().length > 0;

  async function perform(actionCode: "START_PROVINCE" | "NO_RESEARCH" | "SUBMIT_DIRECTOR" | "SAVE_PROVINCE_SUMMARY") {
    if (selected == null || busy || detail == null) return;
    if (actionCode === "NO_RESEARCH" && !canNoResearch) return;
    if (actionCode === "SUBMIT_DIRECTOR" && !canSubmit) return;
    if (actionCode === "START_PROVINCE" && !canStart) return;
    if (actionCode === "SAVE_PROVINCE_SUMMARY" && !canSaveSummary) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (actionCode === "SAVE_PROVINCE_SUMMARY") {
        await meratV2Request("/Api/TahghighV2/ProvinceSummary", { referralId: selected, summaryText: summary });
        setDetail(current => current ? { ...current, SummaryText: summary } : current);
        setSummary(summary);
        try {
          const targets = await meratV2Request(`/Api/TahghighV2/ProvinceSummaryAttachmentTarget?referralId=${selected}`);
          const targetId = Number(targets[0]?.SummaryId ?? 0);
          setProvinceSummaryId(Number.isSafeInteger(targetId) && targetId > 0 ? targetId : null);
          setProvinceSummaryReadOnly(!Boolean(targets[0]?.CanWrite));
        } catch (targetError) {
          setProvinceSummaryId(null);
          setError(targetError instanceof Error ? `جمع‌بندی ذخیره شد؛ دریافت شناسه پیوست ناموفق بود: ${targetError.message}` : "جمع‌بندی ذخیره شد؛ شناسه پیوست دریافت نشد.");
        }
        setNotice("جمع‌بندی استان ذخیره شد.");
      } else {
        await meratV2Request("/Api/TahghighV2/ProvinceAction", { referralId: selected, actionCode, description: reason });
        setNotice("عملیات در سرور تأیید شد.");
        setSelected(null); setDetail(null); setReason(""); setSummary(""); setProvinceSummaryId(null);
      }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "عملیات ثبت نشد."); }
    finally { setBusy(false); }
  }

  const filtered = rows.filter(row => filter === "ALL" || actions.includes(textOf(row.StateCode)));
  const more = rows.length === PAGE_SIZE;
  return <main dir="rtl" className={u.workspace}>
    <WorkflowHero eyebrow="تحقیقات مرآت · فاز اول" title="کارتابل کارشناسی استان"
      description="بررسی ارجاعات ستاد، ثبت جمع‌بندی استان و ارسال تصمیم به رئیس دفتر. دسترسی‌ها در SQL کنترل می‌شوند."
      stats={[{label:"پرونده‌های این صفحه",value:rows.length},{label:"نیازمند اقدام",value:rows.filter(r=>actions.includes(textOf(r.StateCode))).length},{label:"پرونده انتخابی",value:selected??"—"}]}/>
    <SectionTitle kicker="صندوق استان" title="ارجاعات دریافتی" description="فیلتر وضعیت و سپس پرونده موردنظر را انتخاب کنید."/>
    <div className={u.toolbar}>
      <button type="button" style={buttonStyle} onClick={() => void load().catch(e => setError(String(e)))}>بازخوانی</button>
      <div style={{minWidth: 250, maxWidth: 360}}><label>نمایش</label><SearchableDropdown<string>
        value={filter} onChange={setFilter}
        options={[{value:"ACTIVE",label:"نیازمند اقدام استان در همین صفحه"},{value:"ALL",label:"تمام وضعیت‌ها در صفحه فعلی"}]}
        placeholder="انتخاب وضعیت" ariaLabel="فیلتر وضعیت پرونده‌های استان"
        compact menuMaxHeight={150}/></div>
      <span className={u.paginationText}>صفحه {page}</span>
      <button type="button" disabled={page === 1} onClick={() => { setPage(p => p - 1); setSelected(null); }}>قبلی</button>
      <button type="button" disabled={!more} onClick={() => { setPage(p => p + 1); setSelected(null); }}>بعدی</button>
    </div>
    {error && <AppNotice kind="error">{error}</AppNotice>}
    {notice && <AppNotice kind="success">{notice}</AppNotice>}
    <div className={u.tableScroll}>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, textAlign: "right" }}>
        <thead><tr><th>انتخاب</th><th>شناسه ارجاع</th><th>شماره پرونده</th><th>حوزه</th><th>وضعیت</th></tr></thead>
        <tbody>{filtered.map(r => <tr key={textOf(r.ReferralId)}>
          <td><input type="radio" name="selectedReferral" aria-label={`ارجاع ${textOf(r.ReferralId)}`}
            checked={selected === numOf(r.ReferralId)} onChange={() => { setSelected(numOf(r.ReferralId)); setReason(""); setError(""); setNotice(""); }} /></td>
          <td>{textOf(r.ReferralId)}</td><td>{textOf(r.ShomarehParvandeh)}</td>
          <td>{textOf(r.CodeHozeh)}</td><td><StateChip value={r.StateCode}/></td>
        </tr>)}</tbody>
      </table>
    </div>
    {filtered.length === 0 && <EmptyMessage title="پرونده‌ای با فیلتر انتخابی پیدا نشد"/>}
    {selected != null && <section className={u.selectionPanel}>
      <h2>جزئیات ارجاع {selected}</h2>
      {detailLoading ? <p>در حال دریافت جزئیات...</p> : detail ? <>
        <p>وضعیت: <strong>{textOf(detail.StateTitle)}</strong> — پرونده: {textOf(detail.ShomarehParvandeh)}</p>
        <p>فرزندان باز: <strong>{textOf(detail.PendingChildReferrals)}</strong> | محققان ناتمام: <strong>{textOf(detail.PendingAssignments)}</strong></p>
        {hasPending && <p role="alert" style={{ color: "darkred" }}>پیش از ثبت عدم نیاز یا ارسال به رئیس دفتر، ارجاعات و تحقیقات ناتمام باید تعیین تکلیف شوند.</p>}
        <p>آخرین اقدام: {textOf(detail.LastActionCode)} — {textOf(detail.LastActionAtUtc)}</p>
        {detail.NoResearchReason != null && <p>علت عدم نیاز قبلی: {textOf(detail.NoResearchReason)}</p>}
        <label style={labelStyle}>شرح تصمیم یا اقدام (اجباری برای عدم نیاز و ارسال)
          <textarea style={fieldStyle} rows={4} value={reason} maxLength={6000} onChange={e => setReason(e.target.value)} />
        </label>
        <div className={u.formActions}>
          <button type="button" style={buttonStyle} disabled={!canStart} onClick={() => void perform("START_PROVINCE")}>شروع بررسی استان</button>
          <button type="button" style={buttonStyle} disabled={!canNoResearch} onClick={() => void perform("NO_RESEARCH")}>عدم نیاز به تحقیق و ارسال به رئیس دفتر</button>
          <button type="button" style={buttonStyle} disabled={!canSubmit} onClick={() => void perform("SUBMIT_DIRECTOR")}>ارسال جمع‌بندی به رئیس دفتر</button>
        </div>
        <label style={labelStyle}>متن جمع‌بندی استان
          <textarea style={fieldStyle} rows={6} value={summary} maxLength={6000} onChange={e => setSummary(e.target.value)} />
        </label>
        <button type="button" style={buttonStyle} disabled={!canSaveSummary} onClick={() => void perform("SAVE_PROVINCE_SUMMARY")}>ذخیره جمع‌بندی</button>
        {provinceSummaryId !== null && <SummaryAttachmentsPanel level="PROVINCE" summaryRecordId={provinceSummaryId} readOnly={provinceSummaryReadOnly || busy}/>}
        <small style={{ display: "block", marginTop: 6 }}>پیوست‌ها به رکورد مستقل جمع‌بندی استان متصل می‌شوند.</small>
        <ProvinceHozeResults key={`hoze-${selected}`} parentReferralId={selected} />
        <ProvinceCountyResults key={`county-${selected}`} parentReferralId={selected} />
        <ProvinceInvestigatorPanel key={selected} referralId={selected} referralState={state} />
      </> : <p>جزئیات قابل مشاهده نیست.</p>}
    </section>}
  </main>;
}

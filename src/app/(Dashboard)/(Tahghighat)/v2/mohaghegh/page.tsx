"use client";
import { useCallback, useEffect, useState } from "react";
import { WorkflowHero, StateChip, EmptyMessage, AppNotice, SectionTitle, workflowStyles as u } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";

import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import DocumentAttachmentsPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/DocumentAttachmentsPanel";
import WorksheetAttachmentsPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/WorksheetAttachmentsPanel";

const PAGE_SIZE = 20;
function asText(v: unknown): string { return v == null ? "—" : String(v); }
function asNumber(v: unknown): number { return Number(v || 0); }
function statusFa(v: unknown): string {
  switch (v) { case "PENDING": return "در انتظار شروع"; case "IN_PROGRESS": return "در حال تحقیق";
    case "DONE": return "تکمیل‌شده"; case "CANCELLED": return "لغوشده"; default: return asText(v); }
}
const boxStyle = { border: "1px solid #cbd5e1", borderRadius: 10, padding: 16, marginTop: 18 };
const fieldStyle = { width: "100%", padding: 9, marginTop: 7, boxSizing: "border-box" as const };

export default function InvestigatorV2Page() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<V2Row[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [worksheets, setWorksheets] = useState<V2Row[]>([]);
  const [report, setReport] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshInbox = useCallback(async () => {
    const data = await meratV2Request(`/Api/TahghighV2/InvestigatorInbox?page=${page}&pageSize=${PAGE_SIZE}`);
    setRows(data);
    return data;
  }, [page]);
  const refreshWorksheets = useCallback(async (id: number) => {
    const result = await meratV2Request(`/Api/TahghighV2/InvestigatorWorksheets?assignmentId=${id}`);
    setWorksheets(result);
    return result;
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void refreshInbox().then(() => { if (active) setError(""); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "خطای کارتابل"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshInbox]);
  useEffect(() => {
    let active = true;
    setWorksheets([]);
    setReport("");
    setSummary("");
    if (selectedId == null) return;
    void meratV2Request(`/Api/TahghighV2/InvestigatorWorksheets?assignmentId=${selectedId}`)
      .then(data => { if (active) setWorksheets(data); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "خواندن کاربرگ‌ها ناموفق بود"); });
    return () => { active = false; };
  }, [selectedId]);

  const selected = rows.find(x => asNumber(x.AssignmentId) === selectedId);
  const status = selected?.StatusCode;
  const total = asNumber(rows[0]?.TotalCount);
  const canAdvance = status === "IN_PROGRESS" && !busy;

  async function operate(kind: "start" | "save" | "close") {
    if (selectedId == null || busy) return;
    if (kind === "start" && status !== "PENDING") return;
    if (kind === "save" && (!canAdvance || !report.trim())) return;
    if (kind === "close" && (!canAdvance || worksheets.length === 0 || !summary.trim())) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (kind === "start") {
        await meratV2Request("/Api/TahghighV2/InvestigatorAction",
          { assignmentId: selectedId, actionCode: "INVESTIGATOR_START" });
        setMessage("تحقیق شروع شد.");
      } else if (kind === "save") {
        await meratV2Request("/Api/TahghighV2/InvestigatorSaveWorksheet",
          { assignmentId: selectedId, reportText: report.trim() });
        setReport("");
        setMessage("کاربرگ جدید ثبت شد. اکنون می‌توان اسناد آن را پیوست کرد.");
        await refreshWorksheets(selectedId);
      } else {
        await meratV2Request("/Api/TahghighV2/InvestigatorAction",
          { assignmentId: selectedId, actionCode: "CLOSE_ASSIGNMENT", summary: summary.trim() });
        setMessage("تحقیق تکمیل شد و نتیجه برای استان قابل مشاهده است.");
        setSelectedId(null); setWorksheets([]);
      }
      await refreshInbox();
    } catch (e) { setError(e instanceof Error ? e.message : "عملیات انجام نشد"); }
    finally { setBusy(false); }
  }

  return <main dir="rtl" className={u.workspace}>
    <WorkflowHero eyebrow="تحقیقات مرآت · فاز ۲B" title="کارتابل محقق ویژه استان"
      description="مدیریت مأموریت‌های تحقیق، ثبت کاربرگ و ضمیمه‌کردن اسناد. داده‌های فایل در MeratFilesDB نگهداری می‌شوند."
      stats={[{label:"انتساب‌های این صفحه",value:rows.length},{label:"در حال تحقیق",value:rows.filter(x=>x.StatusCode==="IN_PROGRESS").length},{label:"کاربرگ‌های پرونده انتخابی",value:worksheets.length}]}/>
    <SectionTitle kicker="صندوق مأموریت‌ها" title="فهرست تحقیقات" description="برای شروع یا ادامه، یک انتساب از جدول زیر انتخاب کنید." />
    <div className={u.toolbar}>
      <button type="button" disabled={busy || loading} onClick={() => void refreshInbox().catch(e => setError(String(e)))}>بازخوانی کارتابل</button>
      <button type="button" disabled={page === 1 || busy} onClick={() => { setPage(x => x - 1); setSelectedId(null); }}>صفحه قبل</button>
      <span>صفحه {page} {total ? `از ${Math.ceil(total / PAGE_SIZE)}` : ""}</span>
      <button type="button" disabled={busy || (total ? page * PAGE_SIZE >= total : rows.length < PAGE_SIZE)}
        onClick={() => { setPage(x => x + 1); setSelectedId(null); }}>صفحه بعد</button>
    </div>
    {loading && <AppNotice kind="info">در حال دریافت اطلاعات…</AppNotice>}
    {error && <AppNotice kind="error">{error}</AppNotice>}
    {message && <AppNotice kind="success">{message}</AppNotice>}
    <div className={u.tableScroll}>
      <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse", marginTop: 16 }}>
        <thead><tr><th>انتخاب</th><th>انتساب</th><th>پرونده</th><th>ارجاع</th><th>حوزه</th><th>وضعیت</th><th>مهلت شمسی</th></tr></thead>
        <tbody>{rows.map(r => <tr key={asText(r.AssignmentId)}>
          <td><input type="radio" name="selectedAssignment" aria-label={`انتساب ${asText(r.AssignmentId)}`}
            checked={selectedId === asNumber(r.AssignmentId)} onChange={() => {
              setSelectedId(asNumber(r.AssignmentId)); setError(""); setMessage("");
            }}/></td>
          <td>{asText(r.AssignmentId)}</td><td>{asText(r.ShomarehParvandeh)}</td>
          <td>{asText(r.ReferralId)}</td><td>{asText(r.CodeHozeh)}</td>
          <td><StateChip value={r.StatusCode}/></td><td>{asText(r.DueDatePersian)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!loading && rows.length === 0 && <EmptyMessage title="مأموریت بازی یافت نشد" description="انتساب جدید پس از ارجاع کارشناس استان در اینجا نمایش داده می‌شود."/>}
    {selected && selectedId != null && <section style={boxStyle}>
      <SectionTitle kicker="جزئیات مأموریت" title={`تحقیق شماره ${selectedId}`} />
      <p><strong>شرح مأموریت:</strong> {asText(selected.Instruction)}</p>
      <p>وضعیت فعلی: <StateChip value={status}/></p>
      {status === "PENDING" && <button type="button" disabled={busy} onClick={() => void operate("start")}>شروع تحقیق</button>}
      {status === "IN_PROGRESS" && <>
        <label style={{ display: "block", marginTop: 14 }}>متن کاربرگ جدید
          <textarea rows={6} maxLength={12000} value={report} onChange={e => setReport(e.target.value)} style={fieldStyle}/>
        </label>
        <button className={u.primary} type="button" disabled={busy || !report.trim()} onClick={() => void operate("save")}>ثبت کاربرگ جدید</button>
      </>}
      <SectionTitle kicker="مستندات" title="کاربرگ‌های ثبت‌شده" description="کاربرگ‌ها پس از ثبت قابل مشاهده هستند و پیوست هر کاربرگ جداگانه مدیریت می‌شود."/>
      {worksheets.length === 0 && <EmptyMessage title="هنوز کاربرگی ثبت نشده" description="پس از شروع تحقیق، گزارش کاربرگ جدید را ذخیره کنید."/>}
      {worksheets.map(w => <article key={asText(w.WorksheetId)} style={boxStyle}>
        <h4>کاربرگ {asText(w.WorksheetId)}</h4>
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{asText(w.ReportText)}</p>
        <small>زمان ثبت: {asText(w.CreatedAtUtc)}</small>
        <WorksheetAttachmentsPanel worksheetId={asNumber(w.WorksheetId)} readOnly={!canAdvance}/>
      </article>)}
      {status === "IN_PROGRESS" && <>
        <DocumentAttachmentsPanel targetEntity="RESEARCH_ASSIGNMENT" targetRecordId={selectedId} readOnly={!canAdvance}/>
        <label style={{ display: "block", marginTop: 20 }}>جمع‌بندی نهایی محقق
          <textarea rows={4} maxLength={6000} value={summary} onChange={e => setSummary(e.target.value)} style={fieldStyle}/>
        </label>
        <button className={u.primary} type="button" disabled={busy || worksheets.length === 0 || !summary.trim()}
          onClick={() => void operate("close")}>تکمیل تحقیق و ارسال نتیجه</button>
      </>}
    </section>}
  </main>;
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import WorksheetAttachmentsPanel from "@/app/(Dashboard)/(Tahghighat)/v2/components/WorksheetAttachmentsPanel";
import SearchableDropdown from "@/component/Dropdown/SearchableDropdown";
import InputPersianDate from "@/component/Objects/InputPersianDatePicker";

function txt(value: unknown) { return value == null ? "—" : String(value); }
function num(value: unknown) { return Number(value || 0); }
function isAssignable(value: unknown) { return value === true || value === 1 || value === "1"; }
const manageable = ["PROVINCE_WORKING", "PENDING_CHILD_RESULTS", "PROVINCE_RETURNED", "CHILD_WORKING"];

export default function ProvinceInvestigatorPanel({ referralId, referralState }:
  { referralId: number; referralState: string }) {
  const [candidates, setCandidates] = useState<V2Row[]>([]);
  const [assignments, setAssignments] = useState<V2Row[]>([]);
  const [investigatorKey, setInvestigatorKey] = useState("");
  const [instruction, setInstruction] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [worksheets, setWorksheets] = useState<V2Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const canAssign = manageable.includes(referralState) && !busy;

  const loadCandidates = useCallback(async () => {
    setCandidateLoading(true);
    try {
      const possible = await meratV2Request(
        `/Api/TahghighV2/InvestigatorCandidates?referralId=${encodeURIComponent(referralId)}`
      );
      setCandidates(possible);
      return possible;
    } finally {
      setCandidateLoading(false);
    }
  }, [referralId]);

  const refresh = useCallback(async () => {
    const [possible, current] = await Promise.all([
      loadCandidates(),
      meratV2Request(`/Api/TahghighV2/ProvinceAssignments?referralId=${referralId}`),
    ]);
    setCandidates(possible);
    setAssignments(current);
  }, [loadCandidates, referralId]);
  useEffect(() => {
    let alive = true;
    setSelectedAssignment(null); setWorksheets([]);setAssignments([]);
    void Promise.all([
      loadCandidates(),
      meratV2Request(`/Api/TahghighV2/ProvinceAssignments?referralId=${referralId}`),
    ]).then(([possible, current]) => { if (alive) { setCandidates(possible);setAssignments(current);setError(""); } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "خطای دریافت فهرست محققان و انتساب‌ها"); });
    return () => { alive = false; };
  }, [loadCandidates, referralId]);
  useEffect(() => {
    let alive = true;
    setWorksheets([]);
    if (selectedAssignment == null) return;
    void meratV2Request(`/Api/TahghighV2/InvestigatorWorksheets?assignmentId=${selectedAssignment}`)
      .then(data => { if (alive) setWorksheets(data); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "کاربرگ قابل مشاهده نیست"); });
    return () => { alive = false; };
  }, [selectedAssignment]);

  async function assign() {
    if (!canAssign || !investigatorKey || !instruction.trim()) return;
    setBusy(true);setError("");setNotice("");
    try {
      await meratV2Request("/Api/TahghighV2/ProvinceAssignInvestigator",{
        referralId, investigatorKey: Number(investigatorKey), instruction: instruction.trim(),
        dueDatePersian: dueDate || null,
      });
      setNotice("ارجاع به محقق ثبت شد.");setInstruction("");setDueDate("");setInvestigatorKey("");
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "انتساب ناموفق بود"); }
    finally { setBusy(false); }
  }
  async function cancel(assignmentId: number) {
    if (!canAssign || cancelId !== assignmentId || !cancelReason.trim()) return;
    const reason = cancelReason.trim();
    setBusy(true);setError("");setNotice("");
    try {
      await meratV2Request("/Api/TahghighV2/ProvinceCancelAssignment",{assignmentId,reason:reason.trim()});
      setNotice("محقق با ثبت دلیل بازپس‌گیری شد.");setSelectedAssignment(null);setCancelId(null);setCancelReason("");await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "بازپس‌گیری محقق ناموفق بود"); }
    finally { setBusy(false); }
  }
  return <section dir="rtl" style={{ border: "1px solid #aaa", borderRadius: 10, padding: 16, marginTop: 24 }}>
    <h3>محقق ویژه استان — ارجاع‌ها و نتایج</h3>
    <p>فهرست از همکاران فعالِ محقق ویژه در همین استان دریافت می‌شود؛ حساب کاربری مرآت برای محقق لازم نیست.</p>
    {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <label>محقق ویژه استان:
        <div style={{minWidth: 240, marginTop: 6}}>
          <SearchableDropdown<string>
            value={investigatorKey || null}
            onChange={setInvestigatorKey}
            options={candidates.map(i => ({
              value: String(i.InvestigatorKey),
              label: txt(i.FullName),
              description: !isAssignable(i.IsAssignable) ? "غیرفعال" : undefined,
              disabled: !isAssignable(i.IsAssignable),
            }))}
            placeholder="انتخاب محقق"
            searchPlaceholder="جست‌وجوی نام محقق..."
            loading={candidateLoading}
            disabled={!canAssign}
            ariaLabel="انتخاب محقق ویژه استان"
            compact menuMaxHeight={240}
          />
        </div>
        <small>اسامی از فهرست همکاران فعال استان دریافت می‌شوند؛ داشتن حساب کاربری مرآت برای محقق لازم نیست.</small>
      </label>
      <label>مهلت شمسی (اختیاری):
        <div style={{minWidth: 190, marginTop: 6}}>
          <InputPersianDate value={dueDate || null} onChange={value => setDueDate(value || "")} allowPastDates={false}/>
        </div>
      </label>
    </div>
    <label style={{ display: "block", marginTop: 12 }}>شرح مأموریت محقق:
      <textarea style={{ display: "block", width: "100%", padding: 8, boxSizing: "border-box" }}
        rows={3} maxLength={6000} value={instruction} disabled={!canAssign}
        onChange={e => setInstruction(e.target.value)} />
    </label>
    <button type="button" disabled={!canAssign || !investigatorKey || !instruction.trim()}
      onClick={() => void assign()}>ارجاع به محقق</button>
    {!manageable.includes(referralState) && <p>ثبت ارجاع جدید در این وضعیت پرونده مجاز نیست.</p>}
    {!candidateLoading && !candidates.length && <p>برای این استان محقق ویژه واجد شرایطی در فهرست همکاری‌های فعال پیدا نشد.</p>}
    <h4>انتساب‌های ثبت‌شده</h4>
    <button type="button" disabled={busy} onClick={() => void refresh().catch(e => setError(String(e)))}>بازخوانی انتساب‌ها</button>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", textAlign: "right" }}>
        <thead><tr><th>انتساب</th><th>محقق</th><th>وضعیت</th><th>کاربرگ‌ها</th><th>جمع‌بندی</th><th>عملیات</th></tr></thead>
        <tbody>{assignments.map(a => <tr key={txt(a.AssignmentId)}>
          <td>{txt(a.AssignmentId)}</td><td>{txt(a.FullName ?? candidates.find(i => num(i.InvestigatorKey) === num(a.InvestigatorKey))?.FullName ?? a.InvestigatorKey)}</td><td>{txt(a.StatusCode)}</td>
          <td>{txt(a.WorksheetCount)}</td><td>{txt(a.Summary)}</td>
          <td>
            <button type="button" disabled={busy} onClick={() => setSelectedAssignment(num(a.AssignmentId))}>نمایش کاربرگ‌ها</button>
            {(["PENDING", "IN_PROGRESS"].includes(txt(a.StatusCode)) && canAssign) &&
              <button type="button" disabled={busy} onClick={() => {setCancelId(num(a.AssignmentId));setCancelReason("");}}>بازپس‌گیری محقق</button>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    {cancelId != null && <section role="group" aria-label="بازپس‌گیری محقق" style={{border:"1px solid #e5b7b7",padding:16,borderRadius:12,marginTop:14}}>
      <strong>بازپس‌گیری محقق - انتساب شماره {cancelId}</strong>
      <label style={{display:"block",marginTop:10}}>دلیل بازپس‌گیری (اجباری)
        <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} maxLength={6000} rows={3}
          disabled={busy} style={{display:"block",width:"100%",padding:8,boxSizing:"border-box"}} />
      </label>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button type="button" disabled={busy || !cancelReason.trim()} onClick={()=>void cancel(cancelId)}>تأیید بازپس‌گیری</button>
        <button type="button" disabled={busy} onClick={()=>{setCancelId(null);setCancelReason("");}}>انصراف</button>
      </div>
    </section>}
    {!assignments.length && <p>هیچ انتسابی برای این ارجاع ثبت نشده است.</p>}
    {selectedAssignment != null && <section style={{ marginTop: 16 }}>
      <h4>کاربرگ‌های انتساب {selectedAssignment}</h4>
      {worksheets.length === 0 && <p>کاربرگ موجود نیست.</p>}
      {worksheets.map(w => <article key={txt(w.WorksheetId)} style={{ borderTop: "1px solid #ddd", marginTop: 12 }}>
        <p><strong>کاربرگ {txt(w.WorksheetId)}:</strong></p>
        <p style={{ whiteSpace: "pre-wrap" }}>{txt(w.ReportText)}</p>
        <WorksheetAttachmentsPanel worksheetId={num(w.WorksheetId)} readOnly />
      </article>)}
    </section>}
  </section>;
}

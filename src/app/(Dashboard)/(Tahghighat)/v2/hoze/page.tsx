"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { meratConfirm } from "@/component/MeratFeedback/feedback";
import { showToast } from "@/component/CustomToast";
import InputPersianDate, { getTodayJalali } from "@/component/Objects/InputPersianDatePicker";
import SearchableDropdown from "@/component/Dropdown/SearchableDropdown";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import { StateChip } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";
import HozeProvinceSendModal from "@/app/(Dashboard)/(Tahghighat)/v2/components/HozeProvinceSendModal";
import HozeCountyDossierReadonly from "@/app/(Dashboard)/(Tahghighat)/v2/components/HozeCountyDossierReadonly";
import ReturnReferralModal from "@/app/(Dashboard)/(Tahghighat)/v2/components/ReturnReferralModal";
import ChildReturnNotice from "@/app/(Dashboard)/(Tahghighat)/v2/components/ChildReturnNotice";
import ProvinceInvestigatorWorksheetEditor from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceInvestigatorWorksheetEditor";
import s from "./HozeCase.module.css";

type Dialog = "COUNTY" | "INVESTIGATOR" | null;
type Panel = "county" | "investigator" | "tracking" | "final";
const asNum = (v: unknown) => Number(v ?? 0);
const value = (v: unknown) => v == null || v === "" ? "—" : String(v);
const yes = (v: unknown) => v === true || v === 1 || v === "1";
const pending = (r: V2Row) => ["PENDING", "IN_PROGRESS"].includes(String(r.StatusCode));
const humanDate = (date: unknown) => {
  if (!date) return "—";
  const d = new Date(String(date));
  return Number.isNaN(d.getTime()) ? String(date).slice(0, 10) : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

export default function HozeCasePage() {
  const router = useRouter();
  const [referralId, setReferralId] = useState<number | null>(null);
  const [detail, setDetail] = useState<V2Row | null>(null);
  const [counties, setCounties] = useState<V2Row[]>([]);
  const [children, setChildren] = useState<V2Row[]>([]);
  const [candidates, setCandidates] = useState<V2Row[]>([]);
  const [assignments, setAssignments] = useState<V2Row[]>([]);
  const [worksheetId, setWorksheetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countyError, setCountyError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [pickerError, setPickerError] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [childrenReady, setChildrenReady] = useState(false);
  const [assignmentsReady, setAssignmentsReady] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [countyId, setCountyId] = useState("");
  const [countyNote, setCountyNote] = useState("");
  const [investigatorId, setInvestigatorId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [dueDate, setDueDate] = useState(() => getTodayJalali());
  const [provinceSendOpen, setProvinceSendOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [deletingCountyId, setDeletingCountyId] = useState<number | null>(null);
  const [countyDossierId, setCountyDossierId] = useState<number | null>(null);
  const [returnTarget, setReturnTarget] = useState<{id:number;name:string}|null>(null);
  const pickerVersion = useRef(0);
  const [open, setOpen] = useState<Record<Panel, boolean>>({ county: false, investigator: true, tracking: false, final: false });

  const toggle = (panel: Panel) => setOpen(p => ({ ...p, [panel]: !p[panel] }));
  const expand = (panel: Panel) => setOpen(p => ({ ...p, [panel]: true }));
  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        pickerVersion.current++;
        setDialog(null); setPickerError("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, busy]);
  const refreshCase = useCallback(async (id: number) => {
    const [row] = await meratV2Request(`/Api/TahghighV2/HozeCaseDetail?hozeReferralId=${id}`);
    if (!row) throw new Error("پرونده در محدوده دسترسی این حوزه یافت نشد.");
    setDetail(row);
  }, []);
  const refreshChildren = useCallback(async (id: number) => {
    try {
      const data = await meratV2Request(`/Api/TahghighV2/HozeCountyReferrals?hozeReferralId=${id}`);
      setChildren(data); setChildrenReady(true); setCountyError("");
    } catch (e) {
      setChildrenReady(false);
      setCountyError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  const refreshAssignments = useCallback(async (id: number) => {
    try {
      const data = await meratV2Request(`/Api/TahghighV2/HozeAssignments?hozeReferralId=${id}`);
      setAssignments(data); setAssignmentsReady(true); setAssignmentError("");
      // As in the province screen, show the full worksheet + summary panel
      // directly when this file has only one investigator.
      if (data.length === 1) setWorksheetId(current => current ?? asNum(data[0].AssignmentId));
    } catch (e) {
      setAssignmentsReady(false);
      setAssignmentError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("referralId");
    if (param && /^\d+$/.test(param) && Number.isSafeInteger(Number(param)) && Number(param) > 0) {
      setReferralId(Number(param));
    }
  }, []);
  useEffect(() => {
    let active = true;
    pickerVersion.current++;
    setDialog(null);
    setDetail(null); setChildren([]); setAssignments([]); setCounties([]); setCandidates([]);
    setChildrenReady(false); setAssignmentsReady(false); setCountyError(""); setAssignmentError("");
    setCountyDossierId(null);
    setProvinceSendOpen(false); setError(""); setWorksheetId(null);
    if (referralId !== null) {
      setLoading(true);
      void refreshCase(referralId).catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); })
        .finally(() => { if (active) setLoading(false); });
      // Each secondary endpoint fails only in its own section, like Province V2.
      void refreshChildren(referralId);
      void refreshAssignments(referralId);
    }
    return () => { active = false; };
  }, [referralId, refreshCase, refreshChildren, refreshAssignments]);



  const sameCase = detail !== null && referralId !== null && asNum(detail.ReferralId) === referralId;
  const working = sameCase && yes(detail?.CanWork) && !busy;
  const canStart = sameCase && yes(detail?.CanStart) && !busy;
  // Both chair (60) and officer (61) have the same HOZE V2 actions and view;
  // every mutation still checks its action permission and service city in SQL.
  const canRefer = sameCase && yes(detail?.CanReferCounty) && !busy;
  const canAssign = sameCase && yes(detail?.CanAssignInvestigator) && !busy;
  const canSaveWorksheet = sameCase && yes(detail?.CanSaveWorksheet) && !busy;
  const activeChildCount = children.filter(r => !yes(r.IsClosed)).length;
  const activeInvestigatorCount = assignments.filter(pending).length;
  // Sending is independent of the worksheet/summary editing permission.
  // The DB also checks the post, service city and actual status under a lock.
  const canSendProvince = sameCase && yes(detail?.CanSendProvince) && !busy;
  const validCompletion = canSendProvince && childrenReady && assignmentsReady &&
    activeChildCount === 0 && activeInvestigatorCount === 0 &&
    asNum(detail?.OpenCounties) === 0 && asNum(detail?.OpenInvestigators) === 0;
  const caseTitle = [detail?.FirstName, detail?.LastName].filter(Boolean).join(" ") || `شماره پرونده ${value(detail?.ShomarehParvandeh)}`;
  // A person may have several active cooperation records in different counties.
  // The picker and the assignment action are person-based, so show each PersonId once.
  // Keep this guard for deployments whose SQL procedure has not yet been updated.
  const uniquePeople = useMemo(() => {
    const seen = new Set<number>();
    return candidates.filter(row => {
      const personId = asNum(row.PersonId);
      if (!Number.isSafeInteger(personId) || personId <= 0 || seen.has(personId)) return false;
      seen.add(personId);
      return true;
    });
  }, [candidates]);
  // A completed referral is still a referral for this case; only a deleted county
  // referral / recalled investigator assignment can become eligible again.
  const availableCounties = useMemo(() => counties.filter(row =>
    !children.some(child => asNum(child.CountyCityId) === asNum(row.CountyCityId))
  ), [counties, children]);
  const availablePeople = useMemo(() => uniquePeople.filter(row =>
    !assignments.some(a => String(a.StatusCode) !== "CANCELLED" &&
      (asNum(a.PersonId) > 0
        ? asNum(a.PersonId) === asNum(row.PersonId)
        : asNum(a.InvestigatorKey) > 0 && asNum(a.InvestigatorKey) === asNum(row.InvestigatorKey)))
  ), [uniquePeople, assignments]);
  const setSelectedReferral = (id: number | null) => {
    if (id === null) {
      router.push("/TahghighatManage");
      return;
    }
    setReferralId(id);
    router.replace(`/v2/hoze?referralId=${id}`, { scroll: false });
  };

  async function mutate(url: string, data: Record<string, unknown>, message: string, closeCase = false) {
    if (busy) return false;
    setBusy(true); setError("");
    try {
      await meratV2Request(url, data);
      showToast.success(message, "تحقیقات حوزه انتخابیه");
      if (closeCase) setSelectedReferral(null);
      else if (referralId !== null) await Promise.allSettled([
        refreshCase(referralId), refreshChildren(referralId), refreshAssignments(referralId),
      ]);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(false); }
  }
  function closeDialog() {
    pickerVersion.current++;
    setDialog(null); setPickerError(""); setPickerLoading(false);
  }
  async function openDialog(kind: Exclude<Dialog, null>) {
    if (!referralId || (kind === "COUNTY" ? !canRefer : !canAssign)) return;
    setDialog(kind); setPickerError(""); setPickerLoading(true);
    setCountyId(""); setInvestigatorId(""); setCountyNote(""); setInstruction(""); setDueDate(getTodayJalali());
    const version = ++pickerVersion.current;
    try {
      const rows = await meratV2Request(kind === "COUNTY"
        ? `/Api/TahghighV2/HozeCountyChoices?hozeReferralId=${referralId}`
        : `/Api/TahghighV2/HozeInvestigatorCandidates?hozeReferralId=${referralId}`);
      if (version !== pickerVersion.current) return;
      if (kind === "COUNTY") setCounties(rows); else setCandidates(rows);
    } catch (e) {
      if (version === pickerVersion.current) setPickerError(e instanceof Error ? e.message : String(e));
    } finally {
      if (version === pickerVersion.current) setPickerLoading(false);
    }
  }
  async function referCounty() {
    if (!referralId || !canRefer || !countyId || !countyNote.trim()) return;
    const ok = await mutate("/Api/TahghighV2/HozeReferCounty", {
      hozeReferralId: referralId, countyCityId: Number(countyId), description: countyNote.trim(),
    }, "ارجاع شهرستان فرعی ثبت شد.");
    if (ok) { closeDialog(); expand("county"); }
  }
  async function deleteCountyReferral(row: V2Row) {
    if (!referralId || busy || deletingCountyId !== null || !yes(row.CanDelete)) return;
    const countyReferralId = asNum(row.CountyReferralId);
    if (!Number.isSafeInteger(countyReferralId) || countyReferralId <= 0) return;
    const countyName = value(row.CountyName ?? row.CountyCityId);
    if (!await meratConfirm(`ارجاع به شهرستان «${countyName}» حذف شود؟ حذف فقط پیش از هرگونه اقدام شهرستان مجاز است و سوابق آن حفظ می‌شود.`)) return;
    setDeletingCountyId(countyReferralId);
    try {
      await mutate("/Api/TahghighV2/HozeDeleteCountyReferral", {
        hozeReferralId: referralId,
        countyReferralId,
      }, "ارجاع شهرستان فرعی پیش از شروع رسیدگی حذف شد.");
    } finally {
      setDeletingCountyId(null);
    }
  }
  async function assignInvestigator() {
    if (!referralId || !canAssign || !investigatorId || !instruction.trim()) return;
    const ok = await mutate("/Api/TahghighV2/HozeAssignInvestigator", {
      hozeReferralId: referralId, personId: Number(investigatorId),
      instruction: instruction.trim(), dueDatePersian: dueDate || null,
    }, "ارجاع محقق ثبت شد.");
    if (ok) { closeDialog(); expand("investigator"); }
  }
  async function startCase() {
    if (!referralId || !canStart) return;
    await mutate("/Api/TahghighV2/ChildAction", {
      childReferralId: referralId, actionCode: "CHILD_START", description: "شروع فرآیند بررسی پرونده در حوزه انتخابیه",
    }, "بررسی پرونده در حوزه آغاز شد.");
  }
  async function recallInvestigator() {
    if (cancelId === null || !working || !cancelReason.trim()) return;
    if (!await meratConfirm("محقق انتخاب‌شده با ثبت دلیل بازپس‌گیری شود؟")) return;
    const ok = await mutate("/Api/TahghighV2/HozeCancelAssignment", {
      assignmentId: cancelId, reason: cancelReason.trim(),
    }, "مأموریت محقق بازپس‌گیری شد.");
    if (ok) { setCancelId(null); setCancelReason(""); }
  }

  return <main className={`${s.page} ${s.hozePage}`} dir="rtl">
    {returnTarget && referralId !== null && <ReturnReferralModal parentReferralId={referralId}
      childReferralId={returnTarget.id} destination={returnTarget.name} onClose={()=>setReturnTarget(null)}
      onReturned={()=>{setReturnTarget(null);void Promise.allSettled([refreshCase(referralId),refreshChildren(referralId)]);}}/>}
    <nav className={s.breadcrumb} aria-label="مسیر پرونده">
      <button type="button" onClick={() => router.push("/Dashboard")}>داشبورد</button><span>/</span>
      <button type="button" onClick={() => router.push("/TahghighatManage")}>مدیریت تحقیقات</button><span>/</span>
      <span className={s.crumbPerson}>{detail ? `پرونده ${caseTitle} — حوزه انتخابیه ${value(detail.HozeName)}` : "تحقیقات حوزه انتخابیه"}</span>
      <button type="button" className={s.backLink} onClick={() => router.push("/TahghighatManage")}>بازگشت به پیشخوان</button>
    </nav>

    {error && <div role="alert" className={s.error}>{error}</div>}
    {loading && <div className={s.empty}>در حال دریافت مشخصات پرونده…</div>}
    {!loading && referralId !== null && !detail && <div className={s.empty}>اطلاعات پرونده در محدوده دسترسی حوزه بارگذاری نشد.</div>}

    {detail && sameCase && <>
      <div className={`${s.metaBar} ${s.mainCaseBar}`}>
        <span className={s.mainCaseBadge}>پرونده حوزه انتخابیه</span>
        <span><b>داوطلب:</b> {caseTitle}</span>
        <span><b>شماره پرونده:</b> {value(detail.ShomarehParvandeh)}</span>
        <span><b>سال تولد:</b> {value(detail.SalTavalod)}</span>
        <span><b>حوزه:</b> {value(detail.HozeName)}</span>
        <span><b>تاریخ ارجاع:</b> {humanDate(detail.CreatedAtUtc)}</span>
        <span className={s.metaDescription} title={String(detail.Description ?? "")}><b>توضیحات:</b> {value(detail.Description)}</span>
        {canStart && <button type="button" className={s.addButton} disabled={busy} onClick={() => void startCase()}>شروع بررسی پرونده</button>}
        {String(detail.StateCode) === "CHILD_REPLIED" ?
          <button type="button" className={s.sentCaseButton} onClick={() => setProvinceSendOpen(true)}
            title="مشاهده متن ثبت‌شده و ارسال‌شده به استان (فقط‌خواندنی)">✓ ارسال‌شده به استان · مشاهده گزارش</button> :
          <button type="button" className={s.greenButton}
            disabled={!validCompletion}
            title={!validCompletion ? "تا تکمیل همه تحقیقات و دریافت تمام پاسخ‌های شهرستان‌ها، ارسال به استان ممکن نیست." : "جمع‌بندی محققان حوزه و پاسخ شهرستان‌ها، ثبت و ارسال به استان"}
            onClick={() => setProvinceSendOpen(true)}>ارسال پرونده به استان</button>}

      </div>
      {canStart && <div className={s.warning}>برای شروع ارجاع و ثبت جمع‌بندی ابتدا دکمه «شروع بررسی پرونده» را انتخاب کنید.</div>}

      {referralId !== null && !yes(detail.IsClosed) && <ChildReturnNotice referralId={referralId}/>}
      <section className={`${s.referralPanel} ${s.hozePanel}`}>
        <div className={s.panelHeading}>
          <button type="button" className={s.panelTitle} aria-expanded={open.county} onClick={() => toggle("county")}>
            <span className={s.chevron}>{open.county ? "▾" : "▸"}</span><strong>ارجاع به شهرستان فرعی</strong>
            <span className={s.countGray} title="تعداد ارجاعات">{children.length.toLocaleString("fa-IR")}</span>
            <span className={s.countGreen} title="پاسخ‌های دریافت‌شده">{children.filter(r=>yes(r.IsClosed)).length.toLocaleString("fa-IR")}</span>
            <span className={s.groupHint}>فقط شهرستان‌های تابع این حوزه</span>
          </button>
          {canRefer && <button type="button" className={s.addButton} onClick={() => void openDialog("COUNTY")}>⊕ ارجاع به شهرستان فرعی</button>}
        </div>
        {open.county && <div className={s.panelBody}>
          {countyError && <div role="alert" className={s.error}>دریافت ارجاعات شهرستان: {countyError} <button type="button" className={s.outlineButton} onClick={() => referralId && void refreshChildren(referralId)}>تلاش مجدد</button></div>}
          {!countyError && children.length === 0 && <p className={s.hint}>هنوز ارجاعی به شهرستان فرعی ثبت نشده است. اگر این حوزه شهرستان فرعی نداشته باشد، بررسی مستقیم امکان‌پذیر است.</p>}
          <div className={s.childList}>{children.map((row, i) => <article key={value(row.CountyReferralId)} className={`${s.childCard} ${yes(row.IsClosed)?s.childReceived:s.childWaiting}`}>
            <span className={s.childIndex}>{(i+1).toLocaleString("fa-IR")}</span>
            <div className={s.childContent}>
              <div className={s.childTitleRow}><strong>شهرستان {value(row.CountyName ?? row.CountyCityId)}</strong>
                <span className={`${s.childStatus} ${yes(row.IsClosed)?s.statusReceived:s.statusWaiting}`}>{yes(row.IsClosed)?"پاسخ دریافت شد":"در انتظار پاسخ"}</span>
              </div>
              <div className={s.childMeta}><span>ارجاع: {value(row.CountyReferralId)}</span><span>تحقیقات باز: {value(row.OpenAssignments)}</span><span>{value(row.Description)}</span></div>
              {Boolean(row.CountySummaryText) && <p className={s.summaryExcerpt}>{value(row.CountySummaryText)}</p>}
              <div className={s.dossierActionRow}>
                <button type="button" className={s.dossierViewButton} onClick={() => setCountyDossierId(asNum(row.CountyReferralId))}
                  title={`مشاهده فقط‌خواندنی گزارش و اسناد شهرستان ${value(row.CountyName ?? "")}`}>
                  <span aria-hidden="true">◉</span> مشاهده جزئیات تحقیقات و اسناد <span aria-hidden="true">‹</span>
                </button>
                {working && yes(row.IsClosed) && String(row.StateCode)==="CHILD_REPLIED" &&
                 <button type="button" className={s.cancelButton} onClick={()=>setReturnTarget({id:asNum(row.CountyReferralId),name:`شهرستان ${value(row.CountyName??row.CountyCityId)}`})}>
                   برگشت به شهرستان برای اصلاح
                 </button>}
              </div>
            </div>
            {yes(row.CanDelete) && <button
              type="button"
              className={s.deleteReferralButton}
              disabled={busy || deletingCountyId !== null}
              title="حذف ارجاع بدون اقدام مقصد"
              aria-label={`حذف ارجاع شهرستان ${value(row.CountyName ?? row.CountyCityId)}`}
              onClick={() => void deleteCountyReferral(row)}>
              {deletingCountyId === asNum(row.CountyReferralId) ? "در حال حذف…" : "حذف"}
            </button>}
          </article>)}</div>
        </div>}
      </section>

      <section className={`${s.referralPanel} ${s.investigatorPanel}`}>
        <div className={s.panelHeading}>
          <button type="button" className={s.panelTitle} aria-expanded={open.investigator} onClick={() => toggle("investigator")}>
            <span className={s.chevron}>{open.investigator ? "▾" : "▸"}</span><strong>ارجاع به محقق ویژه شهرستان</strong>
            <span className={s.countGray} title="تعداد انتساب‌ها">{assignments.length.toLocaleString("fa-IR")}</span>
            <span className={s.countGreen} title="تحقیقات تکمیل‌شده">{assignments.filter(r=>String(r.StatusCode)==="DONE").length.toLocaleString("fa-IR")}</span>
          </button>
          {canAssign && <button type="button" className={s.addButton} onClick={() => void openDialog("INVESTIGATOR")}>⊕ ارجاع به محقق</button>}
        </div>
        {open.investigator && <div className={s.panelBody}>
          {assignmentError && <div role="alert" className={s.error}>دریافت محققان: {assignmentError} <button type="button" className={s.outlineButton} onClick={() => referralId && void refreshAssignments(referralId)}>تلاش مجدد</button></div>}
          {!assignmentError && assignments.length === 0 && <p className={s.hint}>در این پرونده محققی از سوی حوزه انتخابیه تعیین نشده است.</p>}
          <div className={`${s.childList} ${s.investigatorList}`}>{assignments.map((row,i) => <article className={`${s.childCard} ${s.investigatorCard}`} key={asNum(row.AssignmentId)}>
            <span className={s.childIndex}>{(i+1).toLocaleString("fa-IR")}</span>
            <div className={s.childContent}>
              <div className={s.childTitleRow}><strong>{value(row.FullName ?? row.InvestigatorKey)}</strong>
                <span className={s.investigatorStatus}><StateChip value={row.StatusCode}/></span>
              </div>
              <div className={s.childMeta}>
                <span>تعداد کاربرگ‌ها: {asNum(row.WorksheetCount).toLocaleString("fa-IR")}</span>
                <span>شناسه انتساب: {value(row.AssignmentId)}</span>
              </div>
              <div className={s.investigatorActions}>
                <button type="button" className={s.linkButton}
                  aria-expanded={worksheetId===asNum(row.AssignmentId)}
                  onClick={() => setWorksheetId(worksheetId===asNum(row.AssignmentId)?null:asNum(row.AssignmentId))}>
                  {worksheetId===asNum(row.AssignmentId)?"بستن جزئیات و کاربرگ‌ها":"جزئیات، کاربرگ‌ها و جمع‌بندی"}
                </button>
                {working && pending(row) && <button type="button" className={s.linkButton} onClick={() => {setCancelId(asNum(row.AssignmentId));setCancelReason("");expand("investigator");}}>بازپس‌گیری محقق</button>}
              </div>
              {!canSaveWorksheet && pending(row) && <p className={s.permissionHint}>ثبت کاربرگ برای این کاربر یا وضعیت پرونده مجاز نیست.</p>}
            </div>
            {worksheetId === asNum(row.AssignmentId) && <div className={s.worksheetHolder}>
              <ProvinceInvestigatorWorksheetEditor
                key={asNum(row.AssignmentId)}
                assignmentId={asNum(row.AssignmentId)}
                investigatorName={String(row.FullName ?? row.InvestigatorKey ?? "")}
                assignmentStatus={String(row.StatusCode)}
                scope="HOZE"
                canManage={canSaveWorksheet}
                onSaved={async () => { if (referralId !== null) await refreshAssignments(referralId); }}
              />
            </div>}
          </article>)}</div>
          {cancelId !== null && <div className={s.cancelBox}>
            <strong>بازپس‌گیری محقق</strong>
            <label htmlFor="hoze-cancel-reason" className={s.label}>دلیل بازپس‌گیری</label>
            <textarea id="hoze-cancel-reason" className={s.field} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} maxLength={2000} rows={2}/>
            <div className={s.actions}>
              <button type="button" className={s.primary} disabled={busy||!cancelReason.trim()} onClick={() => void recallInvestigator()}>تأیید بازپس‌گیری</button>
              <button type="button" className={s.outlineButton} onClick={() => setCancelId(null)}>انصراف</button>
            </div>
          </div>}
        </div>}
      </section>

      {open.tracking && <section className={s.compactBox}>
        <div className={s.rowHeading}><strong>پیگیری ارجاعات حوزه</strong><button type="button" className={s.outlineButton} onClick={() => {if(referralId){void refreshChildren(referralId);void refreshAssignments(referralId);}}}>بازخوانی</button></div>
        <div className={s.checkList}>
          <span>شهرستان‌ها: {children.length.toLocaleString("fa-IR")} / باز: {activeChildCount.toLocaleString("fa-IR")}</span>
          <span>محققان: {assignments.length.toLocaleString("fa-IR")} / باز: {activeInvestigatorCount.toLocaleString("fa-IR")}</span>

        </div>
      </section>}

    </>}

    {referralId !== null && provinceSendOpen && <HozeProvinceSendModal
      hozeReferralId={referralId} onClose={() => setProvinceSendOpen(false)}
      readOnly={String(detail?.StateCode) === "CHILD_REPLIED"}
      onSent={() => {setProvinceSendOpen(false); router.push("/TahghighatManage?view=sent");}} />}
    {referralId !== null && countyDossierId !== null && <HozeCountyDossierReadonly hozeReferralId={referralId} countyReferralId={countyDossierId} onClose={() => setCountyDossierId(null)} />}
    {referralId === null && <div className={s.empty}>
      برای مشاهده پرونده حوزه، پرونده موردنظر را از پیشخوان تحقیقات انتخاب کنید.
      <button type="button" className={s.outlineButton} onClick={() => router.push("/TahghighatManage")}>رفتن به پیشخوان تحقیقات</button>
    </div>}


    {dialog && <div className={s.modalOverlay} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget && !busy)closeDialog();}}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="hoze-dialog-title">
        <div className={s.modalHeader}><strong id="hoze-dialog-title">{dialog==="COUNTY"?"ارجاع به شهرستان فرعی":"ارجاع به محقق ویژه شهرستان"}</strong><button type="button" className={s.modalClose} aria-label="بستن" disabled={busy} onClick={closeDialog}>×</button></div>
        <div className={s.modalBody}>
          {pickerError && <div role="alert" className={s.error}>{pickerError}<button type="button" className={s.outlineButton} onClick={() => dialog && void openDialog(dialog)}>تلاش مجدد</button></div>}
          {dialog === "COUNTY" ? <>
            <label className={s.label}>انتخاب شهرستان فرعی</label>
            <div className={s.countySelectWrap}>
              <SearchableDropdown<string>
                value={countyId || null} onChange={setCountyId}
                options={availableCounties.map(row => ({
                  value: String(row.CountyCityId), label: value(row.CountyName),
                  description: asNum(row.ActiveRepresentatives) < 1 ? "بدون نماینده فعال" : undefined,
                }))}
                placeholder="انتخاب شهرستان تابع..." searchPlaceholder="جست‌وجوی شهرستان..."
                loading={pickerLoading} disabled={Boolean(pickerError) || busy}
                compact containInDialog menuMaxHeight={228}
                ariaLabel="انتخاب شهرستان تابع حوزه"
              />
            </div>
            {!pickerLoading && !pickerError && availableCounties.length === 0 && <p className={s.hint}>شهرستان فرعی جدیدی برای ارجاع باقی نمانده است؛ شهرستان‌های قبلاً ارجاع‌شده دوباره قابل انتخاب نیستند.</p>}
          </> : <>
            <label className={s.label} id="hoze-investigator-label">انتخاب محقق</label>
            <div className={s.investigatorSearchWrap}>
              <SearchableDropdown<string>
                value={investigatorId || null}
                onChange={setInvestigatorId}
                options={availablePeople.map(row => {
                  const inactive = row.IsAssignable === false || row.IsAssignable === 0 || row.IsAssignable === "0";
                  const county = String(row.CountyName ?? "").trim();
                  const name = String(row.FullName ?? "").trim() || "محقق بدون نام";
                  return {
                    value: String(row.PersonId),
                    label: name,
                    description: [county, inactive ? "غیرفعال" : ""].filter(Boolean).join(" • "),
                    searchText: `${name} ${county} ${String(row.PersonId)}`,
                    disabled: inactive,
                  };
                })}
                ariaLabel="انتخاب محقق ویژه شهرستان"
                placeholder="انتخاب یا جست‌وجوی محقق..."
                searchPlaceholder="جست‌وجو بر اساس نام یا شهرستان..."
                emptyText="محققی برای انتخاب یافت نشد."
                noResultText="محققی با این عبارت پیدا نشد."
                loading={pickerLoading}
                loadingText="در حال دریافت محققان..."
                disabled={busy || Boolean(pickerError)}
                compact
                containInDialog
                menuMaxHeight={228}
                itemFontSize="12.5px"
              />
            </div>
            {!pickerLoading && !pickerError && availablePeople.length === 0 && <p className={s.hint}>محقق جدیدی برای انتساب باقی نمانده است؛ محققان دارای انتساب قبلی دوباره قابل انتخاب نیستند.</p>}
          </>}
          {dialog==="COUNTY" && countyId && asNum(counties.find(row => String(row.CountyCityId) === countyId)?.ActiveRepresentatives) < 1 &&
            <p className={s.countyPendingNotice} role="status">این شهرستان فعلاً نماینده فعال ندارد. ارجاع ثبت می‌شود، اما رسیدگی شهرستان تا تعیین نماینده مجاز در انتظار خواهد ماند.</p>}
          {dialog==="INVESTIGATOR" && <><label className={s.label}>مهلت انجام (شمسی)</label><div className={s.dateBox}><InputPersianDate value={dueDate||null} onChange={v=>setDueDate(v||"")} allowPastDates={false}/></div></>}
          <label className={s.label} htmlFor="hoze-modal-instruction">شرح مأموریت</label>
          <textarea id="hoze-modal-instruction" className={s.field} rows={4} maxLength={6000} value={dialog==="COUNTY"?countyNote:instruction} onChange={e=>dialog==="COUNTY"?setCountyNote(e.target.value):setInstruction(e.target.value)} />
        </div>
        <div className={s.modalActions}>
          <button type="button" className={s.primary} disabled={busy||pickerLoading||Boolean(pickerError)||(dialog==="COUNTY"?(!countyId||!countyNote.trim()):(!investigatorId||!instruction.trim()))} onClick={()=>void (dialog==="COUNTY"?referCounty():assignInvestigator())}>تأیید ارجاع</button>
          <button type="button" className={s.cancelButton} disabled={busy} onClick={closeDialog}>انصراف</button>
        </div>
      </div>
    </div>}
  </main>;
}

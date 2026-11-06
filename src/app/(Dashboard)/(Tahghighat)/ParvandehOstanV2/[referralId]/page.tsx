"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";
import { showToast } from "@/component/CustomToast";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMeratUser } from "@/lib/useMeratUser";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import InputPersianDate, { getTodayJalali } from "@/component/Objects/InputPersianDatePicker";
import SearchableDropdown from "@/component/Dropdown/SearchableDropdown";
import ProvinceLegacySummaryForm from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceLegacySummaryForm";
import ProvinceInvestigatorWorksheetEditor from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceInvestigatorWorksheetEditor";
import ProvinceChildDossierReadonly from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceChildDossierReadonly";
import ReturnReferralModal from "@/app/(Dashboard)/(Tahghighat)/v2/components/ReturnReferralModal";
import ChildReturnNotice from "@/app/(Dashboard)/(Tahghighat)/v2/components/ChildReturnNotice";
import styles from "./ProvinceCase.module.css";

type ReferralForm = "HOZE" | "OSTAN" | "INVESTIGATOR" | null;
type Level = "HOZE" | "OSTAN";
const stateNames: Record<string, string> = {
  PROVINCE_INBOX: "پیشخوان استان", PROVINCE_WORKING: "در حال بررسی استان",
  PROVINCE_RETURNED: "برگشت به کارشناس استان",
  DIRECTOR_REVIEW: "در انتظار رئیس دفتر", SETAD_REVIEW: "در انتظار ستاد",
  PENDING_CHILD_RESULTS: "در انتظار پاسخ ارجاعات", APPROVED: "تأیید نهایی",
  CHILD_INBOX: "پیشخوان مقصد", CHILD_WORKING: "در حال بررسی مقصد", CHILD_REPLIED: "پاسخ ارسال‌شده"
};
const readable = (v: unknown) => v == null || v === "" ? "—" : String(v);
const asNum = (v: unknown) => Number(v ?? 0);
const activeProvinceStates = ["PROVINCE_INBOX", "PROVINCE_WORKING", "PROVINCE_RETURNED"];
const editableStates = ["PROVINCE_WORKING", "PROVINCE_RETURNED"];

export default function ProvinceCaseDetails() {
  const router = useRouter();
  const params = useParams();
  const user = useMeratUser();
  const referralId = Number(params?.referralId);
  const validId = Number.isSafeInteger(referralId) && referralId > 0;
  const authorizedRole = [51, 52].includes(Number(user.PostId));
  const [detail, setDetail] = useState<V2Row | null>(null);
  const [identity, setIdentity] = useState<V2Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ReferralForm>(null);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [description, setDescription] = useState("");
  const [hasOfficialSummary, setHasOfficialSummary] = useState(false);
  const [destinationType, setDestinationType] = useState<Level>("HOZE");
  const [destinations, setDestinations] = useState<V2Row[]>([]);
  const [destination, setDestination] = useState("");
  const [delegateReason, setDelegateReason] = useState("");
  const [children, setChildren] = useState<V2Row[]>([]);
  const [deletingChildId, setDeletingChildId] = useState<number | null>(null);
  const [readonlyChildId, setReadonlyChildId] = useState<number | null>(null);
  const [returnTarget, setReturnTarget] = useState<{ id: number; name: string } | null>(null);
  const [childReplyText, setChildReplyText] = useState("");
  const [candidates, setCandidates] = useState<V2Row[]>([]);
  const [assignments, setAssignments] = useState<V2Row[]>([]);
  const [investigatorKey, setInvestigatorKey] = useState("");
  const [investigatorReason, setInvestigatorReason] = useState("");
  const [dueDate, setDueDate] = useState(() => getTodayJalali());
  const [worksheetAssignmentId, setWorksheetAssignmentId] = useState<number | null>(null);
  const [cancelAssignmentId, setCancelAssignmentId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [summaryId, setSummaryId] = useState<number | null>(null);
  const [summaryReadOnly, setSummaryReadOnly] = useState(true);
  // Destination and investigator lists are only requested when their picker is opened.
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const pickerRequestId = useRef(0);
  const [trackingError, setTrackingError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [summaryTargetError, setSummaryTargetError] = useState("");

  const refreshDetail = useCallback(async () => {
    if (!validId) throw new Error("شناسه ارجاع معتبر نیست.");
    const [item] = await meratV2Request(`/Api/TahghighV2/ReferralDetail?referralId=${referralId}`);
    if (!item) throw new Error("جزئیات پرونده در محدوده دسترسی شما یافت نشد.");
    setDetail(item);
  }, [validId, referralId]);

  const refreshTracking = useCallback(async () => {
    if (!validId) return;
    const result = await meratV2Request(`/Api/TahghighV2/ParentChildren?parentReferralId=${referralId}`);
    setChildren(result);
  }, [validId, referralId]);

  const refreshAssignments = useCallback(async () => {
    if (!validId) return;
    const result = await meratV2Request(`/Api/TahghighV2/ProvinceAssignments?referralId=${referralId}`);
    setAssignments(result);
  }, [validId, referralId]);

  // A final investigator summary image also closes the assignment.
  // Refresh both the investigator counters and the parent case eligibility
  // immediately, without requiring a manual browser reload.
  const refreshAfterInvestigatorSaved = useCallback(async () => {
    await Promise.all([refreshAssignments(), refreshDetail()]);
  }, [refreshAssignments, refreshDetail]);

  const refreshSummaryTarget = useCallback(async () => {
    if (!validId) return;
    const [item] = await meratV2Request(`/Api/TahghighV2/ProvinceSummaryAttachmentTarget?referralId=${referralId}`);
    const id = asNum(item?.SummaryId);
    setSummaryId(Number.isSafeInteger(id) && id > 0 ? id : null);
    setSummaryReadOnly(!Boolean(item?.CanWrite));
  }, [validId, referralId]);

  useEffect(() => {
    if (!validId) { setLoading(false); setError("شناسه ارجاع نامعتبر است."); return; }
    if (!user.UserId || !user.PostId) return;
    if (!authorizedRole) { setLoading(false); setError("صفحه اقدامات استان فقط برای کارشناسان مجاز استان است."); return; }
    let live = true;
    setLoading(true); setError("");
    // Core case details are independent of optional destination/identity lookups.
    // A secondary endpoint failure must never hide the case or block valid actions.
    void meratV2Request(`/Api/TahghighV2/ReferralDetail?referralId=${referralId}`)
      .then(items => {
        if (!live) return;
        if (!items[0]) throw new Error("ارجاع مجاز برای این کاربر یافت نشد.");
        setDetail(items[0]);
        setChildReplyText(String(items[0].SummaryText || ""));
      }).catch(e => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    void meratV2Request(`/Api/TahghighV2/ReferralIdentity?referralId=${referralId}`)
      .then(items => { if (live) setIdentity(items[0] || null); })
      .catch(() => { if (live) setIdentity(null); });
    return () => { live = false; };
  }, [validId, referralId, user.UserId, user.PostId, authorizedRole]);

  // Previous legacy free-text summaries are not silently treated as an
  // answered official form; the new form must actually be completed.
  useEffect(() => {
    if (!validId || !authorizedRole || !detail) return;
    let active = true;
    void meratV2Request(`/Api/TahghighV2/ProvinceLegacySummary?referralId=${referralId}`)
      .then(rows => { if (active) setHasOfficialSummary(Boolean(rows[0]?.IsFormFinalized)); })
      .catch(() => { if (active) setHasOfficialSummary(false); });
    return () => { active = false; };
  }, [validId, authorizedRole, Boolean(detail), referralId]);

  useEffect(() => {
    if (!validId || !authorizedRole || !detail) return;
    let active = true;
    // These read-only sections must not block the case or display a global error.
    // InvestigatorCandidates and ReferralDestinations are intentionally NOT loaded here.
    void Promise.allSettled([
      refreshTracking(), refreshAssignments(), refreshSummaryTarget()
    ]).then(results => {
      if (!active) return;
      const reason = (result: PromiseSettledResult<void>) =>
        result.status === "rejected" ? (result.reason instanceof Error ? result.reason.message : String(result.reason)) : "";
      setTrackingError(reason(results[0]));
      setAssignmentError(reason(results[1]));
      setSummaryTargetError(reason(results[2]));
    });
    return () => { active = false; };
  }, [validId, authorizedRole, Boolean(detail), referralId, refreshAssignments, refreshTracking, refreshSummaryTarget]);

  async function mutate(path: string, data: Record<string, unknown>, message: string) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await meratV2Request(path, data);
      showToast.success(message, "تحقیقات استان");
      await refreshDetail();
      await Promise.allSettled([refreshTracking(), refreshAssignments(), refreshSummaryTarget()]);
      return true;
    } catch(e) {
      setError(e instanceof Error ? e.message : "ثبت عملیات ناموفق بود.");
      return false;
    } finally { setBusy(false); }
  }

  const state = String(detail?.StateCode ?? "");
  const canWork = !busy && !loading && Boolean(detail) && activeProvinceStates.includes(state) && !Boolean(detail?.IsClosed);
  const canStart = canWork && state === "PROVINCE_INBOX";
  // While child referrals are waiting for replies, the province may still add
  // more Hoze/province referrals and assign more special investigators.
  // Final decisions remain separately guarded by canWork/canNoResearch.
  const canDelegate = !busy && !loading && Boolean(detail) && !Boolean(detail?.IsClosed)
    && (editableStates.includes(state) || state === "PENDING_CHILD_RESULTS" ||
      (Boolean(detail?.ParentReferralId) && state === "CHILD_WORKING"));
  // Final province summary is only available after ALL child referrals and
  // all investigator assignments have returned; this is not a styling-only gate.
  const hasPending = asNum(detail?.PendingChildReferrals) > 0 || asNum(detail?.PendingAssignments) > 0;
  const canSummary = canDelegate && !hasPending;
  const isDirectorSendReady = canSummary && hasOfficialSummary;
  const canNoResearch = canWork && !hasPending;
  const canAssign = canDelegate;

  async function provinceAction(actionCode: "START_PROVINCE" | "NO_RESEARCH" | "SUBMIT_DIRECTOR") {
    if (actionCode === "START_PROVINCE" && !canStart) return;
    if (actionCode === "NO_RESEARCH" && (!canNoResearch || !description.trim())) {
      setError("دلیل عدم نیاز به تحقیق را وارد کنید.");return;
    }
    // After the official province form has been finalized, its transmission does
    // not require the user to retype a second, duplicate summary/description.
    if (actionCode === "SUBMIT_DIRECTOR" && !isDirectorSendReady) return;
    if (actionCode === "NO_RESEARCH" && !await meratConfirm("عدم نیاز به تحقیق ثبت و پرونده برای رئیس دفتر ارسال شود؟")) return;
    if (actionCode === "SUBMIT_DIRECTOR" && !await meratConfirm("فرم جمع‌بندی نهایی و تصاویر آن برای رئیس دفتر ارسال شود؟")) return;
    const actionDescription = actionCode === "SUBMIT_DIRECTOR"
      ? "ارسال فرم رسمی جمع‌بندی نهایی تحقیقات استان به رئیس دفتر"
      : description.trim();
    const ok = await mutate("/Api/TahghighV2/ProvinceAction", {
      referralId, actionCode, description: actionDescription
    }, actionCode === "START_PROVINCE" ? "بررسی استان آغاز شد." : "تصمیم ثبت و به رئیس دفتر ارسال شد.");
    if (ok) {
      setDescription("");
      setOpenPanels(prev => ({...prev,summary:false,decision:false}));
      if (actionCode === "SUBMIT_DIRECTOR") router.push("/TahghighatManage");
    }
  }

  async function delegate() {
    if (!canDelegate || !destination || !delegateReason.trim()) return;
    const selectedCity = destinations.find(r => r.TargetLevel === destinationType && String(r.DestinationCityId) === destination);
    // The referral modal's own submit button is the user's confirmation.
    // Do not show a second confirmation dialog for this modal action.
    if (!selectedCity || !Boolean(selectedCity.CanRefer)) return;
    const ok = await mutate("/Api/TahghighV2/DelegateChild", {
      parentReferralId: referralId, destinationCityId: Number(destination),
      targetLevel: destinationType, description: delegateReason.trim(),
    }, "ارجاع زیرمجموعه با موفقیت ثبت شد.");
    if (ok) { setDestination(""); setDelegateReason(""); closeForm(); setOpenPanels(prev => ({...prev, [destinationType]: true})); }
  }

  async function deleteChild(row: V2Row) {
    const childReferralId = Number(row.ReferralId);
    if (busy || deletingChildId !== null || !Boolean(row.CanDelete) ||
        !Number.isSafeInteger(childReferralId) || childReferralId <= 0) return;
    const targetName = String(row.DestinationName || row.ToMahal || "این مقصد");
    // Deleting an already-sent referral is a destructive action, so use the
    // shared Merat confirmation dialog (unlike creating a referral in a modal).
    if (!await meratConfirm(`ارجاع به «${targetName}» حذف شود؟ این کار فقط پیش از هر اقدام مقصد مجاز است.`)) return;
    setDeletingChildId(childReferralId);
    try {
      await mutate("/Api/TahghighV2/DeleteChildReferral", {
        parentReferralId: referralId, childReferralId,
      }, "ارجاع بدون اقدام مقصد حذف شد.");
    } finally {
      setDeletingChildId(null);
    }
  }

  async function assign() {
    if (!canAssign || !investigatorKey || !investigatorReason.trim()) return;
    const ok = await mutate("/Api/TahghighV2/ProvinceAssignInvestigator", {
      referralId, investigatorKey: Number(investigatorKey), instruction: investigatorReason.trim(),
      dueDatePersian: dueDate || null,
    }, "ارجاع به محقق استان ثبت شد.");
    if (ok) { setInvestigatorKey(""); setInvestigatorReason(""); setDueDate(getTodayJalali()); closeForm(); setOpenPanels(prev => ({...prev, INVESTIGATOR: true})); }
  }

  async function cancelAssignment() {
    if (cancelAssignmentId === null || !cancelReason.trim()) return;
    const ok = await mutate("/Api/TahghighV2/ProvinceCancelAssignment", {
      assignmentId: cancelAssignmentId, reason: cancelReason.trim()
    }, "محقق با ثبت دلیل بازپس‌گیری شد.");
    if (ok) { setCancelAssignmentId(null); setCancelReason(""); }
  }

  async function resendReturnedProvinceChild() {
    if (!validId || busy || !detail?.ParentReferralId || String(detail.ReceiverLevel)!=="OSTAN" ||
        state!=="CHILD_WORKING" || hasPending || childReplyText.trim().length<20) return;
    if (!await meratConfirm("پاسخ اصلاح‌شده به استان فرستنده ارسال شود؟")) return;
    setBusy(true); setError("");
    try {
      await meratV2Request("/Api/TahghighV2/SaveReturnedProvinceChildText", {
        childReferralId: referralId, summaryText: childReplyText.trim(),
      });
      await meratV2Request("/Api/TahghighV2/ChildAction", {
        childReferralId: referralId, actionCode: "CHILD_REPLY", description: childReplyText.trim(),
      });
      showToast.success("پاسخ اصلاح‌شده استان مقصد مجدداً ارسال شد.","تحقیقات استان");
      router.push("/TahghighatManage");
    } catch(e) { setError(e instanceof Error ? e.message : "ارسال دوباره انجام نشد."); }
    finally { setBusy(false); }
  }

  const personName = [identity?.FirstName, identity?.LastName].filter(Boolean).join(" ") || `پرونده ${readable(detail?.ShomarehParvandeh)}`;
  const hozeName = String(identity?.NameHozeh || "").trim();
  const provinceName = String(identity?.NameOstan || "").trim();
  const activeFormType: Level = form === "OSTAN" ? "OSTAN" : "HOZE";
  // در هر دو نوع ارجاع، فقط مقصدهایی نمایش داده می‌شوند که گیرنده فعال و مجاز دارند.
  // این فیلتر مکمل فیلتر سمت API است و جایگزین کنترل مجوز در SQL هنگام ثبت ارجاع نیست.
  const modalDestinations = destinations.filter(item =>
    item.TargetLevel === activeFormType && Boolean(item.CanRefer)
  );
  // Shared searchable dropdowns render their menus through a fixed-position portal.
  // The list therefore overlays neighbouring fields rather than expanding this dialog.
  const destinationOptions = modalDestinations.map(row => ({
    value: String(row.DestinationCityId),
    label: String(row.DestinationName ?? row.DestinationCityId ?? ""),
    searchText: String(row.DestinationName ?? ""),
  }));
  const investigatorOptions = candidates.map(row => ({
    value: String(row.InvestigatorKey ?? row.LegacyCodeMohaghegh ?? ""),
    label: String(row.FullName ?? `محقق ${readable(row.LegacyCodeMohaghegh)}`),
    description: !row.InvestigatorKey || !Boolean(row.IsAssignable) ? "حساب V2 متصل نیست" : undefined,
    searchText: `${String(row.FullName ?? "")} ${String(row.LegacyCodeMohaghegh ?? "")}`,
    disabled: !row.InvestigatorKey || !Boolean(row.IsAssignable),
  })).filter(option => option.value);
  const countFor = (kind: "HOZE" | "OSTAN") => children.filter(r => r.ReceiverLevel === kind);
  const doneFor = (kind: "HOZE" | "OSTAN") => countFor(kind).filter(r => Boolean(r.IsClosed)).length;
  const togglePanel = (key: string) => setOpenPanels(prev => ({...prev, [key]: !prev[key]}));
  const closeForm = () => {
    pickerRequestId.current += 1; // Ignore a response from a previously closed form.
    setPickerLoading(false); setPickerError("");
    setForm(null);
  };
  // Load the matching options when the dialog opens, not by expanding an inline list.
  const loadPickerOptions = async (type: Exclude<ReferralForm, null>) => {
    const requestId = ++pickerRequestId.current;
    setPickerLoading(true);
    setPickerError("");
    try {
      const url = type === "INVESTIGATOR"
        ? `/Api/TahghighV2/InvestigatorCandidates?referralId=${encodeURIComponent(referralId)}`
        : "/Api/TahghighV2/ReferralDestinations";
      const rows = await meratV2Request(url);
      if (requestId !== pickerRequestId.current) return;
      if (type === "INVESTIGATOR") setCandidates(rows);
      else setDestinations(rows);
    } catch (e) {
      if (requestId === pickerRequestId.current) {
        setPickerError(e instanceof Error ? e.message : "دریافت فهرست امکان‌پذیر نیست.");
      }
    } finally {
      if (requestId === pickerRequestId.current) setPickerLoading(false);
    }
  };
  const openForm = (type: Exclude<ReferralForm, null>) => {
    pickerRequestId.current += 1;
    setError(""); setPickerError("");
    if (type !== "INVESTIGATOR") {
      setDestinationType(type); setDestination(""); setDelegateReason("");
    } else { setInvestigatorKey(""); setInvestigatorReason(""); setDueDate(getTodayJalali()); }
    setForm(type);
    void loadPickerOptions(type);
  };
  const formatDate = (value: unknown) => {
    if (!value) return "—";
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  };
  const delegateItems = (kind: "HOZE" | "OSTAN") => countFor(kind);
  const renderDelegations = (kind: "HOZE" | "OSTAN") => {
    const title = kind === "HOZE" ? "ارجاع به حوزه انتخابیه" : "ارجاع به استان دیگر";
    const items = delegateItems(kind);
    return <section className={`${styles.referralPanel} ${kind === "HOZE" ? styles.hozePanel : styles.provincePanel}`} key={kind}>
      <div className={styles.panelHeading}>
        <button type="button" className={styles.panelTitle} onClick={() => togglePanel(kind)} aria-expanded={Boolean(openPanels[kind])}>
          <span className={styles.chevron}>{openPanels[kind] ? "▾" : "▸"}</span>
          <strong>{title}</strong>
          <span className={styles.countGray} title="تعداد کل ارجاعات">{items.length.toLocaleString("fa-IR")}</span>
          <span className={styles.countGreen} title="تعداد پاسخ‌ها">{doneFor(kind).toLocaleString("fa-IR")}</span>
          <span className={styles.groupHint}>{kind === "HOZE" ? "زیرمجموعه‌های داخل استان" : "زیرمجموعه‌های بین‌استانی"}</span>
        </button>
        <button className={styles.addButton} type="button" disabled={!canDelegate} onClick={() => openForm(kind)}>⊕ {title}</button>
      </div>
      {openPanels[kind] && <div className={styles.panelBody}>
        {trackingError && <p role="alert" className={styles.error}>خطا در دریافت ارجاعات: {trackingError}</p>}
        {items.length === 0 ? <p className={styles.hint}>برای این بخش هنوز ارجاعی ثبت نشده است.</p> :
          <div className={styles.childList}>
            {items.map((row,i) => {
              const received = Boolean(row.IsClosed);
              // ParentChildren supplies names even before the destination picker opens.
              const fetchedName = String(row.DestinationName ?? "").trim();
              const pickerName = String(destinations.find(d =>
                Number(d.DestinationCityId) === Number(row.ToMahal) && d.TargetLevel === kind
              )?.DestinationName ?? "").trim();
              const destinationName = fetchedName || pickerName;
              const fullName = destinationName
                ? (kind === "HOZE"
                  ? (/^حوزه(?:\s|‌)/.test(destinationName) ? destinationName : `حوزه انتخابیه ${destinationName}`)
                  : (/^استان(?:\s|‌)/.test(destinationName) ? destinationName : `استان ${destinationName}`))
                : `نام مقصد یافت نشد (کد ${readable(row.ToMahal)})`;
              const centerCity = String(row.DestinationCityName ?? "").trim();
              const destinationProvince = String(row.DestinationProvinceName ?? "").trim();
              return <article className={`${styles.childCard} ${received ? styles.childReceived : styles.childWaiting}`} key={readable(row.ReferralId)}>
                <span className={styles.childIndex}>{(i+1).toLocaleString("fa-IR")}</span>
                <div className={styles.childContent}>
                  <div className={styles.childTitleRow}>
                    <strong>{fullName}</strong>
                    <span className={`${styles.childStatus} ${received ? styles.statusReceived : styles.statusWaiting}`}>
                      {received ? "پاسخ دریافت شد" : "در انتظار پاسخ"}
                    </span>
                  </div>
                  {kind === "HOZE" && (centerCity || destinationProvince) && <div className={styles.childLocation}>
                    {centerCity && <span>شهرستان مرکز: {centerCity}</span>}
                    {destinationProvince && <span>استان {destinationProvince}</span>}
                  </div>}
                  <div className={styles.childMeta}>
                    <span>شناسه ارجاع: {readable(row.ReferralId)}</span>
                    <span>{stateNames[String(row.StateCode)] || readable(row.StateCode)}</span>
                  </div>
                </div>
                <button type="button" className={styles.dossierViewButton}
                  title={`نمایش فقط‌خواندنی تحقیقات و عملکرد ${fullName}`}
                  onClick={() => setReadonlyChildId(asNum(row.ReferralId))}>
                  <span aria-hidden="true">◉</span> مشاهده جزئیات تحقیقات و اسناد <span aria-hidden="true">‹</span>
                </button>
                {received && String(row.StateCode) === "CHILD_REPLIED" && canDelegate &&
                 <button type="button" className={styles.yellowButton}
                   onClick={() => setReturnTarget({ id: asNum(row.ReferralId), name: fullName })}
                   title="برگرداندن این پاسخ به مقصد، با ثبت دلیل برای اصلاح">برگشت برای اصلاح</button>}
                {Boolean(row.CanDelete) && <button
                  type="button"
                  className={styles.deleteReferralButton}
                  disabled={busy || deletingChildId !== null}
                  title="حذف ارجاع پیش از اقدام مقصد"
                  aria-label={`حذف ارجاع به ${fullName}`}
                  onClick={() => void deleteChild(row)}>
                  {deletingChildId === Number(row.ReferralId) ? "در حال حذف…" : "حذف"}
                </button>}
              </article>;
            })}
          </div>}
      </div>}
    </section>;
  };

  return <main className={styles.page} dir="rtl">
    {returnTarget && <ReturnReferralModal parentReferralId={referralId} childReferralId={returnTarget.id}
      destination={returnTarget.name} onClose={()=>setReturnTarget(null)}
      onReturned={()=>{setReturnTarget(null);void Promise.allSettled([refreshTracking(),refreshDetail()]);}}/>}
    <div className={styles.breadcrumb}>
      <button type="button" onClick={() => router.push("/Dashboard")}>داشبورد</button><span>/</span>
      <button type="button" onClick={() => router.push("/TahghighatManage")}>مدیریت تحقیقات</button><span>/</span>
      <span className={styles.crumbPerson}>{detail ? `پرونده ${personName}${provinceName ? `، ${provinceName}` : ""}${hozeName ? ` - ${hozeName}` : ""}` : "پرونده استان"}</span>
      <button className={styles.backLink} type="button" onClick={() => router.push("/TahghighatManage")}>بازگشت به پیشخوان</button>
    </div>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    {loading && <div className={styles.empty}>در حال دریافت پرونده…</div>}
    {!loading && !detail && <div className={styles.empty}>جزئیات پرونده قابل نمایش نیست. دسترسی و شناسه ارجاع را بررسی کنید.</div>}
    {detail && <>
      {Boolean(detail.ParentReferralId) && Number(detail.ParentReferralId)>0 && !Boolean(detail.IsClosed) &&
        <ChildReturnNotice referralId={referralId}/>}
      {Boolean(detail.ParentReferralId) && String(detail.ReceiverLevel)==="OSTAN" && state==="CHILD_WORKING" && !Boolean(detail.IsClosed) &&
       <section className={styles.compactBox}>
        <strong>پاسخ مجدد به استان فرستنده</strong>
        <p className={styles.hint}>پرونده برای اصلاح برگشته است. توضیحات پاسخ را بازبینی کنید؛ سوابق تحقیقات و پیوست‌های قبلی حفظ شده‌اند.</p>
        <textarea className={styles.field} rows={5} maxLength={10000} value={childReplyText}
          onChange={e=>setChildReplyText(e.target.value)} placeholder="متن پاسخ اصلاح‌شده استان مقصد…"/>
        <button className={styles.greenButton} disabled={busy||childReplyText.trim().length<20||hasPending} type="button"
          onClick={()=>void resendReturnedProvinceChild()}>ثبت متن اصلاح‌شده و ارسال مجدد پاسخ</button>
       </section>}
      <div className={`${styles.metaBar} ${styles.mainCaseBar}`}>
        <span className={styles.mainCaseBadge}>پرونده اصلی</span>
        <span><b>فرستنده:</b> {readable(identity?.NameSender || "ستاد")}</span>
        <span><b>تاریخ ارجاع:</b> {formatDate(detail.CreatedAtUtc)}</span>
        <span className={styles.metaDescription}><b>توضیحات:</b> {readable(detail.ReferralDescription)}</span>
        <span className={styles.metaState}>{readable(detail.StateTitle) === "—" ? (stateNames[state] || state) : readable(detail.StateTitle)}</span>
        {canStart && <button type="button" className={styles.addButton} onClick={() => void provinceAction("START_PROVINCE")} disabled={busy}>شروع بررسی استان</button>}
        <button type="button" className={styles.yellowButton} onClick={() => {togglePanel("decision");}} disabled={!canWork}>عدم نیاز به تحقیق</button>
        <button type="button" className={styles.greenButton} disabled={!canSummary} title={hasPending ? "ابتدا پاسخ همه ارجاعات و محققان باید دریافت شود." : !canSummary ? "در وضعیت فعلی امکان جمع‌بندی وجود ندارد." : "فرم رسمی جمع‌بندی استان"}
          onClick={() => {setOpenPanels(prev => ({...prev, summary:true}));}}>جمع‌بندی پرونده</button>
      </div>
      {openPanels.decision && <section className={styles.compactBox}>
        <strong>تصمیم کارشناسی استان</strong>
        {hasPending && <div className={styles.warning}>قبل از تصمیم نهایی باید همه ارجاعات و تحقیقات باز تعیین‌تکلیف شوند.</div>}
        <textarea className={styles.field} rows={3} maxLength={6000} disabled={!canWork} value={description}
          onChange={e => setDescription(e.target.value)} placeholder="توضیحات یا علت عدم نیاز به تحقیق را وارد کنید…"/>
        <div className={styles.actions}>
          <button className={styles.yellowButton} type="button" disabled={!canNoResearch || !description.trim()} onClick={() => void provinceAction("NO_RESEARCH")}>ثبت عدم نیاز و ارسال به رئیس دفتر</button>
          <button className={styles.outlineButton} type="button" onClick={() => togglePanel("decision")}>بستن</button>
        </div>
      </section>}
      {renderDelegations("HOZE")}
      {renderDelegations("OSTAN")}
      <section className={`${styles.referralPanel} ${styles.investigatorPanel}`}>
        <div className={styles.panelHeading}>
          <button type="button" className={styles.panelTitle} onClick={() => togglePanel("INVESTIGATOR")} aria-expanded={Boolean(openPanels.INVESTIGATOR)}>
            <span className={styles.chevron}>{openPanels.INVESTIGATOR ? "▾" : "▸"}</span>
            <strong>ارجاع به محقق ویژه استان</strong>
            <span className={styles.countGray} title="تعداد محققان ارجاع‌شده">{assignments.length.toLocaleString("fa-IR")}</span>
            <span className={styles.countGreen} title="تحقیقات انجام‌شده">{assignments.filter(r => r.StatusCode === "DONE").length.toLocaleString("fa-IR")}</span>
          </button>
          <button className={styles.addButton} type="button" disabled={!canAssign} onClick={() => openForm("INVESTIGATOR")}>⊕ ارجاع به محقق ویژه استان</button>
        </div>
        {openPanels.INVESTIGATOR && <div className={styles.panelBody}>
          {assignmentError && <p role="alert" className={styles.error}>خطا در پیگیری محققان پرونده: {assignmentError}</p>}
          {assignments.length === 0 ? <p className={styles.hint}>محققی به این پرونده ارجاع نشده است.</p> : <div className={`${styles.childList} ${styles.investigatorList}`}>
            {assignments.map((row,i) => <article className={`${styles.childCard} ${styles.investigatorCard}`} key={readable(row.AssignmentId)}>
              <span className={styles.childIndex}>{(i+1).toLocaleString("fa-IR")}</span>
              <div className={styles.childContent}>
                <div className={styles.childTitleRow}>
                  <strong>{readable(row.FullName || candidates.find(c => Number(c.InvestigatorKey) === Number(row.InvestigatorKey))?.FullName || row.InvestigatorKey)}</strong>
                  {row.StatusCode !== "IN_PROGRESS" && <span className={`${styles.childStatus} ${row.StatusCode === "DONE" ? styles.statusReceived : styles.statusWaiting}`}>{row.StatusCode === "DONE" ? "تکمیل‌شده" : readable(row.StatusCode)}</span>}
                </div>
                <div className={styles.childMeta}>
                  <span>کاربرگ‌ها: {readable(row.WorksheetCount)}</span>
                  <span>شناسه انتساب: {readable(row.AssignmentId)}</span>
                  <button type="button" className={styles.linkButton}
                    onClick={() => setWorksheetAssignmentId(prev => prev===asNum(row.AssignmentId) ? null:asNum(row.AssignmentId))}>
                    {worksheetAssignmentId===asNum(row.AssignmentId) ? "بستن کاربرگ‌ها" : "کاربرگ تحقیق"}
                  </button>
                  {["PENDING","IN_PROGRESS"].includes(String(row.StatusCode)) && canAssign ?
                    <button type="button" className={styles.linkButton} onClick={() => { setCancelAssignmentId(asNum(row.AssignmentId));setCancelReason(""); }}>بازپس‌گیری محقق</button> : null}
                </div>
              </div>
              {worksheetAssignmentId===asNum(row.AssignmentId) && <div className={styles.worksheetHolder}>
                <ProvinceInvestigatorWorksheetEditor
                  assignmentId={asNum(row.AssignmentId)}
                  investigatorName={String(row.FullName || row.InvestigatorKey || "محقق استان")}
                  assignmentStatus={String(row.StatusCode ?? "")}
                  onSaved={refreshAfterInvestigatorSaved}/>
              </div>}
            </article>)}
          </div>}
          {cancelAssignmentId !== null && <div className={styles.cancelBox}>
            <strong>بازپس‌گیری محقق</strong>
            <textarea className={styles.field} rows={2} maxLength={2000} disabled={busy} value={cancelReason} placeholder="دلیل بازپس‌گیری را وارد کنید" onChange={e => setCancelReason(e.target.value)}/>
            <div className={styles.actions}><button className={styles.primary} disabled={busy || !cancelReason.trim()} type="button" onClick={() => void cancelAssignment()}>تأیید بازپس‌گیری</button>
              <button type="button" className={styles.outlineButton} onClick={() => setCancelAssignmentId(null)}>انصراف</button></div>
          </div>}
        </div>}
      </section>
      {/* The expert's case page has no standalone province-summary panel at the bottom.
          Keep the existing summary actions in a compact dialog opened from the top bar. */}
      {openPanels.summary && <div className={styles.modalOverlay} role="presentation"
        onMouseDown={e => { if (e.target === e.currentTarget && !busy) setOpenPanels(prev => ({...prev, summary:false})); }}>
        <div className={`${styles.modal} ${styles.summaryDialog}`} role="dialog" aria-modal="true" aria-labelledby="province-summary-dialog-title">
          <header className={styles.modalHeader}>
            <h2 id="province-summary-dialog-title">جمع‌بندی پرونده استان</h2>
            <button type="button" aria-label="بستن جمع‌بندی" disabled={busy} onClick={() => setOpenPanels(prev => ({...prev, summary:false}))}>×</button>
          </header>
          <div className={styles.modalBody}>
            {summaryTargetError && <p role="alert" className={styles.error}>خطای دریافت مجوز پیوست‌ها: {summaryTargetError}</p>}
            <ProvinceLegacySummaryForm
              referralId={referralId} identity={identity} assignments={assignments} children={children}
              preparedByName={String(user.FullName || "")}
              preparedByTitle={String(user.OnvanPost || user.OnvanSemat || "")}
              preparedByProvince={String(user.NameMahal || identity?.NameOstan || "")}
              canEdit={canSummary} summaryId={summaryId} attachmentReadOnly={summaryReadOnly}
              onSaved={async (finalized) => {setHasOfficialSummary(finalized);await refreshDetail();await refreshSummaryTarget();}}
              canSendToDirector={isDirectorSendReady}
              sendingToDirector={busy}
              onSendToDirector={() => void provinceAction("SUBMIT_DIRECTOR")} />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.outlineButton} disabled={busy}
              onClick={() => setOpenPanels(prev => ({...prev,summary:false}))}>بستن</button>
          </div>
        </div>
      </div>}
      {openPanels.tracking && <section className={styles.compactBox}>
        <div className={styles.rowHeading}><strong>پیگیری کل ارجاعات</strong><button type="button" className={styles.outlineButton} onClick={() => void refreshTracking().catch(e => setError(String(e)))}>بازخوانی</button></div>
        <p className={styles.hint}>ارجاعات باز: {readable(detail.PendingChildReferrals)} | تحقیقات ناتمام: {readable(detail.PendingAssignments)} | آخرین اقدام: {readable(detail.LastActionCode)}</p>
        <div className={styles.actions}><button type="button" className={styles.outlineButton} onClick={() => togglePanel("tracking")}>بستن</button></div>
      </section>}
      {readonlyChildId !== null && <ProvinceChildDossierReadonly
        parentReferralId={referralId} childReferralId={readonlyChildId}
        onClose={() => setReadonlyChildId(null)} />}
      {form && <div className={styles.modalOverlay} role="presentation" onMouseDown={e => {if(e.target === e.currentTarget && !busy) closeForm();}}>
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="افزودن ارجاع جدید">
          <header className={styles.modalHeader}><h2>افزودن ارجاع جدید</h2><button aria-label="بستن" type="button" onClick={closeForm} disabled={busy}>×</button></header>
          {error && <div role="alert" className={styles.error}>{error}</div>}
          {form !== "INVESTIGATOR" ? <>
            <div className={styles.modalBody}>
              <label className={styles.label}> {form === "HOZE" ? "شهرستان حوزه اصلی" : "استان"}</label>
              <SearchableDropdown<string>
                value={destination || null}
                onChange={setDestination}
                options={destinationOptions}
                placeholder="انتخاب مقصد…"
                searchPlaceholder="جست‌وجوی نام مقصد…"
                ariaLabel={form === "HOZE" ? "انتخاب حوزه انتخابیه" : "انتخاب استان"}
                emptyText={form === "HOZE" ? "حوزه انتخابیه مجاز برای ارجاع یافت نشد." : "استان مجاز برای ارجاع یافت نشد."}
                noResultText="مقصدی با این نام یافت نشد."
                disabled={!canDelegate || Boolean(pickerError)}
                loading={pickerLoading}
                loadingText="در حال دریافت مقصدها…"
                compact
                containInDialog
                menuMaxHeight={240}
              />
              {pickerError && <div role="alert" className={styles.pickerError}>
                <span>{pickerError}</span>
                <button type="button" onClick={() => void loadPickerOptions(form === "HOZE" ? "HOZE" : "OSTAN")}>تلاش مجدد</button>
              </div>}
              <label htmlFor="delegate-reason" className={styles.label}>توضیحات ارجاع پرونده</label>
              <textarea id="delegate-reason" className={styles.field} rows={4} maxLength={6000} value={delegateReason} onChange={e => setDelegateReason(e.target.value)} placeholder="درخواست تحقیق و دلیل ارجاع…" disabled={!canDelegate}/>
            </div>
            <div className={styles.modalActions}><button className={styles.primary} type="button" disabled={!canDelegate || !destination || !delegateReason.trim() || busy} onClick={() => void delegate()}>تأیید</button>
              <button type="button" className={styles.cancelButton} disabled={busy} onClick={closeForm}>انصراف</button></div>
          </> : <>
            <div className={styles.modalBody}>
              <label className={styles.label}>محقق</label>
              <SearchableDropdown<string>
                value={investigatorKey || null}
                onChange={setInvestigatorKey}
                options={investigatorOptions}
                placeholder="انتخاب محقق ویژه استان…"
                searchPlaceholder="جست‌وجوی نام محقق…"
                ariaLabel="انتخاب محقق ویژه استان"
                emptyText="برای این پرونده محقق واجد شرایطی یافت نشد."
                noResultText="محققی با این نام یافت نشد."
                disabled={!canAssign || Boolean(pickerError)}
                loading={pickerLoading}
                loadingText="در حال دریافت محققان…"
                compact
                containInDialog
                menuMaxHeight={240}
              />
              {pickerError && <div role="alert" className={styles.pickerError}>
                <span>{pickerError}</span>
                <button type="button" onClick={() => void loadPickerOptions("INVESTIGATOR")}>تلاش مجدد</button>
              </div>}
              <label className={styles.label}>مهلت انجام (شمسی)</label>
              <div className={styles.dateBox}><InputPersianDate value={dueDate || null} onChange={v => setDueDate(v || "")} allowPastDates={false}/></div>
              <label className={styles.label} htmlFor="investigator-instruction">توضیحات ارجاع پرونده</label>
              <textarea id="investigator-instruction" className={`${styles.field} ${styles.modalTextarea}`} rows={3} maxLength={6000} value={investigatorReason} onChange={e => setInvestigatorReason(e.target.value)} disabled={!canAssign}/>
            </div>
            <div className={styles.modalActions}><button className={styles.primary} type="button" disabled={!canAssign || !investigatorKey || !investigatorReason.trim() || busy} onClick={() => void assign()}>تأیید</button>
              <button className={styles.cancelButton} type="button" disabled={busy} onClick={closeForm}>انصراف</button></div>
          </>}
        </div>
      </div>}
    </>}
  </main>;
}

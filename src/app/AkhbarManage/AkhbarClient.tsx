"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  History,
  Hand,
  Inbox,
  Loader2,
  MoreHorizontal,
  Newspaper,
  Bell,
  Clock3,
  Settings2,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Upload,
  UserPlus,
  UsersRound,
  ZoomIn,
  X,
} from "lucide-react";
import Dropdown from "@/component/Dropdown";
import NewsJalaliDatePicker from "./NewsJalaliDatePicker";
import NewsZoomPanImage from "./NewsZoomPanImage";
import { isFutureNewsDate } from "@/lib/newsPhase13Validation";
import { showToast } from "@/component/CustomToast";
import { useMeratUser } from "@/lib/useMeratUser";
import {
  DeleteKhabar,
  DeleteKhabarPeyvast,
  DeleteKhabarShakhs,
  GetAkhbarLookups,
  GetKhabar,
  GetKhabarAshkhas,
  GetKhabarCounts,
  GetKhabarGardesh,
  GetKhabarList,
  GetKhabarPeyvastUrl,
  GetKhabarPeyvastha,
  GetNextKhabarDestination,
  GetReturnKhabarRecipient,
  InsertKhabar,
  InsertKhabarShakhs,
  InsertNoghteKhabarkhiz,
  ReturnKhabar,
  SearchAkhbarAshkhas,
  SendKhabar,
  UpdateKhabar,
  UploadKhabarPeyvast,
} from "@/services/ApiServiceAkhbar";
import styles from "./AkhbarManage.module.css";

type BoxType = 1 | 2 | 3 | 4 | 5;
type WizardStep = 1 | 2 | 3 | 4;
type ModalMode = "edit" | "view" | "resolve";
// Local recovery snapshots are keyed by the *server-assigned* news number.
// The list of drafts comes from SQL, not from browser storage.
type DraftSnapshot = { form: FormState; step: WizardStep; savedAt: string; savedAtMs: number };
type LookupRow = Record<string, unknown>;

type FormState = {
  shomareKhabar: number;
  tabaqehBandi: number;
  manbaKhabarId: number;
  noeKhabar: number;
  tarikhNameh: string;
  shomareNameh: string;
  onvanKhabar: string;
  sharhKhabar: string;
  molahazatKhabar: string;
  noghteKhabarkhizId: number;
  mahalNoghteKhabarkhiz: string;
  tarikhEnteshar: string;
};

type NewsRow = {
  ShomareKhabar: number;
  OnvanKhabar?: string;
  CurrentStatusCode?: string;
  CurrentStatusName?: string;
  CurrentPostId?: number;
  CreatePostId?: number;
  CurrentUserId?: number;
  CurrentMahal?: number;
  CurrentMahalName?: string;
  CurrentPostName?: string;
  StatusDateTime?: string;
  CreateDateTime?: string;
  LastEditDateTime?: string;
  NoeKhabarName?: string;
  ManbaKhabarName?: string;
  IsOwner?: boolean | number;
  IsInbox?: boolean | number;
  CanEdit?: boolean | number;
  CanReturn?: boolean | number;
  TotalCount?: number;
};

type OverdueAlert = { AlertId:number; ShomareKhabar:number; OnvanKhabar:string; RecipientType:"OWNER"|"MANAGER";
  OrgLevel:number; ThresholdHours:number; AgeMinutes:number|null; SeenAtUtc:string|null; AcknowledgedAtUtc:string|null };

type KhabarShakhs = {
  KhabarShakhsId: number;
  ShomarehParvandeh: number;
  IsManual?: boolean;
  PersonCreatorUserId?: number;
  FirstName?: string;
  LastName?: string;
  NamePedar?: string;
  TotalCount?: number;
};

type KhabarPeyvast = {
  KhabarPeyvastId: number;
  ShomareKhabar: number;
  FileName: string;
  OriginalFileName?: string;
  FileSize?: number;
  CreateDateTime?: string;
};

type GardeshLog = {
  LogId: number;
  NoeEghdam: string;
  ActionCode?: string;
  Tozihat?: string;
  EshkalatIds?: string;
  CreateDateTime?: string;
  FromUserName?: string;
  FromPostName?: string;
  FromMahalName?: string;
  ToUserName?: string;
  ToPostName?: string;
  ToMahalName?: string;
};

const emptyForm: FormState = {
  shomareKhabar: 0,
  tabaqehBandi: 1,
  manbaKhabarId: 0,
  noeKhabar: 1,
  tarikhNameh: "",
  shomareNameh: "",
  onvanKhabar: "",
  sharhKhabar: "",
  molahazatKhabar: "",
  noghteKhabarkhizId: 0,
  mahalNoghteKhabarkhiz: "",
  tarikhEnteshar: "",
};

const steps: Array<{ id: WizardStep; title: string; sub: string; icon: typeof FileText }> = [
  { id: 1, title: "مشخصات خبر", sub: "اطلاعات پایه و محتوای خبر", icon: FileText },
  { id: 2, title: "افراد وابسته", sub: "اشخاص مرتبط با خبر", icon: UsersRound },
  { id: 3, title: "اسناد وابسته", sub: "تصویر، ویدئو و صوت", icon: FileImage },
  { id: 4, title: "مرور و ارسال", sub: "کنترل نهایی و گردش خبر", icon: Send },
];

/** Persian numerals are presentation-only; API identifiers remain numeric. */
function faDigits(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/[0-9٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const index = code >= 0x660 && code <= 0x669 ? code - 0x660 : code - 48;
    return "۰۱۲۳۴۵۶۷۸۹"[index];
  });
}

function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

/** The recipient user stays in routing, but headquarters is named by office in UI. */
function isSetadNewsDestination(destination: { ToMahal?: number | string; ToNameMahal?: string } | null | undefined): boolean {
  return num(destination?.ToMahal) === 1 || String(destination?.ToNameMahal || "").trim() === "ستاد";
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function extKind(fileName: string) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
  if (ext === "mp3") return "audio";
  return "other";
}

function fullName(person: KhabarShakhs) {
  return [person.FirstName, person.LastName].filter(Boolean).join(" ") || `پرونده ${faDigits(person.ShomarehParvandeh)}`;
}

function formatSize(kb?: number) {
  const n = Number(kb || 0);
  if (n >= 1024) return `${faDigits((n / 1024).toFixed(1))} MB`;
  return `${faDigits(n)} KB`;
}

function toOptions(rows: LookupRow[], mode: "id" | "value" = "value") {
  return (rows || []).map((row) => ({
    value: mode === "id" ? num(row.ID ?? row.ManbaKhabarId ?? row.NoghteKhabarkhizId) : num(row.Value ?? row.ID),
    label: String(row.NameFarsi ?? row.Onvan ?? row.Name ?? "—"),
  })).filter((x) => x.value > 0);
}

function statusTone(code?: string) {
  if (code === "PISHNEVIS") return styles.statusDraft;
  if (String(code || "").startsWith("BARGASHT_")) return styles.statusReturned;
  if (code === "TAEED_NAHAEI_SETAD" || code === "TAEED_NAHAEI_HOZE") return styles.statusDone;
  return styles.statusInbox;
}

function statusLabel(code?: string, serverName?: string) {
  if (serverName && serverName !== "در حال گردش") return serverName;
  switch (String(code || "")) {
    case "PISHNEVIS": return "پیش‌نویس";
    case "KARTABL_SETAD_KARSHENAS": return "در کارتابل کارشناس اخبار ستاد";
    case "TAEED_NAHAEI_SETAD": return "تأیید نهایی در ستاد";
    case "TAEED_NAHAEI_HOZE": return "نهایی‌شده در حوزه انتخابیه اصلی";
    case "BARGASHT_SETAD": return "برگشت شده در ستاد";
    default:
      if (String(code || "").startsWith("BARGASHT_")) return "برگشت شده برای اصلاح";
      if (String(code || "").startsWith("KARTABL_")) return "در کارتابل";
      return serverName || "در حال گردش";
  }
}

function newNewsActionKey() {
  // getRandomValues is available even on internal-network HTTP deployments,
  // where crypto.randomUUID may not be exposed because the origin is insecure.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function currentTimeLabel(row: NewsRow) {
  return row.StatusDateTime || row.LastEditDateTime || row.CreateDateTime || "—";
}

export default function AkhbarClient() {
  const user = useMeratUser();
  const userId = num(user.UserId);
  const isCountyRepresentative = num(user.PostId) === 70;
  const isMainHozeOfficer = [60,61].includes(num(user.PostId));
  const localDraftKey = `merat-akhbar-local-draft-${userId || "guest"}`;
  const [boxType, setBoxType] = useState<BoxType>(1);
  const [counts, setCounts] = useState({ KartablCount: 0, SentCount: 0, ReturnedCount: 0, ScopeCount: 0, DraftCount: 0 });
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingNews,setClaimingNews] = useState<number|null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [setadSettings, setSetadSettings] = useState<{admin:boolean;canHandle:boolean;allProvinces:boolean;provinces:number[];postId:number}|null>(null);
  const [provinceOptions,setProvinceOptions]=useState<Array<{ProvinceId:number;Name:string}>>([]);
  const [filterProvince,setFilterProvince]=useState(0);
  const [filterStatus,setFilterStatus]=useState("");
  const [filterDateFrom,setFilterDateFrom]=useState("");
  const [filterDateTo,setFilterDateTo]=useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [alerts, setAlerts] = useState<OverdueAlert[]>([]);
  const [alertUnread, setAlertUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement|null>(null);
  const [notificationSaving, setNotificationSaving] = useState<number|null>(null);
  const [inboxMenuOpen, setInboxMenuOpen] = useState(false);
  const inboxMenuRef = useRef<HTMLDivElement | null>(null);
  const inboxTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [sources, setSources] = useState<LookupRow[]>([]);
  const [hotspots, setHotspots] = useState<LookupRow[]>([]);
  const [classifications, setClassifications] = useState<LookupRow[]>([]);
  const [types, setTypes] = useState<LookupRow[]>([]);
  const [returnTags, setReturnTags] = useState<LookupRow[]>([]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<ModalMode>("edit");
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [personSearch, setPersonSearch] = useState("");
  const [personSearchDebounced, setPersonSearchDebounced] = useState("");
  const [personRows, setPersonRows] = useState<KhabarShakhs[]>([]);
  const [linkedPersons, setLinkedPersons] = useState<KhabarShakhs[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [personSearchError, setPersonSearchError] = useState("");
  const [personSearchRetry, setPersonSearchRetry] = useState(0);
  const [personAction, setPersonAction] = useState<number | null>(null);
  const [manualPersonName, setManualPersonName] = useState("");
  const [manualPersonFather, setManualPersonFather] = useState("");
  const [manualEditingId, setManualEditingId] = useState<number | null>(null);

  const [attachments, setAttachments] = useState<KhabarPeyvast[]>([]);
  const [activeAttachment, setActiveAttachment] = useState<number | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentAction, setAttachmentAction] = useState<number | null>(null);
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreviewSource, setAttachmentPreviewSource] = useState<"wizard" | "decision">("wizard");
  const [decisionActiveAttachment, setDecisionActiveAttachment] = useState<number | null>(null);
  // Independent read-only preview for inbox actions (approval / return).
  // This must not overwrite the open wizard's form or attachment state.
  const [decisionNewsNo, setDecisionNewsNo] = useState(0);
  const [decisionDetail, setDecisionDetail] = useState<Record<string, unknown> | null>(null);
  const [decisionAttachments, setDecisionAttachments] = useState<KhabarPeyvast[]>([]);
  const [decisionPersons, setDecisionPersons] = useState<KhabarShakhs[]>([]);
  const [decisionPreviewLoading, setDecisionPreviewLoading] = useState(false);
  const [decisionPreviewError, setDecisionPreviewError] = useState("");
  const decisionRequestRef = useRef(0);

  const [latestDraft, setLatestDraft] = useState<NewsRow | null>(null);
  const [hotspotModal, setHotspotModal] = useState(false);
  const [hotspotTitle, setHotspotTitle] = useState("");
  const [hotspotSaving, setHotspotSaving] = useState(false);

  const [sendModal, setSendModal] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const sendInFlightRef = useRef(false);
  const returnInFlightRef = useRef(false);
  const sentNewsRef = useRef<number>(0);
  const sendRequestKeyRef = useRef<string>("");
  const [sendDestination, setSendDestination] = useState<any>(null);
  const [sendDescription, setSendDescription] = useState("");

  const [returnModal, setReturnModal] = useState(false);
  const [returnRecipient, setReturnRecipient] = useState<{ToUserId:number;ToFullName:string;ToOnvanPost:string;ToNameMahal:string;PreviousReturnReason?:string|null}|null>(null);
  const [returnRecipientLoading, setReturnRecipientLoading] = useState(false);
  const [returnRecipientError, setReturnRecipientError] = useState("");
  const returnRecipientRequestRef = useRef(0);
  const [returnSaving, setReturnSaving] = useState(false);
  const [selectedReturnTags, setSelectedReturnTags] = useState<number[]>([]);
  const [returnDescription, setReturnDescription] = useState("");
  const [returnReasonError, setReturnReasonError] = useState(false);
  const returnReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const sendConfirmationPendingRef = useRef(false);
  const returnConfirmationPendingRef = useRef(false);

  const [workflowModal, setWorkflowModal] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowSummary, setWorkflowSummary] = useState<any>(null);
  const [workflowLogs, setWorkflowLogs] = useState<GardeshLog[]>([]);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; row: NewsRow | null }>({ open: false, row: null });
  const [deleteSaving, setDeleteSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      // The shared Dropdown renders its list in a portal (outside filterMenuRef).
      // Interacting with its search box or province options must not close the filters.
      const isPortaledFilterControl = target instanceof Element && Boolean(
        target.closest('[role="listbox"][aria-label="انتخاب استان برای فیلتر اخبار"], [data-news-date-popup="true"]')
      );
      if (filterMenuRef.current && !filterMenuRef.current.contains(target as Node) && !isPortaledFilterControl) {
        setFilterMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    if (!notificationOpen) return;
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !notificationRef.current?.contains(e.target)) setNotificationOpen(false);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setNotificationOpen(false); };
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return () => {document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  }, [notificationOpen]);

  useEffect(() => {
    if (!inboxMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !inboxMenuRef.current?.contains(event.target)) {
        setInboxMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInboxMenuOpen(false);
        inboxTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [inboxMenuOpen]);

  useEffect(() => {
    const t = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 450);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setPersonSearchDebounced(personSearch.trim()), 400);
    return () => window.clearTimeout(t);
  }, [personSearch]);

  // Version 2 stores all unsent news snapshots separately, preventing one
  // draft from overwriting another. Old single-draft storage is migrated on read.
  const readDraftSnapshots = useCallback((): DraftSnapshot[] => {
    try {
      const parsed = JSON.parse(localStorage.getItem(localDraftKey) || "null");
      const values: unknown[] = Array.isArray(parsed?.items) ? parsed.items : parsed?.form ? [parsed] : [];
      return values.filter((item): item is DraftSnapshot => {
        const candidate = item as DraftSnapshot | null;
        return !!candidate?.form && num(candidate.form.shomareKhabar) > 0;
      });
    } catch { return []; }
  }, [localDraftKey]);

  const getDraftSnapshot = useCallback((newsNo: number): DraftSnapshot | undefined =>
    readDraftSnapshots().find((item) => num(item.form.shomareKhabar) === newsNo), [readDraftSnapshots]);

  const clearLocalDraft = useCallback((newsNo: number) => {
    if (!newsNo) return; // Never clear other news when removing one backup.
    try {
      const snapshots = readDraftSnapshots().filter((item) => num(item.form.shomareKhabar) !== newsNo);
      if (snapshots.length) localStorage.setItem(localDraftKey, JSON.stringify({ version: 2, items: snapshots }));
      else localStorage.removeItem(localDraftKey);
    } catch { /* Browser storage can be disabled. Server drafts are unaffected. */ }
  }, [localDraftKey, readDraftSnapshots]);

  useEffect(() => {
    if (!userId) return;
    let active=true;
    void fetch("/Api/Akhbar/SetadPermissions",{cache:"no-store"}).then(async r=>{
      if(!r.ok) return null;return r.json();
    }).then(data=>{if(active&&data)setSetadSettings({admin:Boolean(data.admin),canHandle:Boolean(data.canHandle),allProvinces:Boolean(data.allProvinces),postId:Number(data.postId||0),provinces:(data.provinces||[]).map(Number)})}).catch(()=>{});
    return ()=>{active=false};
  },[userId]);
  useEffect(()=>{
    if(!setadSettings)return;
    const url="/Api/Akhbar/SetadProvinceOptions";
    void fetch(url,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(d)setProvinceOptions(d.provinces||[])}).catch(()=>{});
  },[setadSettings]);


  useEffect(() => {
    // A returned or previously sent news item is never backed up as a draft.
    // Drafts stay independent even when multiple news items are open in turn.
    if (!wizardOpen || wizardMode !== "edit" || !userId || !form.shomareKhabar ||
        sentNewsRef.current === form.shomareKhabar ||
        (detail && String(detail.CurrentStatusCode || "") !== "PISHNEVIS")) return;
    const t = window.setTimeout(() => {
      if (sentNewsRef.current === form.shomareKhabar) return;
      try {
        const now = Date.now();
        const payload: DraftSnapshot = { form, step, savedAt: new Date(now).toLocaleString("fa-IR"), savedAtMs: now };
        const other = readDraftSnapshots().filter((item) => num(item.form.shomareKhabar) !== form.shomareKhabar);
        localStorage.setItem(localDraftKey, JSON.stringify({ version: 2, items: [...other, payload] }));
      } catch { /* Server copy remains the canonical draft. */ }
    }, 350);
    return () => window.clearTimeout(t);
  }, [form, step, wizardOpen, wizardMode, userId, localDraftKey, detail, readDraftSnapshots]);

  const loadLookups = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await GetAkhbarLookups(userId);
      setSources(r.sources || []);
      setHotspots(r.hotspots || []);
      setClassifications(r.classifications || []);
      setTypes(r.types || []);
      setReturnTags(r.returnTags || []);
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در دریافت اطلاعات پایه اخبار"); }
  }, [userId]);

  const loadAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await fetch("/Api/Akhbar/OverdueNotifications", { cache:"no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error||"دریافت هشدارها انجام نشد.");
      setAlerts(data.items||[]);
      setAlertUnread(num(data.summary?.UnreadCount));
    } catch { /* Alerts must not block the main news inbox if SQL is not deployed yet. */ }
  }, [userId]);

  const markAlert = useCallback(async (alertId:number,action:"SEEN"|"ACK") => {
    if (notificationSaving!==null) return;
    setNotificationSaving(alertId);
    try {
      const r=await fetch("/Api/Akhbar/OverdueNotifications",{method:"POST",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({alertId,action})});
      if(!r.ok)throw new Error("اقدام ثبت نشد.");
      await loadAlerts();
    } catch { showToast.error("ثبت مشاهده یا تأیید اعلان ممکن نشد."); }
    finally { setNotificationSaving(null); }
  },[notificationSaving,loadAlerts]);

  const loadCounts = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await GetKhabarCounts(userId);
      setCounts({
        KartablCount: num(r?.data?.KartablCount),
        SentCount: num(r?.data?.SentCount),
        ReturnedCount: num(r?.data?.ReturnedCount),
        ScopeCount: num(r?.data?.ScopeCount),
        DraftCount: num(r?.data?.DraftCount),
      });
    } catch { setCounts({ KartablCount: 0, SentCount: 0, ReturnedCount: 0, ScopeCount: 0, DraftCount: 0 }); }
  }, [userId]);

  // Always take the banner from the most recently edited *server* draft.
  // This works across browsers/devices and does not duplicate returned news.
  const loadLatestDraft = useCallback(async () => {
    if (!userId) { setLatestDraft(null); return; }
    try {
      const response = await GetKhabarList(userId, 1, 1, 5, 2, "", 5);
      const item = (response.data || []).find((row: NewsRow) => row.CurrentStatusCode === "PISHNEVIS" && bool(row.IsOwner));
      setLatestDraft(item || null);
    } catch { setLatestDraft(null); }
  }, [userId]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === localDraftKey) void loadLatestDraft();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [localDraftKey, loadLatestDraft]);

  const loadRows = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await GetKhabarList(userId, page, pageSize, 1, 2, debouncedSearch, boxType,
        setadSettings ? {filterProvince,filterStatus,dateFrom:filterDateFrom,dateTo:filterDateTo}:{});
      const data = (r.data || []) as NewsRow[];
      setRows(data);
      setTotal(num(data[0]?.TotalCount));
    } catch (e) {
      setRows([]); setTotal(0);
      showToast.error(e instanceof Error ? e.message : "خطا در دریافت اخبار");
    } finally { setLoading(false); }
  }, [userId, page, pageSize, debouncedSearch, boxType, setadSettings, filterProvince, filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => { void loadLookups(); }, [loadLookups]);
  useEffect(() => { void loadRows(); }, [loadRows]);
  useEffect(() => { void loadCounts(); }, [loadCounts]);
  useEffect(() => { void loadLatestDraft(); }, [loadLatestDraft]);
  useEffect(() => { void loadAlerts(); }, [loadAlerts]);

  const refreshAll = useCallback(async () => { await Promise.all([loadRows(), loadCounts(), loadLatestDraft(), loadLookups(), loadAlerts()]); }, [loadRows, loadCounts, loadLatestDraft, loadLookups, loadAlerts]);

  const loadPersons = useCallback(async (newsNo = form.shomareKhabar) => {
    if (!userId || !newsNo) return setLinkedPersons([]);
    try { const r = await GetKhabarAshkhas(newsNo, userId); setLinkedPersons(r.data || []); }
    catch { setLinkedPersons([]); }
  }, [form.shomareKhabar, userId]);

  const loadAttachments = useCallback(async (newsNo = form.shomareKhabar) => {
    if (!userId || !newsNo) { setAttachments([]); setActiveAttachment(null); return; }
    setAttachmentLoading(true);
    try {
      const r = await GetKhabarPeyvastha(newsNo, userId);
      const data = (r.data || []) as KhabarPeyvast[];
      setAttachments(data);
      setActiveAttachment((current) => current && data.some((x) => num(x.KhabarPeyvastId) === current) ? current : num(data[0]?.KhabarPeyvastId) || null);
    } catch { setAttachments([]); setActiveAttachment(null); }
    finally { setAttachmentLoading(false); }
  }, [form.shomareKhabar, userId]);

  useEffect(() => {
    if (!wizardOpen || !form.shomareKhabar) return;
    if (step === 2 || step === 4) void loadPersons();
    if (step === 3 || step === 4) void loadAttachments();
  }, [wizardOpen, step, form.shomareKhabar, loadPersons, loadAttachments]);

  useEffect(() => {
    if (!wizardOpen || step !== 2 || !(["edit", "resolve"] as ModalMode[]).includes(wizardMode) || !userId || !form.shomareKhabar || isCountyRepresentative || personSearchDebounced.length < 2) {
      setPersonRows([]); setPersonSearchError(""); setPersonLoading(false); return;
    }
    let cancelled = false;
    setPersonRows([]);
    setPersonSearchError("");
    setPersonLoading(true);
    SearchAkhbarAshkhas(form.shomareKhabar, userId, personSearchDebounced, 1, 12)
      .then((r) => { if (!cancelled) setPersonRows(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => {
        if (!cancelled) {
          setPersonRows([]);
          setPersonSearchError(e instanceof Error ? e.message : "خطا در دریافت نتایج جستجو");
        }
      })
      .finally(() => { if (!cancelled) setPersonLoading(false); });
    return () => { cancelled = true; };
  }, [wizardOpen, step, wizardMode, userId, form.shomareKhabar, personSearchDebounced, personSearchRetry, isCountyRepresentative]);

  const sourceOptions = useMemo(() => toOptions(sources, "id"), [sources]);
  const hotspotOptions = useMemo(() => [{ value: 0, label: "انتخاب نشده" }, ...toOptions(hotspots, "id")], [hotspots]);
  const classificationOptions = useMemo(() => toOptions(classifications, "value"), [classifications]);
  const typeOptions = useMemo(() => toOptions(types, "value"), [types]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  }

  function validateStep1() {
    const e: Record<string, boolean> = {};
    if (isFutureNewsDate(form.tarikhNameh)) e.tarikhNameh = true;
    if (isFutureNewsDate(form.tarikhEnteshar)) e.tarikhEnteshar = true;
    if (!form.tabaqehBandi) e.tabaqehBandi = true;
    if (!form.manbaKhabarId) e.manbaKhabarId = true;
    if (!form.noeKhabar) e.noeKhabar = true;
    if (!form.onvanKhabar.trim()) e.onvanKhabar = true;
    if (!form.sharhKhabar.trim()) e.sharhKhabar = true;
    if (!form.molahazatKhabar.trim()) e.molahazatKhabar = true;
    if (!form.noghteKhabarkhizId && !form.mahalNoghteKhabarkhiz.trim()) e.mahalNoghteKhabarkhiz = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function hydrateForm(d: any): FormState {
    return {
      shomareKhabar: num(d?.ShomareKhabar), tabaqehBandi: num(d?.TabaqehBandi) || 1,
      manbaKhabarId: num(d?.ManbaKhabarId), noeKhabar: num(d?.NoeKhabar) || 1,
      tarikhNameh: String(d?.TarikhNameh || "").trim(), shomareNameh: String(d?.ShomareNameh || ""),
      onvanKhabar: String(d?.OnvanKhabar || ""), sharhKhabar: String(d?.SharhKhabar || ""),
      molahazatKhabar: String(d?.MolahazatKhabar || ""), noghteKhabarkhizId: num(d?.NoghteKhabarkhizId),
      mahalNoghteKhabarkhiz: String(d?.MahalNoghteKhabarkhiz || ""), tarikhEnteshar: String(d?.TarikhEnteshar || "").trim(),
    };
  }

  function resetWizard() {
    setWizardOpen(false); setWizardMode("edit"); setStep(1); setForm(emptyForm); setDetail(null); setErrors({});
    setPersonSearch(""); setPersonRows([]); setLinkedPersons([]); setAttachments([]); setActiveAttachment(null); setAttachmentPreviewOpen(false);
  }

  function openCreate() {
    sentNewsRef.current = 0;
    sendRequestKeyRef.current = "";
    setWizardMode("edit"); setErrors({}); setDetail(null); setPersonSearch(""); setPersonRows([]); setLinkedPersons([]); setAttachments([]); setActiveAttachment(null); setAttachmentPreviewOpen(false);
    // "ثبت خبر جدید" must always start a new news item; the banner/table
    // continue existing drafts explicitly by their own numbers.
    setForm(emptyForm); setStep(1);
    setWizardOpen(true);
  }

  async function openExisting(row: NewsRow, mode: ModalMode) {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await GetKhabar(row.ShomareKhabar, userId);
      if (!r.data) throw new Error("اطلاعات خبر یافت نشد.");
      const canResolve = isMainHozeOfficer && bool(r.data.CanResolveCountyPersons);
      const permittedMode: ModalMode = mode === "edit" && bool(r.data.CanEdit) ? "edit" : canResolve ? "resolve" : "view";
      if ((mode === "edit" || mode === "resolve") && permittedMode === "view") showToast.warning("این خبر فقط برای مشاهده در اختیار شماست.");
      // Returned/sent news is never an unsent local draft. Clean up stale
      // copies left by older client builds without touching the server record.
      const isUnsentDraft = String(r.data.CurrentStatusCode || "") === "PISHNEVIS" &&
        bool(r.data.IsOwner) && permittedMode === "edit";
      if (!isUnsentDraft) clearLocalDraft(row.ShomareKhabar);
      const backup = isUnsentDraft ? getDraftSnapshot(row.ShomareKhabar) : undefined;
      setDetail(r.data);
      setForm(backup ? { ...hydrateForm(r.data), ...backup.form, shomareKhabar: row.ShomareKhabar } : hydrateForm(r.data));
      setWizardMode(permittedMode);
      setStep(permittedMode === "view" ? 4 : permittedMode === "resolve" ? 2 : backup?.step || 1);
      setErrors({}); setManualPersonName("");setManualPersonFather("");setManualEditingId(null);setPersonSearch(""); setPersonRows([]); setLinkedPersons([]); setAttachments([]); setActiveAttachment(null); setAttachmentPreviewOpen(false); setWizardOpen(true);
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در دریافت خبر"); }
    finally { setLoading(false); }
  }

  async function saveStep1() {
    if (!userId) return;
    if (!validateStep1()) {
      showToast.warning(isFutureNewsDate(form.tarikhNameh) || isFutureNewsDate(form.tarikhEnteshar)
        ? "تاریخ نامه و تاریخ انتشار نمی‌توانند بعد از امروز باشند." : "فیلدهای اجباری را تکمیل کنید.");
      return;
    }
    setSaving(true);
    try {
      let newsNo = form.shomareKhabar;
      const payload = { ...form, noghteKhabarkhizId: form.noghteKhabarkhizId || null };
      if (newsNo) {
        await UpdateKhabar({ ...payload, lastEditUserId: userId });
        showToast.success("مشخصات خبر ذخیره شد.");
      } else {
        const r = await InsertKhabar({ ...payload, createUserId: userId });
        newsNo = num(r?.data?.ShomareKhabar);
        if (!newsNo) throw new Error("شماره خبر پس از ثبت دریافت نشد.");
        setForm((prev) => ({ ...prev, shomareKhabar: newsNo }));
        showToast.success(`خبر به صورت پیش‌نویس با شماره ${newsNo} ذخیره شد.`);
      }
      setStep(2);
      await refreshAll();
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در ذخیره خبر"); }
    finally { setSaving(false); }
  }

  async function addPerson(person: KhabarShakhs) {
    if (!userId || !form.shomareKhabar || !(wizardMode === "edit" || wizardMode === "resolve")) return;
    setPersonAction(person.ShomarehParvandeh);
    try { await InsertKhabarShakhs(form.shomareKhabar, person.ShomarehParvandeh, userId); await loadPersons(); setPersonRows((x) => x.filter((p) => p.ShomarehParvandeh !== person.ShomarehParvandeh)); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در افزودن شخص"); }
    finally { setPersonAction(null); }
  }

  async function removePerson(person: KhabarShakhs) {
    if (!userId || !(wizardMode === "edit" || wizardMode === "resolve")) return;
    // Do not remove another person's official link for a county-origin news
    // item while a main-hozeh officer is editing the news content.
    const countyHozehPersonEdit = isMainHozeOfficer && num(detail?.CreatePostId) === 70 && bool(detail?.CanResolveCountyPersons);
    if ((wizardMode === "resolve" || countyHozehPersonEdit) && num(person.PersonCreatorUserId) !== userId) return;
    setPersonAction(person.KhabarShakhsId);
    try { await DeleteKhabarShakhs(person.KhabarShakhsId, userId); await loadPersons(); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در حذف شخص"); }
    finally { setPersonAction(null); }
  }

  async function saveManualPerson() {
    if (!isCountyRepresentative || !userId || !form.shomareKhabar || personAction !== null) return;
    const name = manualPersonName.replace(/\s+/g," ").trim();
    const father = manualPersonFather.replace(/\s+/g," ").trim();
    if (name.length < 2 || name.length > 200 || father.length > 100) {
      showToast.warning("نام کامل باید بین ۲ تا ۲۰۰ حرف و نام پدر حداکثر ۱۰۰ حرف باشد."); return;
    }
    setPersonAction(-1);
    try {
      const response = await fetch("/Api/Akhbar/ManualPersons", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userId,shomareKhabar:form.shomareKhabar,action:manualEditingId === null ? "add" : "edit",personId:manualEditingId,fullName:name,fatherName:father})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ثبت شخص ناموفق بود.");
      setManualPersonName("");setManualPersonFather("");setManualEditingId(null);
      await loadPersons();showToast.success("اطلاعات شخص ذخیره شد.");
    } catch(e) { showToast.error(e instanceof Error ? e.message : "خطا در ذخیره شخص"); }
    finally { setPersonAction(null); }
  }

  async function removeManualPerson(person: KhabarShakhs) {
    if (!isCountyRepresentative || !userId || personAction !== null) return;
    setPersonAction(person.KhabarShakhsId);
    try {
      const response = await fetch("/Api/Akhbar/ManualPersons", {
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userId,shomareKhabar:form.shomareKhabar,action:"delete",personId:-person.KhabarShakhsId})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "حذف شخص ناموفق بود.");
      if (manualEditingId === -person.KhabarShakhsId) {setManualEditingId(null);setManualPersonName("");setManualPersonFather("");}
      await loadPersons();
    } catch(e) {showToast.error(e instanceof Error ? e.message : "خطا در حذف شخص");}
    finally {setPersonAction(null);}
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || !userId || !form.shomareKhabar) return;
    setAttachmentAction(-1);
    try {
      for (const file of Array.from(files)) await UploadKhabarPeyvast(form.shomareKhabar, userId, file);
      showToast.success("پیوست‌ها ذخیره شدند."); await loadAttachments();
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در ثبت پیوست"); }
    finally { setAttachmentAction(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  async function removeAttachment(item: KhabarPeyvast) {
    if (!userId) return;
    setAttachmentAction(item.KhabarPeyvastId);
    try { await DeleteKhabarPeyvast(item.KhabarPeyvastId, userId); await loadAttachments(); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در حذف پیوست"); }
    finally { setAttachmentAction(null); }
  }

  async function goReview() {
    if (!userId || !form.shomareKhabar) return;
    setSaving(true);
    try {
      const r = await GetKhabar(form.shomareKhabar, userId); setDetail(r.data || null);
      await Promise.all([loadPersons(), loadAttachments()]); setStep(4);
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در دریافت مرور خبر"); }
    finally { setSaving(false); }
  }

  async function addHotspot() {
    if (!userId || !hotspotTitle.trim()) return showToast.warning("عنوان نقطه خبرخیز را وارد کنید.");
    setHotspotSaving(true);
    try {
      const r = await InsertNoghteKhabarkhiz(hotspotTitle.trim(), userId); const id = num(r?.data?.NoghteKhabarkhizId);
      await loadLookups(); if (id) setField("noghteKhabarkhizId", id); setHotspotModal(false); setHotspotTitle(""); showToast.success("نقطه خبرخیز ثبت شد.");
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در ثبت نقطه خبرخیز"); }
    finally { setHotspotSaving(false); }
  }

  async function loadDecisionNews(newsNo: number) {
    if (!userId || !newsNo) return;
    const requestId = ++decisionRequestRef.current;
    setDecisionNewsNo(newsNo);
    setDecisionDetail(null);
    setDecisionAttachments([]);
    setDecisionPersons([]);
    setDecisionActiveAttachment(null);
    setDecisionPreviewError("");
    setDecisionPreviewLoading(true);
    // Fetch all sections independently: one failed attachment must not hide the news text.
    const results = await Promise.allSettled([
      GetKhabar(newsNo, userId),
      GetKhabarPeyvastha(newsNo, userId),
      GetKhabarAshkhas(newsNo, userId),
    ]);
    if (decisionRequestRef.current !== requestId) return;
    const [newsResult, filesResult, peopleResult] = results;
    if (newsResult.status === "fulfilled") {
      setDecisionDetail((newsResult.value.data || null) as Record<string, unknown> | null);
    }
    if (filesResult.status === "fulfilled") {
      const items = (filesResult.value.data || []) as KhabarPeyvast[];
      setDecisionAttachments(items);
      setDecisionActiveAttachment(num(items[0]?.KhabarPeyvastId) || null);
    }
    if (peopleResult.status === "fulfilled") setDecisionPersons((peopleResult.value.data || []) as KhabarShakhs[]);
    if (newsResult.status === "rejected" || filesResult.status === "rejected" || peopleResult.status === "rejected") {
      setDecisionPreviewError("دریافت بخشی از اطلاعات خبر یا پیوست‌ها انجام نشد. برای نمایش کامل دوباره تلاش کنید.");
    }
    setDecisionPreviewLoading(false);
  }

  async function prepareSend(rowOrCurrent?: NewsRow) {
    const newsNo = rowOrCurrent?.ShomareKhabar || form.shomareKhabar;
    if (!userId || !newsNo) return;
    setSendLoading(true);
    try {
      const r = await GetNextKhabarDestination(newsNo, userId);
      if (!r.data) throw new Error("گیرنده فعال بعدی مشخص نشد.");
      const people = await GetKhabarAshkhas(newsNo, userId);
      if (!Array.isArray(people.data) || people.data.length === 0) {
        throw new Error("ارسال خبر بدون ثبت حداقل یک شخص وابسته مجاز نیست. ابتدا در مرحله افراد وابسته شخصی اضافه کنید.");
      }
      // A stable identifier protects this confirmation against network retries.
      sendRequestKeyRef.current = newNewsActionKey();
      setForm((prev) => ({ ...prev, shomareKhabar: newsNo })); setSendDestination(r.data); setSendDescription(""); setSendModal(true); void loadDecisionNews(newsNo);
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در تعیین گیرنده بعدی"); }
    finally { setSendLoading(false); }
  }

  async function confirmSend() {
    if (!userId || !form.shomareKhabar || !sendDestination || sendInFlightRef.current || sendConfirmationPendingRef.current) return;
    if (sendDescription.length > 50000) {
      showToast.warning("توضیحات ارسال حداکثر ۵۰٬۰۰۰ نویسه می‌تواند باشد.");
      return;
    }
    // Do not execute the API call until the user explicitly accepts the Merat custom confirm.
    sendConfirmationPendingRef.current = true;
    let accepted = false;
    try {
      const destination = sendDestination.IsFinal
        ? "ثبت تأیید نهایی خبر"
        : isSetadNewsDestination(sendDestination)
          ? "ارسال خبر به ستاد"
          : `ارسال خبر به ${sendDestination.ToFullName || "گیرنده بعدی"}`;
      accepted = await meratConfirm(
        `آیا از ثبت اعلام نظر خود برای خبر شماره ${faDigits(form.shomareKhabar)} و ${destination} اطمینان دارید؟`,
        { title: "تأیید اعلام نظر", type: "success", confirmText: "بله، تأیید و ثبت شود", cancelText: "انصراف" },
      );
    } finally {
      sendConfirmationPendingRef.current = false;
    }
    if (!accepted) return;
    sendInFlightRef.current = true;
    setSendLoading(true);
    try {
      const sentNewsNo = form.shomareKhabar;
      const r = await SendKhabar(sentNewsNo, userId, sendDescription, num(sendDestination.ToUserId), sendRequestKeyRef.current);
      sentNewsRef.current = sentNewsNo;
      setSendModal(false); resetWizard(); clearLocalDraft(sentNewsNo); sendRequestKeyRef.current = "";
      showToast.success(r?.data?.StateName === "تأیید نهایی" ? "خبر در ستاد نهایی شد." : "خبر با موفقیت ارسال شد.");
      await refreshAll();
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در ارسال خبر"); }
    finally { sendInFlightRef.current = false; setSendLoading(false); }
  }

  async function openReturn(rowOrCurrent?: NewsRow) {
    const newsNo = rowOrCurrent?.ShomareKhabar || form.shomareKhabar;
    if (!newsNo) return;
    setForm((prev) => ({ ...prev, shomareKhabar: newsNo })); setSelectedReturnTags([]); setReturnDescription(""); setReturnReasonError(false); setReturnModal(true); void loadDecisionNews(newsNo);
    const requestId = ++returnRecipientRequestRef.current;
    setReturnRecipient(null); setReturnRecipientError("");
    setReturnRecipientLoading(true);
    try {
      const result = await GetReturnKhabarRecipient(newsNo, userId);
      if (requestId !== returnRecipientRequestRef.current) return;
      if (!result?.data?.ToUserId || num(result.data.ToUserId) === userId)
        throw new Error("فرستنده قبلی معتبر و متفاوت از کاربر فعلی مشخص نشد.");
      setReturnRecipient(result.data);
    } catch (error) {
      if (requestId === returnRecipientRequestRef.current)
        setReturnRecipientError(error instanceof Error ? error.message : "خطا در شناسایی گیرنده برگشت");
    } finally {
      if (requestId === returnRecipientRequestRef.current) setReturnRecipientLoading(false);
    }
  }

  const returnTagOptions = useMemo(() => (returnTags || []).map((x) => ({ id: num(x.ID), title: String(x.NameFarsi || "") })).filter((x) => x.id && x.title), [returnTags]);

  async function confirmReturn() {
    if (!userId || !form.shomareKhabar || returnInFlightRef.current || returnConfirmationPendingRef.current) return;
    if (returnRecipientLoading || !returnRecipient?.ToUserId || num(returnRecipient.ToUserId) === userId) {
      showToast.warning(returnRecipientError || "گیرنده برگشت هنوز مشخص نشده است.");
      return;
    }
    const reason = returnDescription.trim();
    if (!reason) {
      setReturnReasonError(true);
      returnReasonRef.current?.focus();
      showToast.warning("نوشتن دلیل برگشت الزامی است؛ انتخاب علت‌های آماده به‌تنهایی کافی نیست.");
      return;
    }
    const tagText = returnTagOptions.filter((x) => selectedReturnTags.includes(x.id)).map((x) => `• ${x.title}`).join("\n");
    const fullDescription = [tagText, reason].filter(Boolean).join("\n");
    if (fullDescription.length > 2000) return showToast.warning("متن علت برگشت نباید بیش از ۲۰۰۰ نویسه باشد.");
    returnConfirmationPendingRef.current = true;
    let accepted = false;
    try {
      accepted = await meratConfirm(
        `آیا از برگشت خبر شماره ${faDigits(form.shomareKhabar)} ${returnRecipient ? `به ${returnRecipient.ToFullName} (${returnRecipient.ToOnvanPost}) ` : ""}با دلیل درج‌شده اطمینان دارید؟`,
        { title: "تأیید برگشت خبر", type: "warning", confirmText: "بله، خبر برگشت داده شود", cancelText: "انصراف" },
      );
    } finally {
      returnConfirmationPendingRef.current = false;
    }
    if (!accepted) return;
    returnInFlightRef.current = true;
    setReturnSaving(true);
    try {
      const returnedNewsNo = form.shomareKhabar;
      const result = await ReturnKhabar(returnedNewsNo, userId, fullDescription, selectedReturnTags.join(","), reason);
      sentNewsRef.current = returnedNewsNo;
      setReturnModal(false); resetWizard(); clearLocalDraft(returnedNewsNo);
      showToast.success(result?.data?.ToFullName ? `خبر به ${result.data.ToFullName} برگشت داده شد.` : "خبر به فرستنده قبلی برگشت داده شد."); await refreshAll();
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در برگشت خبر"); }
    finally { returnInFlightRef.current = false; setReturnSaving(false); }
  }

  async function claimForManager(newsNo:number) {
    if(claimingNews)return;
    if(!await meratConfirm("خبر برای رسیدگی به پیشخوان شما منتقل شود؟"))return;
    setClaimingNews(newsNo);
    try{const response=await fetch("/Api/Akhbar/ClaimSetadNews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shomareKhabar:newsNo})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"خطا در تحویل خبر");
      showToast.success("خبر به پیشخوان شما منتقل شد.");await refreshAll();
    }catch(e){showToast.error(e instanceof Error?e.message:"خطا در تحویل خبر")}
    finally{setClaimingNews(null)}
  }

  async function openWorkflow(rowOrNo: NewsRow | number) {
    if (!userId) return;
    const newsNo = typeof rowOrNo === "number" ? rowOrNo : rowOrNo.ShomareKhabar;
    setWorkflowModal(true); setWorkflowLoading(true); setWorkflowSummary(null); setWorkflowLogs([]);
    try { const r = await GetKhabarGardesh(newsNo, userId); setWorkflowSummary(r.summary || null); setWorkflowLogs(r.logs || []); }
    catch (e) { setWorkflowModal(false); showToast.error(e instanceof Error ? e.message : "خطا در دریافت گردش خبر"); }
    finally { setWorkflowLoading(false); }
  }

  async function confirmDelete() {
    if (!userId || !deleteModal.row) return;
    setDeleteSaving(true);
    try { await DeleteKhabar(deleteModal.row.ShomareKhabar, userId); clearLocalDraft(deleteModal.row.ShomareKhabar); setDeleteModal({open:false,row:null}); showToast.success("خبر حذف شد."); await refreshAll(); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در حذف خبر"); }
    finally { setDeleteSaving(false); }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const selectedAttachment = attachments.find((x) => num(x.KhabarPeyvastId) === activeAttachment) || null;
  const selectedAttachmentUrl = selectedAttachment && userId ? GetKhabarPeyvastUrl(form.shomareKhabar, userId, selectedAttachment.FileName) : "";
  const imageAttachments = attachments.filter((item) => extKind(item.FileName) === "image");
  const activeImageIndex = imageAttachments.findIndex((item) => num(item.KhabarPeyvastId) === activeAttachment);
  const moveSelectedImage = (delta: -1 | 1) => {
    if (imageAttachments.length < 2) return;
    const nextIndex = ((activeImageIndex < 0 ? (delta > 0 ? -1 : 0) : activeImageIndex) + delta + imageAttachments.length) % imageAttachments.length;
    setActiveAttachment(num(imageAttachments[nextIndex].KhabarPeyvastId));
  };
  const previewAttachments = attachmentPreviewSource === "decision" ? decisionAttachments : attachments;
  const previewNewsNo = attachmentPreviewSource === "decision" ? decisionNewsNo : form.shomareKhabar;
  const previewActiveId = attachmentPreviewSource === "decision" ? decisionActiveAttachment : activeAttachment;
  const previewSelectedAttachment = previewAttachments.find((item) => num(item.KhabarPeyvastId) === previewActiveId) || null;
  const previewSelectedUrl = previewSelectedAttachment && userId
    ? GetKhabarPeyvastUrl(previewNewsNo, userId, previewSelectedAttachment.FileName) : "";
  const previewImageAttachments = previewAttachments.filter((item) => extKind(item.FileName) === "image");
  const previewImageIndex = previewImageAttachments.findIndex((item) => num(item.KhabarPeyvastId) === previewActiveId);
  const selectPreviewAttachment = (id: number) => {
    if (attachmentPreviewSource === "decision") setDecisionActiveAttachment(id);
    else setActiveAttachment(id);
  };
  const openWizardPreview = (id?: number) => {
    setAttachmentPreviewSource("wizard");
    if (id !== undefined) setActiveAttachment(id);
    setAttachmentPreviewOpen(true);
  };
  const openDecisionPreview = (id: number) => {
    setAttachmentPreviewSource("decision");
    setDecisionActiveAttachment(id);
    setAttachmentPreviewOpen(true);
  };
  const movePreviewImage = (delta: -1 | 1) => {
    if (previewImageAttachments.length < 2) return;
    const next = ((previewImageIndex < 0 ? (delta > 0 ? -1 : 0) : previewImageIndex) + delta + previewImageAttachments.length) % previewImageAttachments.length;
    selectPreviewAttachment(num(previewImageAttachments[next].KhabarPeyvastId));
  };
  useEffect(() => {
    if (!attachmentPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setAttachmentPreviewOpen(false); return; }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const imageIds = previewAttachments.filter((item) => extKind(item.FileName) === "image").map((item) => num(item.KhabarPeyvastId));
      if (imageIds.length < 2) return;
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? 1 : -1;
      const index = imageIds.indexOf(num(previewActiveId));
      const nextId = imageIds[((index < 0 ? (delta > 0 ? -1 : 0) : index) + delta + imageIds.length) % imageIds.length];
      if (attachmentPreviewSource === "decision") setDecisionActiveAttachment(nextId);
      else setActiveAttachment(nextId);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [attachmentPreviewOpen, previewAttachments, previewActiveId, attachmentPreviewSource]);
  const activeFilterCount = [
    search.trim(),
    filterProvince ? String(filterProvince) : "",
    filterStatus,
    filterDateFrom,
    filterDateTo,
  ].filter(Boolean).length;
  const inboxOptions = [
    { id: 1 as BoxType, title: "پیشخوان", count: counts.KartablCount, icon: Inbox },
    { id: 5 as BoxType, title: "پیش‌نویس‌ها", count: counts.DraftCount, icon: FileText },
    { id: 2 as BoxType, title: "ارسال‌شده", count: counts.SentCount, icon: Send },
    { id: 3 as BoxType, title: "برگشت‌شده", count: counts.ReturnedCount, icon: RotateCcw },
    { id: 4 as BoxType, title: "اخبار محدوده من", count: counts.ScopeCount, icon: Newspaper },
  ];
  const selectedInbox = inboxOptions.find((item) => item.id === boxType) || inboxOptions[0];
  const SelectedInboxIcon = selectedInbox.icon;
  const canEditCurrent = wizardMode === "edit";
  // Hozeh staff can now edit county-origin news content. Keep the county
  // representative's handwritten names separate and read-only while the
  // official persons are managed against Davtalab.Ashkhas.
  const resolvingCountyPersons = wizardMode === "resolve" || (
    wizardMode === "edit" && isMainHozeOfficer &&
    num(detail?.CreatePostId) === 70 && bool(detail?.CanResolveCountyPersons)
  );
  const manualCountyPersons = linkedPersons.filter((person) => person.IsManual);
  const officialPersons = linkedPersons.filter((person) => !person.IsManual);
  const detailIsInbox = bool(detail?.IsInbox);
  const detailCanReturn = bool(detail?.CanReturn);
  const isDraft = detail?.CurrentStatusCode === "PISHNEVIS";
  const isReturned = String(detail?.CurrentStatusCode || "").startsWith("BARGASHT_");

  return (
    <div className={styles.pageBody} dir="rtl">
      <section className={styles.newsWorkspace}>
        <header className={styles.workspaceHeader}>
          <div className={styles.headerTitleWrap}>
            <span className={styles.headerIcon}><Newspaper size={21}/></span>
          <div className={styles.inboxPickerHost} ref={inboxMenuRef}>
              <button
                ref={inboxTriggerRef}
                type="button"
                className={`${styles.inboxPickerTrigger} ${inboxMenuOpen ? styles.inboxPickerTriggerOpen : ""}`}
                aria-haspopup="menu"
                aria-expanded={inboxMenuOpen}
                aria-controls="news-inbox-menu"
                onClick={() => { setFilterMenuOpen(false); setNotificationOpen(false); setInboxMenuOpen((open) => !open); }}
              >
                <SelectedInboxIcon size={17} aria-hidden="true"/>
                <span>{selectedInbox.title}</span>
                <span className={styles.inboxPickerCount}>{selectedInbox.count.toLocaleString("fa-IR")}</span>
                <ChevronLeft size={15} className={`${styles.inboxPickerArrow} ${inboxMenuOpen ? styles.inboxPickerArrowOpen : ""}`} aria-hidden="true"/>
              </button>
              {inboxMenuOpen && <div id="news-inbox-menu" role="menu" aria-label="انتخاب پوشه اخبار" className={styles.inboxPickerMenu}>
                {inboxOptions.map((item) => {
                  const ItemIcon = item.icon;
                  const active = item.id === boxType;
                  return <button
                    key={item.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`${styles.inboxPickerItem} ${active ? styles.inboxPickerItemActive : ""}`}
                    onClick={() => {
                      setBoxType(item.id);
                      setPage(1);
                      setInboxMenuOpen(false);
                      inboxTriggerRef.current?.focus();
                    }}
                  >
                    <ItemIcon size={17} aria-hidden="true"/>
                    <span>{item.title}</span>
                    <span className={styles.inboxPickerItemCount}>{item.count.toLocaleString("fa-IR")}</span>
                    {active && <CheckCircle2 size={15} aria-hidden="true"/>}
                  </button>;
                })}
              </div>}
          </div>
          </div>
          <div className={styles.inlineActions}>
          {setadSettings?.admin && <a href="/AdminSettings?tab=news" className={styles.secondaryButton}><Settings2 size={16}/> تنظیمات اخبار</a>}
          <div className={styles.filterMenuHost} ref={filterMenuRef}>
            <button
              type="button"
              className={`${styles.filterMenuTrigger} ${filterMenuOpen || activeFilterCount ? styles.filterMenuTriggerActive : ""}`}
              aria-label="جست‌وجو و فیلتر اخبار"
              title="جست‌وجو و فیلتر اخبار"
              aria-expanded={filterMenuOpen}
              aria-controls="news-filter-menu"
              onClick={() => { setInboxMenuOpen(false); setNotificationOpen(false); setFilterMenuOpen((current) => !current); }}
            >
              <MoreHorizontal size={20} aria-hidden="true" />
              {activeFilterCount > 0 && <span className={styles.activeFiltersCount}>{activeFilterCount.toLocaleString("fa-IR")}</span>}
            </button>
            {filterMenuOpen && <div id="news-filter-menu" className={styles.filterPopover} role="dialog" aria-label="جست‌وجو و فیلتر اخبار">
              <div className={styles.filterPopoverHeader}>
                <strong>جست‌وجو و فیلتر اخبار</strong>
                <button type="button" aria-label="بستن فیلترها" title="بستن" onClick={() => setFilterMenuOpen(false)}><X size={16}/></button>
              </div>
              <div className={styles.filterPopoverBody}>
                <label className={styles.filterSearchField}>
                  <span>جست‌وجو</span>
                  <div className={styles.searchBox}><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="شماره، عنوان یا منبع خبر..." /></div>
                </label>
                {setadSettings && (setadSettings.admin || setadSettings.canHandle) && <div className={styles.filterPopoverGrid}>
                  <div className={styles.filterProvinceField}>
                    <span>استان</span>
                    <Dropdown<number>
                      value={filterProvince}
                      options={[
                        { value: 0, label: "همه استان‌های مجاز" },
                        ...provinceOptions
                          .filter(p => setadSettings.allProvinces || setadSettings.provinces.includes(p.ProvinceId))
                          .map(p => ({ value: p.ProvinceId, label: p.Name })),
                      ]}
                      onChange={(value) => { setFilterProvince(Number(value)); setPage(1); }}
                      searchable
                      searchPlaceholder="جست‌وجوی استان..."
                      ariaLabel="انتخاب استان برای فیلتر اخبار"
                      maxMenuHeight={220}
                      compactMenu
                    />
                  </div>
                  <label>وضعیت خبر
                    <select value={filterStatus} onChange={(e)=>{setFilterStatus(e.target.value);setPage(1)}}>
                      <option value="">همه وضعیت‌ها</option>
                      <option value="PISHNEVIS">پیش‌نویس</option>
                      <option value="KARTABL_SETAD_KARSHENAS">در کارتابل ستاد</option>
                      <option value="BARGASHT_">برگشت‌شده</option>
                      <option value="TAEED_NAHAEI_SETAD">تأیید نهایی در ستاد</option>
                      <option value="TAEED_NAHAEI_HOZE">نهایی‌شده در حوزه انتخابیه</option>
                    </select>
                  </label>
                  <label>از تاریخ
                    <NewsJalaliDatePicker label="از تاریخ" value={filterDateFrom} onChange={(v)=>{setFilterDateFrom(v);setPage(1)}} />
                  </label>
                  <label>تا تاریخ
                    <NewsJalaliDatePicker label="تا تاریخ" value={filterDateTo} onChange={(v)=>{setFilterDateTo(v);setPage(1)}} />
                  </label>
                </div>}
              </div>
              <div className={styles.filterPopoverFooter}>
                <button type="button" className={styles.secondaryButton} onClick={()=>{setSearch("");setDebouncedSearch("");setFilterProvince(0);setFilterStatus("");setFilterDateFrom("");setFilterDateTo("");setPage(1)}}>پاک‌کردن فیلترها</button>
                <button type="button" className={styles.iconTextButton} onClick={()=>void refreshAll()} disabled={loading}><RefreshCcw size={16} className={loading ? styles.spin : ""}/> به‌روزرسانی</button>
                <button type="button" className={styles.primaryButton} onClick={()=>setFilterMenuOpen(false)}>بستن</button>
              </div>
            </div>}
          </div>
          <div className={styles.newsNotificationHost} ref={notificationRef}>
            <button type="button" className={styles.newsNotificationTrigger} title="هشدارهای دیرکرد اخبار"
              aria-label={`اعلان‌های دیرکرد؛ ${alertUnread} خوانده‌نشده`}
              aria-expanded={notificationOpen} aria-controls="news-overdue-notification-menu"
              onClick={()=>{setInboxMenuOpen(false);setFilterMenuOpen(false);setNotificationOpen(open=>!open);void loadAlerts();}}>
              <Bell size={17}/>{alertUnread>0?<span className={styles.newsNotificationCount}>{Math.min(alertUnread,99).toLocaleString("fa-IR")}{alertUnread>99?"+":""}</span>:null}
            </button>
            {notificationOpen?<div className={styles.newsNotificationMenu} id="news-overdue-notification-menu"
              role="region" aria-label="هشدارهای دیرکرد اخبار">
              <div className={styles.newsNotificationHead}><strong>هشدارهای دیرکرد</strong>
                <button type="button" onClick={()=>void loadAlerts()}><RefreshCcw size={14}/> به‌روزرسانی</button></div>
              <div className={styles.newsNotificationItems}>
                {!alerts.length?<p className={styles.newsNotificationEmpty}>هشدار باز برای شما وجود ندارد.</p>:alerts.slice(0,40).map(a=><div key={a.AlertId}
                  className={`${styles.newsNotificationItem} ${!a.SeenAtUtc?styles.newsNotificationUnread:""}`}>
                  <strong>خبر {faDigits(a.ShomareKhabar)} · {a.OnvanKhabar||"بدون عنوان"}</strong>
                  <small>{a.RecipientType==="MANAGER"?"اعلان مدیریتی":"پیشخوان شما"} · {a.AgeMinutes===null?"زمان نامشخص":`${Math.floor(a.AgeMinutes/60).toLocaleString("fa-IR")} ساعت توقف`}</small>
                  <div className={styles.newsNotificationButtons}>
                    {!a.SeenAtUtc?<button type="button" disabled={notificationSaving!==null}
                      onClick={()=>void markAlert(a.AlertId,"SEEN")}>علامت‌گذاری خوانده‌شده</button>:null}
                    {!a.AcknowledgedAtUtc?<button type="button" disabled={notificationSaving!==null}
                      onClick={()=>void markAlert(a.AlertId,"ACK")}>تأیید دریافت</button>:<span>دریافت تأیید شده</span>}
                  </div>
                </div>)}
              </div><p className={styles.newsNotificationHint}>هشدار فقط پس از اقدام واقعی روی خبر بسته می‌شود.</p>
            </div>:null}
          </div>
          <button className={styles.primaryButton} type="button" onClick={openCreate}><Plus size={16}/> ثبت خبر جدید</button>
          </div>
        </header>

        <div className={styles.contentArea}>
          {latestDraft ? (
            <div className={styles.localDraftBanner}>
              <div>
                <strong>آخرین پیش‌نویس: خبر {faDigits(latestDraft.ShomareKhabar)} — {latestDraft.OnvanKhabar || "بدون عنوان"}</strong>
                <span>آخرین تغییر: {faDigits(latestDraft.LastEditDateTime || latestDraft.CreateDateTime || latestDraft.StatusDateTime || "—")} · {faDigits(counts.DraftCount)} پیش‌نویس ارسال‌نشده</span>
              </div>
              <div className={styles.inlineActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => void openExisting(latestDraft, "edit")}>ادامه آخرین پیش‌نویس</button>
                <button type="button" className={styles.iconTextButton} onClick={() => { setBoxType(5); setPage(1); }}>نمایش همه پیش‌نویس‌ها</button>
              </div>
            </div>
          ) : null}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>ردیف</th><th>شماره خبر</th><th className={styles.alignRight}>عنوان خبر</th><th>وضعیت</th><th className={styles.alignRight}>محل فعلی</th><th className={styles.alignRight}>سمت فعلی</th><th>آخرین تغییر</th><th>عملیات</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8}><div className={styles.loadingState}><Loader2 className={styles.spin} size={24}/> در حال دریافت اخبار...</div></td></tr> : rows.length ? rows.map((row,index) => {
                  const rowDraft = row.CurrentStatusCode === "PISHNEVIS";
                  const rowReturned = String(row.CurrentStatusCode || "").startsWith("BARGASHT_");
                  const rowInbox = bool(row.IsInbox);
                  const rowCanEdit = bool(row.CanEdit);
                  const rowCanResolveCountyNames = isMainHozeOfficer && num(row.CreatePostId) === 70 && bool(row.IsInbox) && !rowCanEdit;
                  return <tr key={row.ShomareKhabar}>
                    <td>{faDigits((page-1)*pageSize+index+1)}</td><td className={styles.newsNo}>{faDigits(row.ShomareKhabar)}</td>
                    <td className={styles.alignRight}><button type="button" className={styles.newsTitleLink} onClick={() => void openExisting(row,rowCanEdit ? "edit" : "view")} title="باز کردن خبر">{row.OnvanKhabar || "—"}</button>
                    {boxType===1 && alerts.some(a=>a.ShomareKhabar===row.ShomareKhabar && a.RecipientType==="OWNER")
                     ?<span className={styles.newsOverdueBadge}><Clock3 size={12}/> دیرکرد</span>:null}
                    <small className={styles.newsMeta}>{row.NoeKhabarName || "—"} · {row.ManbaKhabarName || "—"}</small></td>
                    <td><span className={`${styles.statusBadge} ${statusTone(row.CurrentStatusCode)}`}>{statusLabel(row.CurrentStatusCode, row.CurrentStatusName)}</span></td>
                    <td className={styles.alignRight}>{row.CurrentMahalName || "—"}</td><td className={styles.alignRight}>{row.CurrentPostName || (rowDraft ? "ایجادکننده خبر" : "—")}</td><td>{faDigits(currentTimeLabel(row))}</td>
                    <td><div className={styles.rowActions}>
                      {setadSettings?.postId===2 && !rowInbox && Number(row.CurrentMahal)===1 && row.CurrentStatusCode==="KARTABL_SETAD_KARSHENAS" && <button type="button" title="تحویل خبر به پیشخوان رئیس اداره" onClick={()=>void claimForManager(row.ShomareKhabar)} disabled={claimingNews!==null}><Hand size={15}/></button>}
                      {rowCanEdit ? <button title="ادامه / اصلاح" type="button" onClick={() => void openExisting(row,"edit")}><Pencil size={15}/></button> : rowCanResolveCountyNames ? <button title="مشاهده اسامی شهرستان و ثبت اشخاص واقعی" type="button" onClick={() => void openExisting(row,"resolve")}><UsersRound size={16}/></button> : <button title="مشاهده" type="button" onClick={() => void openExisting(row,"view")}><FileText size={15}/></button>}
                      {rowInbox && !rowDraft && (!rowReturned || rowCanEdit) ? <button title="تأیید و ارسال" className={styles.approveAction} type="button" onClick={() => void prepareSend(row)} disabled={sendLoading}><CheckCircle2 size={15}/></button> : null}
                      {rowInbox && !rowDraft ? <button title={bool(row.CanReturn) ? "برگشت به فرستنده قبلی" : "برگشت غیرفعال است؛ فرستنده معتبر قبلی وجود ندارد"} className={styles.returnAction} type="button" onClick={() => void openReturn(row)} disabled={!bool(row.CanReturn)} aria-disabled={!bool(row.CanReturn)}><RotateCcw size={15}/></button> : null}
                      <button title="گردش خبر" type="button" onClick={() => void openWorkflow(row)}><History size={15}/></button>
                      {rowDraft && bool(row.IsOwner) ? <button title="حذف" className={styles.deleteAction} type="button" onClick={() => setDeleteModal({open:true,row})}><Trash2 size={15}/></button> : null}
                    </div></td>
                  </tr>;
                }) : <tr><td colSpan={8}><div className={styles.emptyState}><Newspaper size={36}/><strong>خبری در این بخش وجود ندارد</strong><span>{boxType===5?"هنوز خبر ارسال‌نشده‌ای ندارید.":boxType===1?"خبرهای نیازمند اقدام در اینجا نمایش داده می‌شوند.":"برای این بخش موردی یافت نشد."}</span></div></td></tr>}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}><button type="button" onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={page<=1}><ChevronRight size={16}/></button><span>صفحه {faDigits(page)} از {faDigits(pageCount)}</span><button type="button" onClick={()=>setPage((p)=>Math.min(pageCount,p+1))} disabled={page>=pageCount}><ChevronLeft size={16}/></button></div>
        </div>
      </section>

      {wizardOpen ? <div className={`${styles.modalLayer} ${styles.newsFullModalLayer}`}>
        <button className={styles.backdrop} type="button" aria-label="بستن" onClick={resetWizard}/>
        <section className={`${styles.modalCard} ${styles.wizardCard} ${styles.newsFullModalCard}`} role="dialog" aria-modal="true" aria-label={wizardMode === "view" ? "مشاهده خبر" : "مدیریت خبر"}>
          <header className={`${styles.modalHeader} ${styles.newsWizardHeader} merat-modal-tone--neutral`}><div><h2>{wizardMode === "view" ? `مشاهده خبر ${faDigits(form.shomareKhabar)}` : wizardMode === "resolve" ? `تطبیق افراد خبر ${faDigits(form.shomareKhabar)}` : form.shomareKhabar ? `ویرایش خبر ${faDigits(form.shomareKhabar)}` : "ثبت خبر جدید"}</h2></div><button type="button" onClick={resetWizard} aria-label="بستن فرم خبر"><X size={17}/></button></header>

          <div className={styles.wizardSteps}>{steps.map((item) => { const Icon=item.icon; const active=step===item.id; const done=step>item.id; return <button key={item.id} type="button" disabled={wizardMode==="view" || (!form.shomareKhabar && item.id>1)} onClick={()=>{if(form.shomareKhabar)setStep(item.id)}} className={`${styles.stepItem} ${active?styles.stepActive:""} ${done?styles.stepDone:""}`}><span><Icon size={17}/></span><div><strong>{item.title}</strong><small>{item.sub}</small></div></button>; })}</div>

          {isReturned && detail?.LastReturnReason ? <div className={`${styles.returnNotice} ${styles.newsReturnNoticeTop}`} role="note" aria-label="دلیل برگشت خبر">
            <RotateCcw size={18} aria-hidden="true"/>
            <div><strong>دلیل آخرین برگشت خبر</strong><p>{String(detail.LastReturnReason)}</p></div>
          </div> : null}

          <div className={styles.modalBody}>
            {step===1 ? <div className={styles.stepContent}>
              <div className={styles.formGrid3}>
                <Field label="طبقه‌بندی خبر" required error={errors.tabaqehBandi}><Dropdown value={form.tabaqehBandi} options={classificationOptions} onChange={(v)=>setField("tabaqehBandi",num(v))} disabled={!canEditCurrent} error={errors.tabaqehBandi}/></Field>
                <Field label="منبع خبر" required error={errors.manbaKhabarId}><Dropdown value={form.manbaKhabarId} options={sourceOptions} onChange={(v)=>setField("manbaKhabarId",num(v))} disabled={!canEditCurrent} error={errors.manbaKhabarId} searchable searchPlaceholder="جستجو در منابع خبر..."/></Field>
                <Field label="نوع خبر" required error={errors.noeKhabar}><Dropdown value={form.noeKhabar} options={typeOptions} onChange={(v)=>setField("noeKhabar",num(v))} disabled={!canEditCurrent} error={errors.noeKhabar}/></Field>
              </div>
              <div className={styles.formGrid3}>
                <Field label="تاریخ نامه" error={errors.tarikhNameh} errorText="انتخاب تاریخ آینده مجاز نیست."><NewsJalaliDatePicker label="تاریخ نامه" maxToday invalid={errors.tarikhNameh} disabled={!canEditCurrent} value={form.tarikhNameh} onChange={(v)=>setField("tarikhNameh",v)}/></Field>
                <Field label="شماره نامه"><input className={styles.input} disabled={!canEditCurrent} value={form.shomareNameh} onChange={(e)=>setField("shomareNameh",e.target.value)} maxLength={100}/></Field>
                <Field label="تاریخ انتشار" error={errors.tarikhEnteshar} errorText="انتخاب تاریخ آینده مجاز نیست."><NewsJalaliDatePicker label="تاریخ انتشار" maxToday invalid={errors.tarikhEnteshar} disabled={!canEditCurrent} value={form.tarikhEnteshar} onChange={(v)=>setField("tarikhEnteshar",v)}/></Field>
              </div>
              <Field label="عنوان خبر" required error={errors.onvanKhabar}><input className={`${styles.input} ${errors.onvanKhabar?styles.inputError:""}`} disabled={!canEditCurrent} value={form.onvanKhabar} onChange={(e)=>setField("onvanKhabar",e.target.value)} maxLength={500}/></Field>
              <div className={styles.formGrid2}>
                <Field label="شرح خبر" required error={errors.sharhKhabar}><textarea className={`${styles.textarea} ${errors.sharhKhabar?styles.inputError:""}`} disabled={!canEditCurrent} value={form.sharhKhabar} onChange={(e)=>setField("sharhKhabar",e.target.value)}/></Field>
                <Field label="ملاحظات خبر" required error={errors.molahazatKhabar}><textarea className={`${styles.textarea} ${errors.molahazatKhabar?styles.inputError:""}`} disabled={!canEditCurrent} value={form.molahazatKhabar} onChange={(e)=>setField("molahazatKhabar",e.target.value)}/></Field>
              </div>
              <div className={styles.formGrid2}>
                <Field label="نقطه خبرخیز"><div className={styles.fieldWithButton}><Dropdown value={form.noghteKhabarkhizId} options={hotspotOptions} onChange={(v)=>setField("noghteKhabarkhizId",num(v))} disabled={!canEditCurrent}/>{canEditCurrent?<button type="button" className={styles.miniButton} onClick={()=>setHotspotModal(true)}><Plus size={14}/></button>:null}</div></Field>
                <Field label="محل نقطه خبرخیز" required={!form.noghteKhabarkhizId} error={errors.mahalNoghteKhabarkhiz}><input className={`${styles.input} ${errors.mahalNoghteKhabarkhiz?styles.inputError:""}`} disabled={!canEditCurrent || !!form.noghteKhabarkhizId} value={form.mahalNoghteKhabarkhiz} onChange={(e)=>setField("mahalNoghteKhabarkhiz",e.target.value)} placeholder={form.noghteKhabarkhizId?"از نقطه خبرخیز انتخاب‌شده استفاده می‌شود":"محل را وارد کنید"}/></Field>
              </div>
            </div> : null}

            {step===2 ? <div className={styles.stepContent}>
              <div className={`${styles.personColumns} ${wizardMode==="view"?styles.personColumnsSingle:""}`}>
                {wizardMode==="edit" && isCountyRepresentative ? <div className={styles.personPanel}>
                  <div className={styles.panelMiniHeader}><strong>{manualEditingId === null ? "ثبت دستی اشخاص" : "ویرایش شخص"}</strong><span>ویژه نماینده شهرستان</span></div>
                  <div className={styles.manualPersonForm}>
                    <label>نام و نام خانوادگی<input className={styles.input} maxLength={200} value={manualPersonName} onChange={e=>setManualPersonName(e.target.value)} placeholder="نام کامل شخص" /></label>
                    <label>نام پدر (اختیاری)<input className={styles.input} maxLength={100} value={manualPersonFather} onChange={e=>setManualPersonFather(e.target.value)} placeholder="نام پدر" /></label>
                    <div className={styles.manualPersonActions}><button type="button" className={styles.primaryButton} disabled={personAction!==null || !manualPersonName.trim()} onClick={()=>void saveManualPerson()}>{manualEditingId === null ? <Plus size={15}/> : <Pencil size={15}/>} {manualEditingId === null ? "افزودن شخص" : "ذخیره ویرایش"}</button>
                    {manualEditingId !== null ? <button type="button" className={styles.secondaryButton} onClick={()=>{setManualEditingId(null);setManualPersonName("");setManualPersonFather("");}}>انصراف</button> : null}</div>
                  </div>
                </div> : (wizardMode==="edit" || resolvingCountyPersons) ? <div className={styles.personPanel}>
                  <div className={styles.panelMiniHeader}><strong>{resolvingCountyPersons ? "جستجو و ثبت اشخاص واقعی" : "جستجوی افراد"}</strong><span>افزودن</span></div>
                  {resolvingCountyPersons ? <div className={styles.countyResolutionHint}>اشخاص واقعی را از فهرست رسمی داوطلبان انتخاب کنید. اسامی ارسال‌شده شهرستان در کادر مقابل فقط خواندنی‌اند و حذف نمی‌شوند.</div> : null}
                  <div className={styles.personSearchBox}><div className={styles.searchBox}><Search size={17}/><input value={personSearch} onChange={(e)=>setPersonSearch(e.target.value)} placeholder="نام، نام خانوادگی یا نام پدر..."/></div>{personSearchDebounced.length<2?<span className={styles.hint}>حداقل ۲ حرف وارد کنید.</span>:null}</div>
                  {personSearchDebounced.length>=2 ? <div className={styles.searchResults}>{personLoading?<div className={styles.miniLoading}><Loader2 className={styles.spin} size={18}/> در حال جستجو...</div>:personSearchError?<div className={styles.personSearchError}><span>خطا در جستجوی افراد: {personSearchError}</span><button type="button" onClick={()=>setPersonSearchRetry((x)=>x+1)}>تلاش مجدد</button></div>:personRows.length?personRows.map((person)=><div className={styles.personResult} key={person.ShomarehParvandeh}><div><strong>{fullName(person)}</strong><span>نام پدر: {person.NamePedar || "—"} · شماره پرونده: {person.ShomarehParvandeh}</span></div><button type="button" onClick={()=>void addPerson(person)} disabled={personAction===person.ShomarehParvandeh}>{personAction===person.ShomarehParvandeh?<Loader2 className={styles.spin} size={15}/>:<UserPlus size={15}/>} افزودن</button></div>):<div className={styles.miniEmpty}>شخصی یافت نشد.</div>}</div>:<div className={styles.miniEmpty}>برای جستجو حداقل ۲ حرف وارد کنید.</div>}
                </div> : null}
                <div className={styles.linkedPanel}>
                  {resolvingCountyPersons ? <div className={styles.countySubmittedNames}>
                    <div className={styles.panelMiniHeader}><strong>اسامی اعلام‌شده شهرستان فرعی</strong><span>{faDigits(manualCountyPersons.length)} نفر · فقط خواندنی</span></div>
                    {manualCountyPersons.length ? <div className={styles.linkedList}>{manualCountyPersons.map((person) => <div className={styles.linkedPerson} key={person.KhabarShakhsId}><div className={styles.personAvatar}>{(person.FirstName||"؟").slice(0,1)}</div><div><strong>{fullName(person)}</strong><span>نام پدر: {person.NamePedar || "—"} · ثبت شهرستان</span></div></div>)}</div> : <div className={styles.miniEmpty}>شهرستان نامی به صورت دستی ثبت نکرده است.</div>}
                  </div> : null}
                  <div className={styles.panelMiniHeader}><strong>{resolvingCountyPersons ? "اشخاص واقعی ثبت‌شده" : "افراد وابسته ثبت‌شده"}</strong><span>{faDigits(resolvingCountyPersons ? officialPersons.length : linkedPersons.length)} نفر</span></div>
                  {(resolvingCountyPersons ? officialPersons : linkedPersons).length ? <div className={styles.linkedList}>{(resolvingCountyPersons ? officialPersons : linkedPersons).map((person) => <div className={styles.linkedPerson} key={person.KhabarShakhsId}><div className={styles.personAvatar}>{(person.FirstName||"؟").slice(0,1)}</div><div><strong>{fullName(person)}</strong><span>نام پدر: {person.NamePedar || "—"}{person.IsManual ? " · ثبت دستی" : ` · پرونده ${faDigits(person.ShomarehParvandeh)}`}</span></div>{wizardMode==="edit" && person.IsManual && isCountyRepresentative ? <div className={styles.manualPersonActions}><button type="button" title="ویرایش شخص" onClick={()=>{setManualEditingId(-person.KhabarShakhsId);setManualPersonName(fullName(person));setManualPersonFather(person.NamePedar||"");}}><Pencil size={15}/></button><button type="button" title="حذف شخص" onClick={()=>void removeManualPerson(person)} disabled={personAction===person.KhabarShakhsId}><Trash2 size={15}/></button></div> : !person.IsManual && ((wizardMode==="edit" && !resolvingCountyPersons) || (resolvingCountyPersons && num(person.PersonCreatorUserId) === userId)) ? <button type="button" title="حذف شخص واقعی ثبت‌شده توسط شما" onClick={()=>void removePerson(person)} disabled={personAction===person.KhabarShakhsId}><Trash2 size={15}/></button> : null}</div>)}</div> : <div className={styles.miniEmpty}>{resolvingCountyPersons ? "هنوز شخص واقعی برای این خبر ثبت نشده است." : "هنوز شخصی به خبر اضافه نشده است."}</div>}
                </div>
              </div>
            </div>:null}

            {step===3 ? <div className={styles.stepContent}>
              <div className={styles.attachmentGrid}>
                <div className={styles.attachmentManager}>
                  {wizardMode==="edit"?<><input ref={fileInputRef} type="file" multiple hidden accept="image/png,image/jpeg,audio/mpeg,video/mp4,video/webm,video/quicktime" onChange={(e)=>void uploadFiles(e.target.files)}/><button type="button" className={styles.uploadBox} onClick={()=>fileInputRef.current?.click()} disabled={attachmentAction===-1}>{attachmentAction===-1?<Loader2 className={styles.spin} size={30}/>:<Upload size={30}/>}<strong>{attachmentAction===-1?"در حال بارگذاری...":"انتخاب فایل"}</strong><span>PNG, JPG, JPEG, MP3, MP4, WEBM, MOV</span></button></>:null}
                  <div className={styles.attachmentList}>{attachmentLoading?<div className={styles.miniLoading}><Loader2 className={styles.spin} size={18}/> دریافت پیوست‌ها...</div>:attachments.length?attachments.map((item)=>{const kind=extKind(item.FileName);const Icon=kind==="image"?FileImage:kind==="video"?FileVideo:kind==="audio"?FileAudio:FileText;const fileUrl=userId?GetKhabarPeyvastUrl(form.shomareKhabar,userId,item.FileName):"";return <button type="button" key={item.KhabarPeyvastId} className={`${styles.attachmentRow} ${activeAttachment===item.KhabarPeyvastId?styles.attachmentActive:""}`} onClick={()=>setActiveAttachment(num(item.KhabarPeyvastId))} title="نمایش در کادر پیش‌نمایش"><span className={styles.filePreviewThumb}>{kind==="image"&&fileUrl?<img src={fileUrl} alt={item.OriginalFileName || item.FileName}/>:<Icon size={20}/>}</span><span className={styles.fileInfo}><strong>{item.OriginalFileName || item.FileName}</strong><small>{formatSize(item.FileSize)} · برای نمایش در کادر سمت چپ کلیک کنید</small></span>{wizardMode==="edit"?<span role="button" tabIndex={0} className={styles.fileDelete} onClick={(e)=>{e.stopPropagation();void removeAttachment(item)}}><Trash2 size={14}/></span>:null}</button>}):<div className={styles.miniEmpty}>پیوستی ثبت نشده است.</div>}</div>
                </div>
                <div className={styles.previewBox}>{selectedAttachment&&selectedAttachmentUrl?extKind(selectedAttachment.FileName)==="image"?<div className={styles.newsImageNavigator}>
                  {imageAttachments.length > 1 ? <button type="button" className={styles.newsImageNavButton} onClick={() => moveSelectedImage(-1)} aria-label="تصویر قبلی" title="تصویر قبلی"><ChevronRight size={20}/></button> : null}
                  <button type="button" className={styles.newsImageOpen} onClick={() => openWizardPreview()} aria-label="بزرگ‌نمایی تصویر پیوست" title="برای بزرگ‌نمایی و حرکت روی تصویر کلیک کنید">
                    <img src={selectedAttachmentUrl} alt={selectedAttachment.OriginalFileName || "پیوست خبر"}/>
                    <span><ZoomIn size={15}/> بزرگ‌نمایی</span>
                  </button>
                  {imageAttachments.length > 1 ? <button type="button" className={styles.newsImageNavButton} onClick={() => moveSelectedImage(1)} aria-label="تصویر بعدی" title="تصویر بعدی"><ChevronLeft size={20}/></button> : null}
                  {imageAttachments.length > 1 ? <span className={styles.newsImagePosition}>{faDigits(activeImageIndex + 1)} از {faDigits(imageAttachments.length)}</span> : null}
                </div>:extKind(selectedAttachment.FileName)==="video"?<video src={selectedAttachmentUrl} controls/>:extKind(selectedAttachment.FileName)==="audio"?<div className={styles.audioPreview}><FileAudio size={54}/><audio src={selectedAttachmentUrl} controls/></div>:<FileText size={64}/>:<div className={styles.previewEmpty}><FileImage size={46}/><span>برای پیش‌نمایش یک پیوست را انتخاب کنید.</span></div>}</div>
              </div>
            </div>:null}

            {step===4 ? <div className={styles.stepContent}>
              <div className={`${styles.reviewGrid} ${styles.reviewSummaryGrid}`}>
                <ReviewItem label="وضعیت" value={statusLabel(detail?.CurrentStatusCode, detail?.CurrentStatusName) || "پیش‌نویس"} icon={<CircleDot size={20}/>}/>
                <ReviewItem label="منبع خبر" value={detail?.ManbaKhabarName || sourceOptions.find(x=>x.value===form.manbaKhabarId)?.label || "—"} icon={<Inbox size={20}/>}/>
                <ReviewItem label="نوع خبر" value={detail?.NoeKhabarName || typeOptions.find(x=>x.value===form.noeKhabar)?.label || "—"} icon={<FileText size={20}/>}/>
              </div>
              <div className={styles.reviewNarrative}>
                <div><strong>عنوان خبر</strong><p className={styles.reviewNewsTitle}>{form.onvanKhabar || "—"}</p></div>
                <div><strong>شرح خبر</strong><p>{form.sharhKhabar || "—"}</p></div>
                <div><strong>ملاحظات خبر</strong><p>{form.molahazatKhabar || "—"}</p></div>
              </div>
              <div className={styles.reviewRelations}>
                {manualCountyPersons.length ? <div><div className={styles.panelMiniHeader}><strong>اسامی معرفی‌شده شهرستان فرعی</strong><span>{faDigits(manualCountyPersons.length)}</span></div>{manualCountyPersons.map((p)=><span className={styles.relationChip} key={p.KhabarShakhsId}>{fullName(p)}</span>)}</div> : null}
                <div><div className={styles.panelMiniHeader}><strong>اشخاص ثبت‌شده از فهرست رسمی</strong><span>{faDigits(officialPersons.length)}</span></div>{officialPersons.length ? officialPersons.map((p)=><span className={styles.relationChip} key={p.KhabarShakhsId}>{fullName(p)}</span>) : <span className={styles.hint}>موردی ثبت نشده است.</span>}</div>
              </div>
              <div className={styles.reviewDocuments}>
                <div className={styles.panelMiniHeader}><strong>اسناد وابسته</strong><span>{faDigits(attachments.length)}</span></div>
                {attachments.length ? <div className={styles.reviewAttachmentLayout}>
                  {imageAttachments.length > 0 ? <div className={styles.reviewImageRail} aria-label="تمام تصاویر پیوست خبر">
                    {imageAttachments.map((item, index) => {
                      const imageUrl = userId ? GetKhabarPeyvastUrl(form.shomareKhabar, userId, item.FileName) : "";
                      return <button
                        type="button"
                        key={item.KhabarPeyvastId}
                        className={styles.reviewImageThumb}
                        onClick={() => { openWizardPreview(num(item.KhabarPeyvastId)); }}
                        title="بزرگ‌نمایی تصویر"
                        aria-label={`بزرگ‌نمایی تصویر ${faDigits(index + 1)} از ${faDigits(imageAttachments.length)}`}
                      >
                        {imageUrl ? <img src={imageUrl} alt={`تصویر پیوست ${faDigits(index + 1)}`} loading="lazy" /> : <FileImage size={22} />}
                      </button>;
                    })}
                  </div> : null}
                  {attachments.some((item) => extKind(item.FileName) !== "image") ? <div className={styles.reviewFileList} aria-label="سایر پیوست‌های خبر">
                    {attachments.filter((item) => extKind(item.FileName) !== "image").map((item) => {
                      const kind = extKind(item.FileName);
                      const Icon = kind === "video" ? FileVideo : kind === "audio" ? FileAudio : FileText;
                      return <button type="button" key={item.KhabarPeyvastId} className={styles.reviewFileRow} onClick={() => { openWizardPreview(num(item.KhabarPeyvastId)); }}>
                        <span><Icon size={16} /></span><div><strong>{item.OriginalFileName || item.FileName}</strong><small>{formatSize(item.FileSize)} · کلیک برای پیش‌نمایش</small></div>
                      </button>;
                    })}
                  </div> : null}
                </div> : <span className={styles.hint}>موردی ثبت نشده است.</span>}
              </div>
            </div>:null}
          </div>

          <footer className={styles.modalFooter}>
            <div>{step>1 && wizardMode==="edit"?<button type="button" className={styles.secondaryButton} onClick={()=>setStep((step-1) as WizardStep)}><ArrowRight size={15}/> مرحله قبل</button>:null}</div>
            <div className={styles.footerActions}>
              <button type="button" className={styles.secondaryButton} onClick={resetWizard}>بستن</button>
              {wizardMode==="edit" && step===1?<button type="button" className={styles.primaryButton} onClick={()=>void saveStep1()} disabled={saving}>{saving?<Loader2 className={styles.spin} size={15}/>:null} ذخیره و ادامه</button>:null}
              {wizardMode==="edit" && step===2?<button type="button" className={styles.primaryButton} onClick={()=>setStep(3)}>ذخیره مرحله و ادامه</button>:null}
              {wizardMode==="resolve" && step===2?<button type="button" className={styles.primaryButton} onClick={()=>setStep(4)}>مرور نهایی خبر</button>:null}
              {wizardMode==="resolve" && step===4?<button type="button" className={styles.secondaryButton} onClick={()=>setStep(2)}><UsersRound size={15}/> تطبیق اشخاص</button>:null}
              {wizardMode==="edit" && step===3?<button type="button" className={styles.primaryButton} onClick={()=>void goReview()} disabled={saving}>{saving?<Loader2 className={styles.spin} size={15}/>:null} مرور نهایی</button>:null}
              {step===4?<button type="button" className={styles.workflowButton} onClick={()=>void openWorkflow(form.shomareKhabar)}><History size={15}/> گردش خبر</button>:null}
              {step===4 && form.shomareKhabar && ((wizardMode==="edit" && (isDraft || isReturned)) || (detailIsInbox && !isReturned)) ? <button type="button" className={styles.primaryButton} onClick={()=>void prepareSend()} disabled={sendLoading}>{sendLoading?<Loader2 className={styles.spin} size={15}/>:<CheckCircle2 size={15}/>} {detail?.CurrentStatusCode==="TAEED_NAHAEI_SETAD" ? "نهایی شده" : detailIsInbox && !isDraft ? "تأیید و ارسال" : "ارسال خبر"}</button>:null}
              {step===4 && detailIsInbox && !isDraft ? <button type="button" className={styles.returnButton} disabled={!detailCanReturn} title={detailCanReturn ? "برگشت به فرستنده قبلی" : "فرستنده معتبر قبلی شناسایی نشده است"} onClick={()=>void openReturn()}><RotateCcw size={15}/> برگشت</button>:null}
            </div>
          </footer>
        </section>
      </div>:null}

      {attachmentPreviewOpen && previewSelectedAttachment && previewSelectedUrl ? <div className={styles.attachmentPreviewLayer}>
        <button type="button" className={styles.attachmentPreviewBackdrop} aria-label="بستن پیش‌نمایش" onClick={()=>setAttachmentPreviewOpen(false)}/>
        <section className={styles.attachmentPreviewCard} role="dialog" aria-modal="true" aria-label="پیش‌نمایش سند">
          <header className={styles.attachmentPreviewHeader}>
            <div><strong>پیش‌نمایش سند</strong><span>{previewSelectedAttachment.OriginalFileName || previewSelectedAttachment.FileName}</span></div>
            <button type="button" onClick={()=>setAttachmentPreviewOpen(false)} aria-label="بستن"><X size={18}/></button>
          </header>
          <div className={styles.attachmentPreviewBody}>
            {previewImageAttachments.length ? <aside className={styles.attachmentPreviewThumbs} aria-label="تصاویر پیوست">
              <div className={styles.attachmentPreviewThumbTitle}>تصاویر <span>{previewImageAttachments.length}</span></div>
              <div className={styles.attachmentPreviewThumbList}>
                {previewImageAttachments.map((item) => {
                  const imageUrl = userId ? GetKhabarPeyvastUrl(previewNewsNo, userId, item.FileName) : "";
                  const active = num(item.KhabarPeyvastId) === previewActiveId;
                  return <button type="button" key={item.KhabarPeyvastId} className={`${styles.attachmentPreviewThumb} ${active ? styles.attachmentPreviewThumbActive : ""}`} onClick={() => selectPreviewAttachment(num(item.KhabarPeyvastId))} title={item.OriginalFileName || item.FileName}>
                    {imageUrl ? <img src={imageUrl} alt={item.OriginalFileName || item.FileName}/> : <FileImage size={20}/>}
                  </button>;
                })}
              </div>
            </aside> : null}
            <div className={styles.attachmentPreviewMain}>
              {extKind(previewSelectedAttachment.FileName)==="image" ? <div className={styles.attachmentPreviewImageNavigator}>
                {previewImageAttachments.length > 1 ? <button type="button" className={styles.attachmentPreviewNavButton} onClick={() => movePreviewImage(-1)} aria-label="تصویر قبلی" title="تصویر قبلی"><ChevronRight size={24}/></button> : null}
                <NewsZoomPanImage src={previewSelectedUrl} alt={previewSelectedAttachment.OriginalFileName || previewSelectedAttachment.FileName}/>
                {previewImageAttachments.length > 1 ? <button type="button" className={styles.attachmentPreviewNavButton} onClick={() => movePreviewImage(1)} aria-label="تصویر بعدی" title="تصویر بعدی"><ChevronLeft size={24}/></button> : null}
                {previewImageAttachments.length > 1 ? <span className={styles.attachmentPreviewPosition}>{faDigits(previewImageIndex + 1)} از {faDigits(previewImageAttachments.length)}</span> : null}
              </div> : extKind(previewSelectedAttachment.FileName)==="video" ? <video className={styles.attachmentPreviewMedia} src={previewSelectedUrl} controls autoPlay/> : extKind(previewSelectedAttachment.FileName)==="audio" ? <div className={styles.attachmentPreviewAudio}><FileAudio size={60}/><strong>{previewSelectedAttachment.OriginalFileName || previewSelectedAttachment.FileName}</strong><audio src={previewSelectedUrl} controls autoPlay/></div> : <div className={styles.attachmentPreviewUnsupported}><FileText size={58}/><span>پیش‌نمایش این نوع سند در برنامه پشتیبانی نمی‌شود.</span></div>}
            </div>
          </div>
        </section>
      </div> : null}

      {hotspotModal?<SimpleModal title="افزودن نقطه خبرخیز" onClose={()=>setHotspotModal(false)}><Field label="عنوان نقطه خبرخیز" required><input autoFocus className={styles.input} value={hotspotTitle} onChange={(e)=>setHotspotTitle(e.target.value)} maxLength={300}/></Field><div className={styles.simpleActions}><button type="button" className={styles.secondaryButton} onClick={()=>setHotspotModal(false)}>انصراف</button><button type="button" className={styles.primaryButton} onClick={()=>void addHotspot()} disabled={hotspotSaving}>{hotspotSaving?<Loader2 className={styles.spin} size={15}/>:null} ثبت</button></div></SimpleModal>:null}

      {sendModal ? <SimpleModal title={`تأیید و ارسال خبر ${faDigits(form.shomareKhabar)}`} onClose={()=>!sendLoading&&setSendModal(false)} fullScreen>
        <div className={styles.newsDecisionLayout}>
          <section className={styles.newsDecisionForm} aria-label="ثبت تصمیم ارسال خبر">
            <div className={styles.newsDecisionFormScroll}>
              <h3>مقصد و توضیحات ارسال</h3>
              <div className={styles.destinationCard}>
                <span className={styles.destinationIcon}><Send size={22}/></span>
                <div>
                  <small>{sendDestination?.IsFinal?"اقدام نهایی":"گیرنده فعال بعدی"}</small>
                  <strong>{sendDestination?.IsFinal?"تأیید نهایی خبر در ستاد":isSetadNewsDestination(sendDestination)?"ستاد":sendDestination?.ToFullName || "—"}</strong>
                  <p>{sendDestination?.IsFinal?`${sendDestination?.ToOnvanPost || "کارشناس اخبار ستاد"} · ${sendDestination?.ToNameMahal || "ستاد"}`:isSetadNewsDestination(sendDestination)?sendDestination?.ToOnvanPost || "واحد ستاد":[sendDestination?.ToOnvanPost,sendDestination?.ToNameMahal].filter(Boolean).join(" · ") || "—"}</p>
                </div>
              </div>
              <Field label="توضیحات ارسال">
                <textarea className={styles.textareaSmall} value={sendDescription} onChange={(e)=>setSendDescription(e.target.value)} placeholder="توضیحات اختیاری..." maxLength={50000}/>
                <span className={styles.sendDescriptionCounter}>{sendDescription.length.toLocaleString("fa-IR")} / ۵۰٬۰۰۰ نویسه</span>
              </Field>
              <div className={styles.confirmText}>با انتخاب «تأیید اعلام نظر»، پنجره تأیید نهایی باز می‌شود و ارسال فقط پس از موافقت شما انجام خواهد شد.</div>
            </div>
            <div className={`${styles.simpleActions} ${styles.newsDecisionActions}`}>
              <button type="button" className={styles.secondaryButton} onClick={()=>setSendModal(false)} disabled={sendLoading}>انصراف</button>
              <button type="button" className={styles.primaryButton} onClick={()=>void confirmSend()} disabled={sendLoading}>{sendLoading?<Loader2 className={styles.spin} size={15}/>:<CheckCircle2 size={15}/>} تأیید اعلام نظر</button>
            </div>
          </section>
          <DecisionNewsPreview
            newsNo={decisionNewsNo}
            userId={userId}
            detail={decisionDetail}
            attachments={decisionAttachments}
            persons={decisionPersons}
            loading={decisionPreviewLoading}
            error={decisionPreviewError}
            onRetry={() => void loadDecisionNews(decisionNewsNo)}
            onOpenAttachment={openDecisionPreview}
          />
        </div>
      </SimpleModal> : null}

      {returnModal ? <SimpleModal title={`برگشت خبر ${faDigits(form.shomareKhabar)}`} onClose={()=>!returnSaving&&setReturnModal(false)} fullScreen>
        <div className={styles.newsDecisionLayout}>
          <section className={styles.newsDecisionForm} aria-label="ثبت تصمیم برگشت خبر">
            <div className={styles.newsDecisionFormScroll}>
              <h3>گیرنده و دلیل برگشت</h3>
              <div className={styles.returnRecipientCard} aria-live="polite">
                <strong>گیرنده برگشت (فرستنده واقعی قبلی)</strong>
                {returnRecipientLoading ? <span>در حال بررسی سوابق ارسال خبر...</span>
                  : returnRecipientError ? <span role="alert" className={styles.returnRecipientError}>{returnRecipientError}</span>
                  : returnRecipient ? <span>{returnRecipient.ToFullName} · {returnRecipient.ToOnvanPost} · {returnRecipient.ToNameMahal}</span>
                  : <span>فرستنده قبلی معتبر مشخص نشده و امکان برگشت وجود ندارد.</span>}
              </div>
              {returnRecipient?.PreviousReturnReason?.trim() ? <div className={styles.previousReturnReason} role="group" aria-label="دلیل برگشت قبلی">
                <div className={styles.previousReturnHead}>
                  <strong>دلیل برگشت قبلی</strong>
                  <button type="button" className={styles.copyPreviousReturnButton}
                    title="کپی دلیل قبلی در کادر دلیل برگشت" aria-label="کپی دلیل برگشت قبلی در کادر دلیل جدید"
                    onClick={() => {
                      const previous = returnRecipient.PreviousReturnReason?.trim() || "";
                      setReturnDescription((current) => current.trim() ? (current.includes(previous) ? current : `${current.trim()}\n${previous}`) : previous);
                      setReturnReasonError(false);
                      returnReasonRef.current?.focus();
                    }}>
                    <Copy size={15}/> کپی در دلیل جدید
                  </button>
                </div>
                <p>{returnRecipient.PreviousReturnReason}</p>
              </div> : null}
              <Field label="دلیل برگشت (الزامی)" required>
                <textarea ref={returnReasonRef} required aria-required="true" aria-invalid={returnReasonError}
                  className={`${styles.textareaSmall} ${styles.returnReasonInput} ${returnReasonError ? styles.returnReasonInvalid : ""}`}
                  value={returnDescription}
                  onChange={(e)=>{setReturnDescription(e.target.value);if(e.target.value.trim())setReturnReasonError(false);}}
                  placeholder="دلیل برگشت و موارد لازم برای اصلاح خبر را بنویسید..." maxLength={2000}/>
                <div className={styles.returnReasonHelp}>
                  <span>نوشتن دلیل الزامی است؛ انتخاب علت‌های آماده به‌تنهایی کافی نیست.</span>
                  <span>{faDigits(returnDescription.length)} / ۲۰۰۰</span>
                </div>
                {returnReasonError ? <div className={styles.returnReasonWarning} role="alert">برای ثبت برگشت، دلیل را در همین کادر بنویسید.</div> : null}
              </Field>
              <details className={styles.returnReasonsDetails}>
                <summary>
                  <span>دلایل آماده <small>(اختیاری)</small></span>
                  <span className={styles.returnReasonsSummarySide}>
                    {selectedReturnTags.length ? <b>{faDigits(selectedReturnTags.length)} انتخاب‌شده</b> : <small>نمایش گزینه‌ها</small>}
                    <ChevronLeft size={17}/>
                  </span>
                </summary>
                <div className={styles.returnReasonsContent}>
                  <p>می‌توانید علت‌های مرتبط را انتخاب کنید؛ توضیح اختصاصی در کادر بالا همچنان اجباری است.</p>
                  <div className={styles.tagList}>
                    {returnTagOptions.map((tag)=>{
                      const active=selectedReturnTags.includes(tag.id);
                      return <button key={tag.id} type="button" aria-pressed={active}
                        className={`${styles.returnTag} ${active?styles.returnTagActive:""}`}
                        onClick={()=>setSelectedReturnTags((prev)=>active?prev.filter((id)=>id!==tag.id):[...prev,tag.id])}>
                        <CircleDot size={13}/>{tag.title}
                      </button>;
                    })}
                  </div>
                  {!returnTagOptions.length ? <div className={styles.warningBox}>برای PID=71104 دلیل آماده تعریف نشده است.</div> : null}
                </div>
              </details>
            </div>
            <div className={`${styles.simpleActions} ${styles.newsDecisionActions}`}>
              <button type="button" className={styles.secondaryButton} onClick={()=>setReturnModal(false)} disabled={returnSaving}>انصراف</button>
              <button type="button" className={styles.returnButton} onClick={()=>void confirmReturn()} disabled={returnSaving || returnRecipientLoading || !returnRecipient?.ToUserId || num(returnRecipient.ToUserId) === userId}>{returnSaving?<Loader2 className={styles.spin} size={15}/>:<RotateCcw size={15}/>} ثبت برگشت</button>
            </div>
          </section>
          <DecisionNewsPreview
            newsNo={decisionNewsNo}
            userId={userId}
            detail={decisionDetail}
            attachments={decisionAttachments}
            persons={decisionPersons}
            loading={decisionPreviewLoading}
            error={decisionPreviewError}
            onRetry={() => void loadDecisionNews(decisionNewsNo)}
            onOpenAttachment={openDecisionPreview}
          />
        </div>
      </SimpleModal> : null}

      {workflowModal?<SimpleModal title={`گردش خبر ${faDigits(workflowSummary?.ShomareKhabar || "")}`} onClose={()=>setWorkflowModal(false)} extraWide>
        <div className={styles.workflowCurrent}>
          {workflowSummary?<>
            <div><span className={styles.workflowMetaIcon} aria-hidden="true"><CircleDot size={19}/></span><div className={styles.workflowMetaText}><small>وضعیت فعلی</small><strong>{statusLabel(workflowSummary.CurrentStatusCode, workflowSummary.CurrentStatusName) || "—"}</strong></div></div>
            <div><span className={styles.workflowMetaIcon} aria-hidden="true"><UsersRound size={19}/></span><div className={styles.workflowMetaText}><small>در اختیار</small><strong>{[workflowSummary.CurrentUserName,workflowSummary.CurrentPostName,workflowSummary.CurrentMahalName].filter(Boolean).join(" · ") || "—"}</strong></div></div>
            <div><span className={styles.workflowMetaIcon} aria-hidden="true"><Clock3 size={19}/></span><div className={styles.workflowMetaText}><small>زمان آخرین وضعیت</small><strong dir="auto">{faDigits(workflowSummary.StatusDateTime || "—")}</strong></div></div>
          </>:null}
        </div>
        {workflowLoading?<div className={styles.loadingState}><Loader2 className={styles.spin} size={23}/> در حال دریافت گردش...</div>:
        <div className={styles.timeline}>
          {workflowLogs.map((log,index)=><div className={styles.timelineItem} key={`${log.LogId}-${index}`}>
            <span className={styles.timelineDot}/>
            <div className={styles.timelineCard}>
              <div className={styles.timelineTop}><strong>{log.NoeEghdam || "اقدام"}</strong><time>{faDigits(log.CreateDateTime || "—")}</time></div>
              <div className={styles.routeLine}><span>{[log.FromUserName,log.FromPostName,log.FromMahalName].filter(Boolean).join(" · ") || "شروع"}</span><ChevronLeft size={15}/><span>{[log.ToUserName,log.ToPostName,log.ToMahalName].filter(Boolean).join(" · ") || "—"}</span></div>
              {log.Tozihat?<p>{faDigits(log.Tozihat)}</p>:null}
            </div>
          </div>)}
        </div>}
      </SimpleModal>:null}

      {deleteModal.open?<SimpleModal title="حذف خبر" onClose={()=>!deleteSaving&&setDeleteModal({open:false,row:null})}><div className={styles.confirmText}>خبر شماره <b>{faDigits(deleteModal.row?.ShomareKhabar)}</b> حذف شود؟ حذف فقط برای پیش‌نویس ایجادشده توسط خود شما مجاز است.</div><div className={styles.simpleActions}><button type="button" className={styles.secondaryButton} onClick={()=>setDeleteModal({open:false,row:null})}>انصراف</button><button type="button" className={styles.dangerButton} onClick={()=>void confirmDelete()} disabled={deleteSaving}>{deleteSaving?<Loader2 className={styles.spin} size={15}/>:<Trash2 size={15}/>} حذف</button></div></SimpleModal>:null}
    </div>
  );
}

function Field({label,required,error,errorText,children}:{label:string;required?:boolean;error?:boolean;errorText?:string;children:ReactNode}){
  return <label className={styles.field}><span>{label}{required?<b>*</b>:null}</span>{children}{error?<small className={styles.errorText}>{errorText || "این فیلد اجباری است."}</small>:null}</label>;
}

function ReviewItem({label,value,icon}:{label:string;value:ReactNode;icon?:ReactNode}){
  return <div className={styles.reviewItem}>
    {icon?<div className={styles.reviewItemIcon} aria-hidden="true">{icon}</div>:null}
    <div className={styles.reviewItemBody}><span>{label}</span><strong>{value}</strong></div>
  </div>;
}

function SimpleModal({title,onClose,children,wide,extraWide,fullScreen}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;extraWide?:boolean;fullScreen?:boolean}){
  return <div className={`${styles.modalLayer} ${fullScreen?styles.newsFullModalLayer:""}`}><button className={styles.backdrop} type="button" aria-label="بستن" onClick={onClose}/><section role="dialog" aria-modal="true" aria-label={title} className={`${styles.modalCard} ${wide?styles.simpleWide:""} ${extraWide?styles.simpleExtraWide:""} ${fullScreen?styles.newsFullModalCard:""}`}><header className={`${styles.modalHeader} merat-modal-tone--${title.includes("برگشت") ? "return" : /تأیید|تایید/.test(title) ? "confirm" : "notice"}`}><div><h2>{title}</h2></div><button type="button" onClick={onClose}><X size={18}/></button></header><div className={`${styles.simpleBody} ${fullScreen ? styles.newsFullModalBody : ""}`}>{children}</div></section></div>;
}


/** Read-only complete news context inside approval / return (opinion) dialogs. */
function DecisionNewsPreview({newsNo,userId,detail,attachments,persons,loading,error,onRetry,onOpenAttachment}:{
  newsNo:number;
  userId:number;
  detail:Record<string,unknown>|null;
  attachments:KhabarPeyvast[];
  persons:KhabarShakhs[];
  loading:boolean;
  error:string;
  onRetry:()=>void;
  onOpenAttachment:(id:number)=>void;
}) {
  const images = attachments.filter((item) => extKind(item.FileName) === "image");
  const otherFiles = attachments.filter((item) => extKind(item.FileName) !== "image");
  return <section className={styles.newsDecisionPreview} aria-label="مشاهده متن خبر و تمامی پیوست‌ها">
    <header className={styles.newsDecisionPreviewHeader}>
      <div><FileText size={18}/><strong>متن و پیوست‌های خبر</strong></div>
      <span>متن و اسناد خبر، فقط‌خواندنی</span>
    </header>
    {loading ? <div className={styles.miniLoading}><Loader2 className={styles.spin} size={18}/> دریافت خبر و پیوست‌ها...</div> : null}
    {error ? <div className={styles.warningBox}>{error} <button type="button" className={styles.secondaryButton} onClick={onRetry}>تلاش مجدد</button></div> : null}
    {detail ? <>
      <div className={styles.newsDecisionMeta}>
        <div><span>وضعیت</span><strong>{statusLabel(String(detail.CurrentStatusCode || ""), String(detail.CurrentStatusName || ""))}</strong></div>
        <div><span>نوع خبر</span><strong>{String(detail.NoeKhabarName || "—")}</strong></div>
        <div><span>منبع خبر</span><strong>{String(detail.ManbaKhabarName || "—")}</strong></div>
      </div>
      <div className={styles.newsDecisionText}><small>عنوان خبر</small><h3>{String(detail.OnvanKhabar || "—")}</h3></div>
      <div className={styles.newsDecisionText}><small>شرح خبر</small><p>{String(detail.SharhKhabar || "—")}</p></div>
      {detail.MolahazatKhabar ? <div className={styles.newsDecisionText}><small>ملاحظات</small><p>{String(detail.MolahazatKhabar)}</p></div> : null}
    </> : !loading && !error ? <div className={styles.miniEmpty}>اطلاعات خبر دریافت نشد.</div> : null}
    <div className={styles.newsDecisionSubheading}><UsersRound size={16}/><strong>افراد وابسته</strong><span>{faDigits(persons.length)}</span></div>
    <div className={styles.newsDecisionPersons}>{persons.length ? persons.map((p)=><span key={p.KhabarShakhsId} className={styles.relationChip}>{fullName(p)}</span>) : <span className={styles.hint}>شخصی ثبت نشده است.</span>}</div>
    <div className={styles.newsDecisionSubheading}><FileImage size={16}/><strong>اسناد و تصاویر خبر</strong><span>{faDigits(attachments.length)}</span></div>
    {images.length ? <div className={styles.newsDecisionImageGrid} aria-label="گالری تصاویر خبر">
      {images.map((item,index)=><button type="button" key={item.KhabarPeyvastId}
        className={styles.newsDecisionImageButton} onClick={()=>onOpenAttachment(num(item.KhabarPeyvastId))}
        title="بزرگ‌نمایی، زوم و جابه‌جایی تصویر"
        aria-label={`بزرگ‌نمایی تصویر ${faDigits(index+1)} از ${faDigits(images.length)}`}>
        <img src={GetKhabarPeyvastUrl(newsNo,userId,item.FileName)} alt={`تصویر پیوست ${faDigits(index+1)}`} loading="lazy"/>
        <span><ZoomIn size={16}/></span>
      </button>)}
    </div> : null}
    {otherFiles.length ? <div className={styles.newsDecisionFiles}>{otherFiles.map((item)=><button type="button"
      key={item.KhabarPeyvastId} onClick={()=>onOpenAttachment(num(item.KhabarPeyvastId))}>
        {extKind(item.FileName)==="audio" ? <FileAudio size={18}/> : extKind(item.FileName)==="video" ? <FileVideo size={18}/> : <FileText size={18}/>}
        <span>{item.OriginalFileName || item.FileName}</span><ZoomIn size={14}/>
      </button>)}</div> : null}
    {!attachments.length && !loading ? <div className={styles.miniEmpty}>پیوستی برای این خبر ثبت نشده است.</div> : null}
  </section>;
}

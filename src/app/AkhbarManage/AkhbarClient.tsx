"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  History,
  Inbox,
  Loader2,
  Newspaper,
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
  X,
} from "lucide-react";
import Dropdown from "@/component/Dropdown";
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

type BoxType = 1 | 2 | 3;
type WizardStep = 1 | 2 | 3 | 4;
type ModalMode = "edit" | "view";
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
  CurrentMahalName?: string;
  CurrentPostName?: string;
  StatusDateTime?: string;
  CreateDateTime?: string;
  LastEditDateTime?: string;
  NoeKhabarName?: string;
  ManbaKhabarName?: string;
  IsOwner?: boolean | number;
  IsInbox?: boolean | number;
  TotalCount?: number;
};

type KhabarShakhs = {
  KhabarShakhsId: number;
  ShomarehParvandeh: number;
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

function num(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
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
  return [person.FirstName, person.LastName].filter(Boolean).join(" ") || `پرونده ${person.ShomarehParvandeh}`;
}

function formatSize(kb?: number) {
  const n = Number(kb || 0);
  if (n >= 1024) return `${(n / 1024).toFixed(1)} MB`;
  return `${n} KB`;
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
  if (code === "TAEED_NAHAEI_SETAD") return styles.statusDone;
  return styles.statusInbox;
}

function statusLabel(code?: string, serverName?: string) {
  if (serverName && serverName !== "در حال گردش") return serverName;
  switch (String(code || "")) {
    case "PISHNEVIS": return "پیش‌نویس";
    case "KARTABL_SETAD_KARSHENAS": return "در کارتابل کارشناس اخبار ستاد";
    case "TAEED_NAHAEI_SETAD": return "تأیید نهایی در ستاد";
    case "BARGASHT_SETAD": return "برگشت شده در ستاد";
    default:
      if (String(code || "").startsWith("BARGASHT_")) return "برگشت شده برای اصلاح";
      if (String(code || "").startsWith("KARTABL_")) return "در کارتابل";
      return serverName || "در حال گردش";
  }
}

function currentTimeLabel(row: NewsRow) {
  return row.StatusDateTime || row.LastEditDateTime || row.CreateDateTime || "—";
}

export default function AkhbarClient() {
  const user = useMeratUser();
  const userId = num(user.UserId);
  const localDraftKey = `merat-akhbar-local-draft-${userId || "guest"}`;
  const [boxType, setBoxType] = useState<BoxType>(1);
  const [counts, setCounts] = useState({ KartablCount: 0, SentCount: 0, ReturnedCount: 0 });
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
  const [personAction, setPersonAction] = useState<number | null>(null);

  const [attachments, setAttachments] = useState<KhabarPeyvast[]>([]);
  const [activeAttachment, setActiveAttachment] = useState<number | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentAction, setAttachmentAction] = useState<number | null>(null);
  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);

  const [localDraft, setLocalDraft] = useState<{ form: FormState; step: WizardStep; savedAt: string } | null>(null);
  const [hotspotModal, setHotspotModal] = useState(false);
  const [hotspotTitle, setHotspotTitle] = useState("");
  const [hotspotSaving, setHotspotSaving] = useState(false);

  const [sendModal, setSendModal] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendDestination, setSendDestination] = useState<any>(null);
  const [sendDescription, setSendDescription] = useState("");

  const [returnModal, setReturnModal] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [selectedReturnTags, setSelectedReturnTags] = useState<number[]>([]);
  const [returnDescription, setReturnDescription] = useState("");

  const [workflowModal, setWorkflowModal] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowSummary, setWorkflowSummary] = useState<any>(null);
  const [workflowLogs, setWorkflowLogs] = useState<GardeshLog[]>([]);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; row: NewsRow | null }>({ open: false, row: null });
  const [deleteSaving, setDeleteSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 450);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setPersonSearchDebounced(personSearch.trim()), 700);
    return () => window.clearTimeout(t);
  }, [personSearch]);

  const loadLocalDraft = useCallback(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(localDraftKey);
      if (!raw) return setLocalDraft(null);
      const parsed = JSON.parse(raw);
      if (!parsed?.form) return setLocalDraft(null);
      setLocalDraft({ form: { ...emptyForm, ...parsed.form }, step: (parsed.step || 1) as WizardStep, savedAt: String(parsed.savedAt || "") });
    } catch { setLocalDraft(null); }
  }, [localDraftKey, userId]);

  useEffect(() => { loadLocalDraft(); }, [loadLocalDraft]);

  useEffect(() => {
    if (!wizardOpen || wizardMode !== "edit" || !userId) return;
    const t = window.setTimeout(() => {
      try {
        const payload = { form, step, savedAt: new Date().toLocaleString("fa-IR") };
        localStorage.setItem(localDraftKey, JSON.stringify(payload));
        setLocalDraft(payload);
      } catch { /* local storage may be unavailable */ }
    }, 350);
    return () => window.clearTimeout(t);
  }, [form, step, wizardOpen, wizardMode, userId, localDraftKey]);

  const clearLocalDraft = useCallback(() => {
    try { localStorage.removeItem(localDraftKey); } catch { /* noop */ }
    setLocalDraft(null);
  }, [localDraftKey]);

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

  const loadCounts = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await GetKhabarCounts(userId);
      setCounts({
        KartablCount: num(r?.data?.KartablCount),
        SentCount: num(r?.data?.SentCount),
        ReturnedCount: num(r?.data?.ReturnedCount),
      });
    } catch { setCounts({ KartablCount: 0, SentCount: 0, ReturnedCount: 0 }); }
  }, [userId]);

  const loadRows = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await GetKhabarList(userId, page, pageSize, 1, 2, debouncedSearch, boxType);
      const data = (r.data || []) as NewsRow[];
      setRows(data);
      setTotal(num(data[0]?.TotalCount));
    } catch (e) {
      setRows([]); setTotal(0);
      showToast.error(e instanceof Error ? e.message : "خطا در دریافت اخبار");
    } finally { setLoading(false); }
  }, [userId, page, pageSize, debouncedSearch, boxType]);

  useEffect(() => { void loadLookups(); }, [loadLookups]);
  useEffect(() => { void loadRows(); }, [loadRows]);
  useEffect(() => { void loadCounts(); }, [loadCounts]);

  const refreshAll = useCallback(async () => { await Promise.all([loadRows(), loadCounts(), loadLookups()]); }, [loadRows, loadCounts, loadLookups]);

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
    if (!wizardOpen || step !== 2 || wizardMode !== "edit" || !userId || !form.shomareKhabar || personSearchDebounced.length < 2) {
      setPersonRows([]); return;
    }
    let cancelled = false;
    setPersonLoading(true);
    SearchAkhbarAshkhas(form.shomareKhabar, userId, personSearchDebounced, 1, 12)
      .then((r) => { if (!cancelled) setPersonRows(r.data || []); })
      .catch(() => { if (!cancelled) setPersonRows([]); })
      .finally(() => { if (!cancelled) setPersonLoading(false); });
    return () => { cancelled = true; };
  }, [wizardOpen, step, wizardMode, userId, form.shomareKhabar, personSearchDebounced]);

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
    setWizardMode("edit"); setErrors({}); setDetail(null); setPersonSearch(""); setPersonRows([]); setLinkedPersons([]); setAttachments([]); setActiveAttachment(null); setAttachmentPreviewOpen(false);
    if (localDraft?.form) { setForm({ ...emptyForm, ...localDraft.form }); setStep(localDraft.step || 1); }
    else { setForm(emptyForm); setStep(1); }
    setWizardOpen(true);
  }

  async function openExisting(row: NewsRow, mode: ModalMode) {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await GetKhabar(row.ShomareKhabar, userId);
      if (!r.data) throw new Error("اطلاعات خبر یافت نشد.");
      setDetail(r.data); setForm(hydrateForm(r.data)); setWizardMode(mode); setStep(mode === "view" ? 4 : 1);
      setErrors({}); setPersonSearch(""); setPersonRows([]); setLinkedPersons([]); setAttachments([]); setActiveAttachment(null); setAttachmentPreviewOpen(false); setWizardOpen(true);
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در دریافت خبر"); }
    finally { setLoading(false); }
  }

  async function saveStep1() {
    if (!userId || !validateStep1()) { showToast.warning("فیلدهای اجباری را تکمیل کنید."); return; }
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
    if (!userId || !form.shomareKhabar) return;
    setPersonAction(person.ShomarehParvandeh);
    try { await InsertKhabarShakhs(form.shomareKhabar, person.ShomarehParvandeh, userId); await loadPersons(); setPersonRows((x) => x.filter((p) => p.ShomarehParvandeh !== person.ShomarehParvandeh)); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در افزودن شخص"); }
    finally { setPersonAction(null); }
  }

  async function removePerson(person: KhabarShakhs) {
    if (!userId) return;
    setPersonAction(person.KhabarShakhsId);
    try { await DeleteKhabarShakhs(person.KhabarShakhsId, userId); await loadPersons(); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در حذف شخص"); }
    finally { setPersonAction(null); }
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

  async function prepareSend(rowOrCurrent?: NewsRow) {
    const newsNo = rowOrCurrent?.ShomareKhabar || form.shomareKhabar;
    if (!userId || !newsNo) return;
    setSendLoading(true);
    try {
      const r = await GetNextKhabarDestination(newsNo, userId);
      if (!r.data) throw new Error("گیرنده فعال بعدی مشخص نشد.");
      setForm((prev) => ({ ...prev, shomareKhabar: newsNo })); setSendDestination(r.data); setSendDescription(""); setSendModal(true);
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در تعیین گیرنده بعدی"); }
    finally { setSendLoading(false); }
  }

  async function confirmSend() {
    if (!userId || !form.shomareKhabar || !sendDestination) return;
    setSendLoading(true);
    try {
      const r = await SendKhabar(form.shomareKhabar, userId, sendDescription, num(sendDestination.ToUserId));
      setSendModal(false); clearLocalDraft(); resetWizard();
      showToast.success(r?.data?.StateName === "تأیید نهایی" ? "خبر در ستاد نهایی شد." : "خبر با موفقیت ارسال شد.");
      await refreshAll();
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در ارسال خبر"); }
    finally { setSendLoading(false); }
  }

  async function openReturn(rowOrCurrent?: NewsRow) {
    const newsNo = rowOrCurrent?.ShomareKhabar || form.shomareKhabar;
    if (!newsNo) return;
    setForm((prev) => ({ ...prev, shomareKhabar: newsNo })); setSelectedReturnTags([]); setReturnDescription(""); setReturnModal(true);
  }

  const returnTagOptions = useMemo(() => (returnTags || []).map((x) => ({ id: num(x.ID), title: String(x.NameFarsi || "") })).filter((x) => x.id && x.title), [returnTags]);

  async function confirmReturn() {
    if (!userId || !form.shomareKhabar) return;
    if (!selectedReturnTags.length) return showToast.warning("انتخاب حداقل یک علت برگشت اجباری است.");
    const tagText = returnTagOptions.filter((x) => selectedReturnTags.includes(x.id)).map((x) => `• ${x.title}`).join("\n");
    const fullDescription = [tagText, returnDescription.trim()].filter(Boolean).join("\n");
    setReturnSaving(true);
    try {
      await ReturnKhabar(form.shomareKhabar, userId, fullDescription, selectedReturnTags.join(","));
      setReturnModal(false); resetWizard(); showToast.success("خبر به فرستنده قبلی برگشت داده شد."); await refreshAll();
    } catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در برگشت خبر"); }
    finally { setReturnSaving(false); }
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
    try { await DeleteKhabar(deleteModal.row.ShomareKhabar, userId); setDeleteModal({open:false,row:null}); showToast.success("خبر حذف شد."); await refreshAll(); }
    catch (e) { showToast.error(e instanceof Error ? e.message : "خطا در حذف خبر"); }
    finally { setDeleteSaving(false); }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const selectedAttachment = attachments.find((x) => num(x.KhabarPeyvastId) === activeAttachment) || null;
  const selectedAttachmentUrl = selectedAttachment && userId ? GetKhabarPeyvastUrl(form.shomareKhabar, userId, selectedAttachment.FileName) : "";
  const imageAttachments = attachments.filter((item) => extKind(item.FileName) === "image");
  const canEditCurrent = wizardMode === "edit";
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
            <div><h1>مدیریت اخبار</h1><p>ثبت، کارتابل، گردش و پیگیری اخبار</p></div>
          </div>
          <button className={styles.primaryButton} type="button" onClick={openCreate}><Plus size={16}/> ثبت خبر جدید</button>
        </header>

        <div className={styles.contentArea}>
          {localDraft ? (
            <div className={styles.localDraftBanner}>
              <div><strong>پیش‌نویس محلی بازیابی‌شدنی دارید</strong><span>آخرین ذخیره محلی: {localDraft.savedAt || "—"}</span></div>
              <div className={styles.inlineActions}><button type="button" className={styles.secondaryButton} onClick={openCreate}>ادامه پیش‌نویس</button><button type="button" className={styles.dangerTextButton} onClick={clearLocalDraft}>حذف نسخه محلی</button></div>
            </div>
          ) : null}

          <div className={styles.boxTabs}>
            {[
              { id: 1 as BoxType, title: "کارتابل", count: counts.KartablCount, note: "نیازمند اقدام یا پیش‌نویس", icon: Inbox },
              { id: 2 as BoxType, title: "ارسال‌شده", count: counts.SentCount, note: "اخبار ارسال‌شده توسط شما", icon: Send },
              { id: 3 as BoxType, title: "برگشت‌شده", count: counts.ReturnedCount, note: "اخبار برگشتی در اختیار شما", icon: RotateCcw },
            ].map((tab) => {
              const Icon = tab.icon; const active = boxType === tab.id;
              return <button key={tab.id} type="button" className={`${styles.boxTab} ${active ? styles.boxTabActive : ""}`} onClick={() => { setBoxType(tab.id); setPage(1); }}>
                <span className={styles.tabIcon}><Icon size={18}/></span><span className={styles.tabText}><strong>{tab.title}</strong><small>{tab.note}</small></span><b>{tab.count}</b>
              </button>;
            })}
          </div>

          <div className={styles.toolbar}>
            <div className={styles.searchBox}><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="جستجو در شماره، عنوان یا منبع خبر..."/></div>
            <button type="button" className={styles.iconTextButton} onClick={() => void refreshAll()} disabled={loading}><RefreshCcw size={16} className={loading ? styles.spin : ""}/> به‌روزرسانی</button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>ردیف</th><th>شماره خبر</th><th className={styles.alignRight}>عنوان خبر</th><th>وضعیت</th><th className={styles.alignRight}>محل فعلی</th><th className={styles.alignRight}>سمت فعلی</th><th>آخرین تغییر</th><th>عملیات</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8}><div className={styles.loadingState}><Loader2 className={styles.spin} size={24}/> در حال دریافت اخبار...</div></td></tr> : rows.length ? rows.map((row,index) => {
                  const rowDraft = row.CurrentStatusCode === "PISHNEVIS";
                  const rowReturned = String(row.CurrentStatusCode || "").startsWith("BARGASHT_");
                  const rowInbox = bool(row.IsInbox);
                  return <tr key={row.ShomareKhabar}>
                    <td>{(page-1)*pageSize+index+1}</td><td className={styles.newsNo}>{row.ShomareKhabar}</td>
                    <td className={styles.alignRight}><div className={styles.newsTitle}>{row.OnvanKhabar || "—"}</div><small className={styles.newsMeta}>{row.NoeKhabarName || "—"} · {row.ManbaKhabarName || "—"}</small></td>
                    <td><span className={`${styles.statusBadge} ${statusTone(row.CurrentStatusCode)}`}>{statusLabel(row.CurrentStatusCode, row.CurrentStatusName)}</span></td>
                    <td className={styles.alignRight}>{row.CurrentMahalName || "—"}</td><td className={styles.alignRight}>{row.CurrentPostName || (rowDraft ? "ایجادکننده خبر" : "—")}</td><td>{currentTimeLabel(row)}</td>
                    <td><div className={styles.rowActions}>
                      {rowDraft || rowReturned ? <button title="ادامه / اصلاح" type="button" onClick={() => void openExisting(row,"edit")}><Pencil size={15}/></button> : <button title="مشاهده" type="button" onClick={() => void openExisting(row,"view")}><FileText size={15}/></button>}
                      {rowInbox && !rowDraft ? <button title="تأیید و ارسال" className={styles.approveAction} type="button" onClick={() => void prepareSend(row)} disabled={sendLoading}><CheckCircle2 size={15}/></button> : null}
                      {rowInbox && !rowDraft && !rowReturned ? <button title="برگشت" className={styles.returnAction} type="button" onClick={() => void openReturn(row)}><RotateCcw size={15}/></button> : null}
                      <button title="گردش خبر" type="button" onClick={() => void openWorkflow(row)}><History size={15}/></button>
                      {rowDraft && bool(row.IsOwner) ? <button title="حذف" className={styles.deleteAction} type="button" onClick={() => setDeleteModal({open:true,row})}><Trash2 size={15}/></button> : null}
                    </div></td>
                  </tr>;
                }) : <tr><td colSpan={8}><div className={styles.emptyState}><Newspaper size={36}/><strong>خبری در این بخش وجود ندارد</strong><span>{boxType===1?"پیش‌نویس‌های شما و خبرهای نیازمند اقدام در اینجا نمایش داده می‌شوند.":"برای این بخش موردی یافت نشد."}</span></div></td></tr>}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}><button type="button" onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={page<=1}><ChevronRight size={16}/></button><span>صفحه {page} از {pageCount}</span><button type="button" onClick={()=>setPage((p)=>Math.min(pageCount,p+1))} disabled={page>=pageCount}><ChevronLeft size={16}/></button></div>
        </div>
      </section>

      {wizardOpen ? <div className={styles.modalLayer}>
        <button className={styles.backdrop} type="button" aria-label="بستن" onClick={resetWizard}/>
        <section className={`${styles.modalCard} ${styles.wizardCard}`}>
          <header className={styles.modalHeader}><div><h2>{wizardMode === "view" ? `مشاهده خبر ${form.shomareKhabar}` : form.shomareKhabar ? `ویرایش خبر ${form.shomareKhabar}` : "ثبت خبر جدید"}</h2><span>{wizardMode === "view" ? "نمایش اطلاعات و سوابق خبر" : "اطلاعات هر مرحله به صورت مستقل ذخیره می‌شود"}</span></div><button type="button" onClick={resetWizard}><X size={18}/></button></header>

          <div className={styles.wizardSteps}>{steps.map((item) => { const Icon=item.icon; const active=step===item.id; const done=step>item.id; return <button key={item.id} type="button" disabled={wizardMode==="view" || (!form.shomareKhabar && item.id>1)} onClick={()=>{if(form.shomareKhabar)setStep(item.id)}} className={`${styles.stepItem} ${active?styles.stepActive:""} ${done?styles.stepDone:""}`}><span><Icon size={17}/></span><div><strong>{item.title}</strong><small>{item.sub}</small></div></button>; })}</div>

          <div className={styles.modalBody}>
            {step===1 ? <div className={styles.stepContent}>
              <div className={styles.formGrid3}>
                <Field label="طبقه‌بندی خبر" required error={errors.tabaqehBandi}><Dropdown value={form.tabaqehBandi} options={classificationOptions} onChange={(v)=>setField("tabaqehBandi",num(v))} disabled={!canEditCurrent} error={errors.tabaqehBandi}/></Field>
                <Field label="منبع خبر" required error={errors.manbaKhabarId}><Dropdown value={form.manbaKhabarId} options={sourceOptions} onChange={(v)=>setField("manbaKhabarId",num(v))} disabled={!canEditCurrent} error={errors.manbaKhabarId} searchable searchPlaceholder="جستجو در منابع خبر..."/></Field>
                <Field label="نوع خبر" required error={errors.noeKhabar}><Dropdown value={form.noeKhabar} options={typeOptions} onChange={(v)=>setField("noeKhabar",num(v))} disabled={!canEditCurrent} error={errors.noeKhabar}/></Field>
              </div>
              <div className={styles.formGrid3}>
                <Field label="تاریخ نامه"><input className={styles.input} disabled={!canEditCurrent} value={form.tarikhNameh} onChange={(e)=>setField("tarikhNameh",e.target.value)} placeholder="1405/07/06" maxLength={10}/></Field>
                <Field label="شماره نامه"><input className={styles.input} disabled={!canEditCurrent} value={form.shomareNameh} onChange={(e)=>setField("shomareNameh",e.target.value)} maxLength={100}/></Field>
                <Field label="تاریخ انتشار"><input className={styles.input} disabled={!canEditCurrent} value={form.tarikhEnteshar} onChange={(e)=>setField("tarikhEnteshar",e.target.value)} placeholder="1405/07/06" maxLength={10}/></Field>
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
              <div className={`${styles.personColumns} ${wizardMode!=="edit"?styles.personColumnsSingle:""}`}>
                {wizardMode==="edit" ? <div className={styles.personPanel}>
                  <div className={styles.panelMiniHeader}><strong>جستجوی افراد</strong><span>افزودن</span></div>
                  <div className={styles.personSearchBox}><div className={styles.searchBox}><Search size={17}/><input value={personSearch} onChange={(e)=>setPersonSearch(e.target.value)} placeholder="نام، نام خانوادگی یا نام پدر..."/></div>{personSearchDebounced.length<2?<span className={styles.hint}>حداقل ۲ حرف وارد کنید.</span>:null}</div>
                  {personSearchDebounced.length>=2 ? <div className={styles.searchResults}>{personLoading?<div className={styles.miniLoading}><Loader2 className={styles.spin} size={18}/> در حال جستجو...</div>:personRows.length?personRows.map((person)=><div className={styles.personResult} key={person.ShomarehParvandeh}><div><strong>{fullName(person)}</strong><span>نام پدر: {person.NamePedar || "—"} · شماره پرونده: {person.ShomarehParvandeh}</span></div><button type="button" onClick={()=>void addPerson(person)} disabled={personAction===person.ShomarehParvandeh}>{personAction===person.ShomarehParvandeh?<Loader2 className={styles.spin} size={15}/>:<UserPlus size={15}/>} افزودن</button></div>):<div className={styles.miniEmpty}>شخصی یافت نشد.</div>}</div>:<div className={styles.miniEmpty}>برای جستجو حداقل ۲ حرف وارد کنید.</div>}
                </div> : null}
                <div className={styles.linkedPanel}><div className={styles.panelMiniHeader}><strong>افراد وابسته ثبت‌شده</strong><span>{linkedPersons.length} نفر</span></div>{linkedPersons.length?<div className={styles.linkedList}>{linkedPersons.map((person)=><div className={styles.linkedPerson} key={person.KhabarShakhsId}><div className={styles.personAvatar}>{(person.FirstName||"؟").slice(0,1)}</div><div><strong>{fullName(person)}</strong><span>نام پدر: {person.NamePedar || "—"} · پرونده {person.ShomarehParvandeh}</span></div>{wizardMode==="edit"?<button type="button" onClick={()=>void removePerson(person)} disabled={personAction===person.KhabarShakhsId}><Trash2 size={15}/></button>:null}</div>)}</div>:<div className={styles.miniEmpty}>هنوز شخصی به خبر اضافه نشده است.</div>}</div>
              </div>
            </div>:null}

            {step===3 ? <div className={styles.stepContent}>
              <div className={styles.attachmentGrid}>
                <div className={styles.attachmentManager}>
                  {wizardMode==="edit"?<><input ref={fileInputRef} type="file" multiple hidden accept="image/png,image/jpeg,audio/mpeg,video/mp4,video/webm,video/quicktime" onChange={(e)=>void uploadFiles(e.target.files)}/><button type="button" className={styles.uploadBox} onClick={()=>fileInputRef.current?.click()} disabled={attachmentAction===-1}>{attachmentAction===-1?<Loader2 className={styles.spin} size={30}/>:<Upload size={30}/>}<strong>{attachmentAction===-1?"در حال بارگذاری...":"انتخاب فایل"}</strong><span>PNG, JPG, JPEG, MP3, MP4, WEBM, MOV</span></button></>:null}
                  <div className={styles.attachmentList}>{attachmentLoading?<div className={styles.miniLoading}><Loader2 className={styles.spin} size={18}/> دریافت پیوست‌ها...</div>:attachments.length?attachments.map((item)=>{const kind=extKind(item.FileName);const Icon=kind==="image"?FileImage:kind==="video"?FileVideo:kind==="audio"?FileAudio:FileText;return <button type="button" key={item.KhabarPeyvastId} className={`${styles.attachmentRow} ${activeAttachment===item.KhabarPeyvastId?styles.attachmentActive:""}`} onClick={()=>{setActiveAttachment(item.KhabarPeyvastId);setAttachmentPreviewOpen(true)}} title="مشاهده پیش‌نمایش"><span className={styles.fileIcon}><Icon size={18}/></span><span className={styles.fileInfo}><strong>{item.OriginalFileName || item.FileName}</strong><small>{formatSize(item.FileSize)} · برای پیش‌نمایش کلیک کنید</small></span>{wizardMode==="edit"?<span role="button" tabIndex={0} className={styles.fileDelete} onClick={(e)=>{e.stopPropagation();void removeAttachment(item)}}><Trash2 size={14}/></span>:null}</button>}):<div className={styles.miniEmpty}>پیوستی ثبت نشده است.</div>}</div>
                </div>
                <div className={styles.previewBox}>{selectedAttachment&&selectedAttachmentUrl?extKind(selectedAttachment.FileName)==="image"?<img src={selectedAttachmentUrl} alt="پیوست خبر"/>:extKind(selectedAttachment.FileName)==="video"?<video src={selectedAttachmentUrl} controls/>:extKind(selectedAttachment.FileName)==="audio"?<div className={styles.audioPreview}><FileAudio size={54}/><audio src={selectedAttachmentUrl} controls/></div>:<FileText size={64}/>:<div className={styles.previewEmpty}><FileImage size={46}/><span>برای پیش‌نمایش یک پیوست را انتخاب کنید.</span></div>}</div>
              </div>
            </div>:null}

            {step===4 ? <div className={styles.stepContent}>
              {detail?.LastReturnReason ? <div className={styles.returnNotice}><RotateCcw size={17}/><div><strong>آخرین علت برگشت</strong><p>{detail.LastReturnReason}</p></div></div>:null}
              <div className={styles.reviewGrid}>
                <ReviewItem label="شماره خبر" value={form.shomareKhabar || "—"}/><ReviewItem label="وضعیت" value={statusLabel(detail?.CurrentStatusCode, detail?.CurrentStatusName) || "پیش‌نویس"}/><ReviewItem label="عنوان خبر" value={form.onvanKhabar || "—"}/><ReviewItem label="منبع خبر" value={detail?.ManbaKhabarName || sourceOptions.find(x=>x.value===form.manbaKhabarId)?.label || "—"}/><ReviewItem label="نوع خبر" value={detail?.NoeKhabarName || typeOptions.find(x=>x.value===form.noeKhabar)?.label || "—"}/><ReviewItem label="تاریخ انتشار" value={form.tarikhEnteshar || "—"}/>
              </div>
              <div className={styles.reviewTexts}><div><strong>شرح خبر</strong><p>{form.sharhKhabar || "—"}</p></div><div><strong>ملاحظات</strong><p>{form.molahazatKhabar || "—"}</p></div></div>
              <div className={styles.reviewRelations}><div><div className={styles.panelMiniHeader}><strong>افراد وابسته</strong><span>{linkedPersons.length}</span></div>{linkedPersons.length?linkedPersons.map((p)=><span className={styles.relationChip} key={p.KhabarShakhsId}>{fullName(p)}</span>):<span className={styles.hint}>موردی ثبت نشده است.</span>}</div><div><div className={styles.panelMiniHeader}><strong>اسناد وابسته</strong><span>{attachments.length}</span></div>{attachments.length?attachments.map((a)=><span className={styles.relationChip} key={a.KhabarPeyvastId}>{a.OriginalFileName||a.FileName}</span>):<span className={styles.hint}>موردی ثبت نشده است.</span>}</div></div>
            </div>:null}
          </div>

          <footer className={styles.modalFooter}>
            <div>{step>1 && wizardMode==="edit"?<button type="button" className={styles.secondaryButton} onClick={()=>setStep((step-1) as WizardStep)}><ArrowRight size={15}/> مرحله قبل</button>:null}</div>
            <div className={styles.footerActions}>
              <button type="button" className={styles.secondaryButton} onClick={resetWizard}>بستن</button>
              {wizardMode==="edit" && step===1?<button type="button" className={styles.primaryButton} onClick={()=>void saveStep1()} disabled={saving}>{saving?<Loader2 className={styles.spin} size={15}/>:null} ذخیره و ادامه</button>:null}
              {wizardMode==="edit" && step===2?<button type="button" className={styles.primaryButton} onClick={()=>setStep(3)}>ذخیره مرحله و ادامه</button>:null}
              {wizardMode==="edit" && step===3?<button type="button" className={styles.primaryButton} onClick={()=>void goReview()} disabled={saving}>{saving?<Loader2 className={styles.spin} size={15}/>:null} مرور نهایی</button>:null}
              {step===4?<button type="button" className={styles.workflowButton} onClick={()=>void openWorkflow(form.shomareKhabar)}><History size={15}/> گردش خبر</button>:null}
              {step===4 && form.shomareKhabar && ((wizardMode==="edit" && (isDraft || isReturned)) || (detailIsInbox && !isReturned)) ? <button type="button" className={styles.primaryButton} onClick={()=>void prepareSend()} disabled={sendLoading}>{sendLoading?<Loader2 className={styles.spin} size={15}/>:<CheckCircle2 size={15}/>} {detail?.CurrentStatusCode==="TAEED_NAHAEI_SETAD" ? "نهایی شده" : detailIsInbox && !isDraft ? "تأیید و ارسال" : "ارسال خبر"}</button>:null}
              {step===4 && detailIsInbox && detailCanReturn && !isReturned ? <button type="button" className={styles.returnButton} onClick={()=>void openReturn()}><RotateCcw size={15}/> برگشت</button>:null}
            </div>
          </footer>
        </section>
      </div>:null}

      {attachmentPreviewOpen && selectedAttachment && selectedAttachmentUrl ? <div className={styles.attachmentPreviewLayer}>
        <button type="button" className={styles.attachmentPreviewBackdrop} aria-label="بستن پیش‌نمایش" onClick={()=>setAttachmentPreviewOpen(false)}/>
        <section className={styles.attachmentPreviewCard} role="dialog" aria-modal="true" aria-label="پیش‌نمایش سند">
          <header className={styles.attachmentPreviewHeader}>
            <div><strong>پیش‌نمایش سند</strong><span>{selectedAttachment.OriginalFileName || selectedAttachment.FileName}</span></div>
            <button type="button" onClick={()=>setAttachmentPreviewOpen(false)} aria-label="بستن"><X size={18}/></button>
          </header>
          <div className={styles.attachmentPreviewBody}>
            {imageAttachments.length ? <aside className={styles.attachmentPreviewThumbs} aria-label="تصاویر پیوست">
              <div className={styles.attachmentPreviewThumbTitle}>تصاویر <span>{imageAttachments.length}</span></div>
              <div className={styles.attachmentPreviewThumbList}>
                {imageAttachments.map((item) => {
                  const imageUrl = userId ? GetKhabarPeyvastUrl(form.shomareKhabar, userId, item.FileName) : "";
                  const active = num(item.KhabarPeyvastId) === activeAttachment;
                  return <button type="button" key={item.KhabarPeyvastId} className={`${styles.attachmentPreviewThumb} ${active ? styles.attachmentPreviewThumbActive : ""}`} onClick={() => setActiveAttachment(num(item.KhabarPeyvastId))} title={item.OriginalFileName || item.FileName}>
                    {imageUrl ? <img src={imageUrl} alt={item.OriginalFileName || item.FileName}/> : <FileImage size={20}/>}
                  </button>;
                })}
              </div>
            </aside> : null}
            <div className={styles.attachmentPreviewMain}>
              {extKind(selectedAttachment.FileName)==="image" ? <img className={styles.attachmentPreviewMedia} src={selectedAttachmentUrl} alt={selectedAttachment.OriginalFileName || selectedAttachment.FileName}/> : extKind(selectedAttachment.FileName)==="video" ? <video className={styles.attachmentPreviewMedia} src={selectedAttachmentUrl} controls autoPlay/> : extKind(selectedAttachment.FileName)==="audio" ? <div className={styles.attachmentPreviewAudio}><FileAudio size={60}/><strong>{selectedAttachment.OriginalFileName || selectedAttachment.FileName}</strong><audio src={selectedAttachmentUrl} controls autoPlay/></div> : <div className={styles.attachmentPreviewUnsupported}><FileText size={58}/><span>پیش‌نمایش این نوع سند در برنامه پشتیبانی نمی‌شود.</span></div>}
            </div>
          </div>
        </section>
      </div> : null}

      {hotspotModal?<SimpleModal title="افزودن نقطه خبرخیز" onClose={()=>setHotspotModal(false)}><Field label="عنوان نقطه خبرخیز" required><input autoFocus className={styles.input} value={hotspotTitle} onChange={(e)=>setHotspotTitle(e.target.value)} maxLength={300}/></Field><div className={styles.simpleActions}><button type="button" className={styles.secondaryButton} onClick={()=>setHotspotModal(false)}>انصراف</button><button type="button" className={styles.primaryButton} onClick={()=>void addHotspot()} disabled={hotspotSaving}>{hotspotSaving?<Loader2 className={styles.spin} size={15}/>:null} ثبت</button></div></SimpleModal>:null}

      {sendModal?<SimpleModal title="تأیید و ارسال خبر" onClose={()=>!sendLoading&&setSendModal(false)} wide><div className={styles.destinationCard}><span className={styles.destinationIcon}><Send size={22}/></span><div><small>{sendDestination?.IsFinal?"اقدام نهایی":"گیرنده فعال بعدی"}</small><strong>{sendDestination?.IsFinal?"تأیید نهایی خبر در ستاد":sendDestination?.ToFullName || "—"}</strong><p>{sendDestination?.IsFinal?`${sendDestination?.ToOnvanPost || "کارشناس اخبار ستاد"} · ${sendDestination?.ToNameMahal || "ستاد"}`:[sendDestination?.ToOnvanPost,sendDestination?.ToNameMahal].filter(Boolean).join(" · ") || "—"}</p></div></div><Field label="توضیحات ارسال"><textarea className={styles.textareaSmall} value={sendDescription} onChange={(e)=>setSendDescription(e.target.value)} placeholder="توضیحات اختیاری..."/></Field><div className={styles.confirmText}>آیا از {sendDestination?.IsFinal?"تأیید نهایی این خبر":"ارسال خبر به گیرنده فوق"} اطمینان دارید؟</div><div className={styles.simpleActions}><button type="button" className={styles.secondaryButton} onClick={()=>setSendModal(false)} disabled={sendLoading}>انصراف</button><button type="button" className={styles.primaryButton} onClick={()=>void confirmSend()} disabled={sendLoading}>{sendLoading?<Loader2 className={styles.spin} size={15}/>:<CheckCircle2 size={15}/>} تأیید</button></div></SimpleModal>:null}

      {returnModal?<SimpleModal title="برگشت خبر" onClose={()=>!returnSaving&&setReturnModal(false)} wide><p className={styles.modalIntro}>انتخاب حداقل یک علت برگشت اجباری است.</p><div className={styles.tagList}>{returnTagOptions.map((tag)=>{const active=selectedReturnTags.includes(tag.id);return <button key={tag.id} type="button" className={`${styles.returnTag} ${active?styles.returnTagActive:""}`} onClick={()=>setSelectedReturnTags((prev)=>active?prev.filter((id)=>id!==tag.id):[...prev,tag.id])}><CircleDot size={13}/>{tag.title}</button>})}</div>{!returnTagOptions.length?<div className={styles.warningBox}>برای PID=71104 تگ علت برگشت تعریف نشده است.</div>:null}<Field label="توضیح تکمیلی"><textarea className={styles.textareaSmall} value={returnDescription} onChange={(e)=>setReturnDescription(e.target.value)} placeholder="در صورت نیاز توضیح تکمیلی وارد کنید..."/></Field><div className={styles.simpleActions}><button type="button" className={styles.secondaryButton} onClick={()=>setReturnModal(false)} disabled={returnSaving}>انصراف</button><button type="button" className={styles.returnButton} onClick={()=>void confirmReturn()} disabled={returnSaving||!selectedReturnTags.length}>{returnSaving?<Loader2 className={styles.spin} size={15}/>:<RotateCcw size={15}/>} ثبت برگشت</button></div></SimpleModal>:null}

      {workflowModal?<SimpleModal title={`گردش خبر ${workflowSummary?.ShomareKhabar || ""}`} onClose={()=>setWorkflowModal(false)} extraWide><div className={styles.workflowCurrent}>{workflowSummary?<><div><small>وضعیت فعلی</small><strong>{statusLabel(workflowSummary.CurrentStatusCode, workflowSummary.CurrentStatusName) || "—"}</strong></div><div><small>در اختیار</small><strong>{[workflowSummary.CurrentUserName,workflowSummary.CurrentPostName,workflowSummary.CurrentMahalName].filter(Boolean).join(" · ") || "—"}</strong></div><div><small>زمان آخرین وضعیت</small><strong>{workflowSummary.StatusDateTime || "—"}</strong></div></>:null}</div>{workflowLoading?<div className={styles.loadingState}><Loader2 className={styles.spin} size={23}/> در حال دریافت گردش...</div>:<div className={styles.timeline}>{workflowLogs.map((log,index)=><div className={styles.timelineItem} key={`${log.LogId}-${index}`}><span className={styles.timelineDot}/><div className={styles.timelineCard}><div className={styles.timelineTop}><strong>{log.NoeEghdam || "اقدام"}</strong><time>{log.CreateDateTime || "—"}</time></div><div className={styles.routeLine}><span>{[log.FromUserName,log.FromPostName,log.FromMahalName].filter(Boolean).join(" · ") || "شروع"}</span><ChevronLeft size={15}/><span>{[log.ToUserName,log.ToPostName,log.ToMahalName].filter(Boolean).join(" · ") || "—"}</span></div>{log.Tozihat?<p>{log.Tozihat}</p>:null}</div></div>)}</div>}</SimpleModal>:null}

      {deleteModal.open?<SimpleModal title="حذف خبر" onClose={()=>!deleteSaving&&setDeleteModal({open:false,row:null})}><div className={styles.confirmText}>خبر شماره <b>{deleteModal.row?.ShomareKhabar}</b> حذف شود؟ حذف فقط برای پیش‌نویس ایجادشده توسط خود شما مجاز است.</div><div className={styles.simpleActions}><button type="button" className={styles.secondaryButton} onClick={()=>setDeleteModal({open:false,row:null})}>انصراف</button><button type="button" className={styles.dangerButton} onClick={()=>void confirmDelete()} disabled={deleteSaving}>{deleteSaving?<Loader2 className={styles.spin} size={15}/>:<Trash2 size={15}/>} حذف</button></div></SimpleModal>:null}
    </div>
  );
}

function Field({label,required,error,children}:{label:string;required?:boolean;error?:boolean;children:ReactNode}){
  return <label className={styles.field}><span>{label}{required?<b>*</b>:null}</span>{children}{error?<small className={styles.errorText}>این فیلد اجباری است.</small>:null}</label>;
}

function ReviewItem({label,value}:{label:string;value:ReactNode}){
  return <div className={styles.reviewItem}><span>{label}</span><strong>{value}</strong></div>;
}

function SimpleModal({title,onClose,children,wide,extraWide}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean;extraWide?:boolean}){
  return <div className={styles.modalLayer}><button className={styles.backdrop} type="button" aria-label="بستن" onClick={onClose}/><section className={`${styles.modalCard} ${wide?styles.simpleWide:""} ${extraWide?styles.simpleExtraWide:""}`}><header className={styles.modalHeader}><div><h2>{title}</h2></div><button type="button" onClick={onClose}><X size={18}/></button></header><div className={styles.simpleBody}>{children}</div></section></div>;
}

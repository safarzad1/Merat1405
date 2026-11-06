"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Check, Clock3, Landmark, Loader2, MapPin, Plus, Save, Search, Pencil, ChevronRight, ChevronLeft, Trash2, UserPlus2, Users2, X } from "lucide-react";
import { Dropdown } from "@/component/Dropdown";
import { useMeratUser } from "@/lib/useMeratUser";
import styles from "./InteractionEditor.module.css";
import PersianCalendar from "./PersianCalendar";

type Option = { value: number; label: string; description?: string };
type InteractionForm = {
  InteractionId: number;
  MeetingDate: string;
  FromTime: string;
  ToTime: string;
  OrganizationGroupId: number | null;
  OrganizationId: number | null;
  LocationId: number | null;
  LocationDescription: string;
  SummaryText: string;
  ResultText: string;
};
type InteractionPerson = {
  ItemId: number;
  FullName: string;
  RankTitle: string;
  PositionTitle: string;
  Notes: string;
};
type OfficeRepresentative = {
  ItemId: number;
  RoleId: number | null;
  RoleTitle?: string;
  RepresentativeId: number | null;
  FullName?: string;
  Notes: string;
};

type GridItem = InteractionForm & { GroupTitle: string; OrganizationTitle: string; LocationTitle: string; PersonsCount: number; RepresentativesCount: number };
type Lookups = {
  groups: Option[];
  organizations: (Option & { groupId?: number })[];
  locations: Option[];
  roleOptions: Option[];
  representativeOptions: (Option & { roleId?: number })[];
};

const emptyForm: InteractionForm = {
  InteractionId: 0,
  MeetingDate: "",
  FromTime: "",
  ToTime: "",
  OrganizationGroupId: null,
  OrganizationId: null,
  LocationId: null,
  LocationDescription: "",
  SummaryText: "",
  ResultText: "",
};
const emptyPerson: InteractionPerson = { ItemId: 0, FullName: "", RankTitle: "", PositionTitle: "", Notes: "" };
const emptyRepresentative: OfficeRepresentative = { ItemId: 0, RoleId: null, RepresentativeId: null, Notes: "" };
const emptyLookups: Lookups = { groups: [], organizations: [], locations: [], roleOptions: [], representativeOptions: [] };

async function query(body: Record<string, unknown>) {
  const res = await fetch("/Api/Taamol/InteractionEditor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status !== 200) throw new Error(json.error || "خطا در ارتباط با سرور");
  return json.data;
}

function normalizeOptions(rows: any[] = [], labelKeys: string[] = ["Title", "label", "Name"]) {
  return rows.map((row) => ({
    value: Number(row.value ?? row.ID ?? row.Id ?? row.OrganizationId ?? row.LocationId ?? row.GroupId ?? row.RoleId ?? row.RepresentativeId ?? 0),
    label: String(labelKeys.map((key) => row?.[key]).find((v) => v != null && String(v).trim()) ?? "").trim(),
    description: row?.Description ? String(row.Description) : undefined,
    groupId: row?.GroupId != null ? Number(row.GroupId) : row?.OrganizationGroupId != null ? Number(row.OrganizationGroupId) : undefined,
    roleId: row?.RoleId != null ? Number(row.RoleId) : undefined,
  })).filter((item) => item.value > 0 && item.label);
}

// ورود ساعت بدون نیاز به تایپ جداکننده؛ 0830 -> 08:30
// ارقام فارسی و عربی نیز به ارقام استاندارد تبدیل می‌شوند.
function formatTimeInput(value: string): string {
  const digits = value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "")
    .slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

export default function InteractionEditor() {
  const user = useMeratUser();
  const [form, setForm] = useState<InteractionForm>(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [grid, setGrid] = useState<GridItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [gridBusy, setGridBusy] = useState(false);
  const [lookups, setLookups] = useState<Lookups>(emptyLookups);
  const [people, setPeople] = useState<InteractionPerson[]>([]);
  const [representatives, setRepresentatives] = useState<OfficeRepresentative[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [personDraft, setPersonDraft] = useState<InteractionPerson>(emptyPerson);
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [repDraft, setRepDraft] = useState<OfficeRepresentative>(emptyRepresentative);

  const selectedGroupOrganizations = useMemo(
    () => lookups.organizations.filter((item) => !form.OrganizationGroupId || item.groupId === form.OrganizationGroupId),
    [lookups.organizations, form.OrganizationGroupId],
  );

  const representativeNames = useMemo(
    () => lookups.representativeOptions.filter((item) => !repDraft.RoleId || item.roleId === repDraft.RoleId),
    [lookups.representativeOptions, repDraft.RoleId],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await query({ action: "bootstrap" });
      setLookups({
        groups: normalizeOptions(data.groups, ["Title", "GroupTitle"]),
        organizations: normalizeOptions(data.organizations, ["Title", "OrganizationTitle"]),
        locations: normalizeOptions(data.locations, ["Title", "LocationTitle"]),
        roleOptions: normalizeOptions(data.roles, ["Title", "RoleTitle"]),
        representativeOptions: normalizeOptions(data.representatives, ["FullName", "Title"]),
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const loadGrid = useCallback(async () => {
    setGridBusy(true);
    try {
      const data = await query({ action: "list", search, page, sizePage: 15 });
      setGrid(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total || 0));
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت فهرست تعاملات"); }
    finally { setGridBusy(false); }
  }, [search, page]);
  useEffect(() => { void loadGrid(); }, [loadGrid]);
  const openNew = () => {
    setForm({ ...emptyForm }); setPeople([]); setRepresentatives([]);
    setNotice(""); setError(""); setEditorOpen(true);
  };
  const openEdit = async (id: number) => {
    setGridBusy(true); setError("");
    try {
      const data = await query({ action: "get", interactionId: id });
      setForm({ ...emptyForm, ...(data.interaction || {}) });
      setPeople(Array.isArray(data.people) ? data.people : []);
      setRepresentatives(Array.isArray(data.representatives) ? data.representatives : []);
      setEditorOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت تعامل"); }
    finally { setGridBusy(false); }
  };

  const validateMain = () => {
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(form.MeetingDate.trim())) return "تاریخ برگزاری باید از تقویم شمسی انتخاب شود.";
    if (!form.FromTime.trim()) return "ساعت شروع الزامی است.";
    if (!form.ToTime.trim()) return "ساعت پایان الزامی است.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.FromTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.ToTime)) return "قالب ساعت نامعتبر است.";
    if (form.ToTime <= form.FromTime) return "ساعت پایان باید بعد از ساعت شروع باشد.";
    if (!form.OrganizationGroupId) return "انتخاب گروه سازمان الزامی است.";
    if (!form.OrganizationId) return "انتخاب نام سازمان الزامی است.";
    if (!form.SummaryText.trim()) return "خلاصه مباحث مطروحه الزامی است.";
    return "";
  };

  const saveMain = async () => {
    const validation = validateMain();
    if (validation) throw new Error(validation);
    if (!user.UserId) throw new Error("کاربر جاری شناسایی نشد.");
    const data = await query({ action: "saveInteraction", userId: user.UserId, interaction: form });
    setForm((prev) => ({ ...prev, InteractionId: Number(data?.InteractionId || prev.InteractionId || 0) }));
    return Number(data?.InteractionId || form.InteractionId || 0);
  };

  const handleSaveMain = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const id = await saveMain();
      setNotice(id > 0 ? "اطلاعات تعامل ذخیره شد." : "اطلاعات ذخیره شد.");
      void loadGrid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ذخیره اطلاعات");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerson = async () => {
    setError("");
    try {
      if (!personDraft.FullName.trim()) throw new Error("نام کامل فرد الزامی است.");
      const interactionId = form.InteractionId || await saveMain();
      const saved = await query({ action: "savePerson", userId: user.UserId, interactionId, item: personDraft });
      const item = { ...personDraft, ...saved, ItemId: Number(saved?.ItemId || personDraft.ItemId || 0) };
      setPeople((prev) => personDraft.ItemId ? prev.map((x) => x.ItemId === item.ItemId ? item : x) : [item, ...prev]);
      setNotice(personDraft.ItemId ? "فرد مورد تعامل ویرایش شد." : "فرد مورد تعامل ثبت شد.");
      setPersonModalOpen(false);
      setPersonDraft(emptyPerson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت فرد مورد تعامل");
    }
  };

  const handleDeletePerson = async (itemId: number) => {
    if (!itemId || !await meratConfirm("آیا از حذف این فرد اطمینان دارید؟")) return;
    try {
      await query({ action: "deletePerson", userId: user.UserId, interactionId: form.InteractionId, itemId });
      setPeople((prev) => prev.filter((item) => item.ItemId !== itemId));
      setNotice("فرد مورد تعامل حذف شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در حذف فرد مورد تعامل");
    }
  };

  const handleSaveRepresentative = async () => {
    setError("");
    try {
      if (!repDraft.RoleId) throw new Error("انتخاب سمت نماینده الزامی است.");
      if (!repDraft.RepresentativeId) throw new Error("انتخاب نام نماینده الزامی است.");
      const interactionId = form.InteractionId || await saveMain();
      const saved = await query({ action: "saveRepresentative", userId: user.UserId, interactionId, item: repDraft });
      const roleTitle = lookups.roleOptions.find((x) => x.value === (saved?.RoleId ?? repDraft.RoleId))?.label || repDraft.RoleTitle || "";
      const fullName = lookups.representativeOptions.find((x) => x.value === (saved?.RepresentativeId ?? repDraft.RepresentativeId))?.label || repDraft.FullName || "";
      const item = { ...repDraft, ...saved, RoleTitle: roleTitle, FullName: fullName, ItemId: Number(saved?.ItemId || repDraft.ItemId || 0) };
      setRepresentatives((prev) => repDraft.ItemId ? prev.map((x) => x.ItemId === item.ItemId ? item : x) : [item, ...prev]);
      setNotice(repDraft.ItemId ? "نماینده دفتر نظارت ویرایش شد." : "نماینده دفتر نظارت ثبت شد.");
      setRepModalOpen(false);
      setRepDraft(emptyRepresentative);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت نماینده");
    }
  };

  const handleDeleteRepresentative = async (itemId: number) => {
    if (!itemId || !await meratConfirm("آیا از حذف این نماینده اطمینان دارید؟")) return;
    try {
      await query({ action: "deleteRepresentative", userId: user.UserId, interactionId: form.InteractionId, itemId });
      setRepresentatives((prev) => prev.filter((item) => item.ItemId !== itemId));
      setNotice("نماینده دفتر نظارت حذف شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در حذف نماینده");
    }
  };

  return (
    <section className={styles.page} dir="rtl">
      <header className={styles.pageHeader}>
        <div><h1>فهرست تعاملات</h1><p>مدیریت تعامل با سازمان‌ها</p></div>
        <button type="button" className={styles.primaryButton} onClick={openNew}><Plus size={17}/> افزودن تعامل</button>
      </header>
      <div className={styles.gridCard}>
        <div className={styles.gridToolbar}>
          <label className={styles.searchBox}><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="جستجو در سازمان، تاریخ یا مباحث..." /></label>
          <span>{total.toLocaleString("fa-IR")} تعامل ثبت‌شده</span>
        </div>
        <div className={styles.gridScroll}><table className={styles.gridTable}><thead><tr><th>ردیف</th><th>تاریخ</th><th>ساعت</th><th>گروه سازمان</th><th>نام سازمان</th><th>مکان جلسه</th><th>افراد</th><th>نمایندگان</th><th>عملیات</th></tr></thead><tbody>
          {grid.map((item,i)=><tr key={item.InteractionId}><td>{(page-1)*15+i+1}</td><td>{item.MeetingDate}</td><td dir="ltr">{item.FromTime} - {item.ToTime}</td><td>{item.GroupTitle}</td><td>{item.OrganizationTitle}</td><td>{item.LocationTitle || item.LocationDescription || "—"}</td><td>{item.PersonsCount}</td><td>{item.RepresentativesCount}</td><td><button className={styles.editAction} type="button" onClick={()=>void openEdit(item.InteractionId)}><Pencil size={15}/> ویرایش</button></td></tr>)}
          {!gridBusy&&grid.length===0&&<tr><td colSpan={9} className={styles.emptyGrid}>تعامل ثبت‌شده‌ای یافت نشد.</td></tr>}
          {gridBusy&&<tr><td colSpan={9} className={styles.emptyGrid}>در حال دریافت اطلاعات...</td></tr>}
        </tbody></table></div>
        <div className={styles.pager}><span>صفحه {page.toLocaleString("fa-IR")} از {Math.max(1,Math.ceil(total/15)).toLocaleString("fa-IR")}</span><div><button disabled={page<=1||gridBusy} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronRight size={16}/> قبلی</button><button disabled={page>=Math.ceil(total/15)||gridBusy} onClick={()=>setPage(p=>p+1)}>بعدی <ChevronLeft size={16}/></button></div></div>
      </div>
      {error&&!editorOpen&&<div className={styles.errorBox}>{error}</div>}
      {editorOpen&&<div className={styles.editorBackdrop}><div className={styles.editorModal} role="dialog" aria-modal="true" aria-label="فرم تعامل">
        <div className={styles.editorHeader}><h2>{form.InteractionId?"ویرایش تعامل":"افزودن تعامل جدید"}</h2><button type="button" onClick={()=>{setEditorOpen(false);void loadGrid();}} aria-label="بستن"><X size={19}/></button></div>
        <div className={styles.editorContent}>
      <div className={styles.formCard}>
        <div className={styles.cardTitle}><Landmark size={18} /> اطلاعات اصلی تعامل</div>
        <div className={styles.formGrid}>
          <div className={styles.field}><span>تاریخ برگزاری <em>*</em></span><PersianCalendar value={form.MeetingDate} onChange={(date)=>setForm(p=>({...p,MeetingDate:date}))}/></div>
          <label className={styles.field}><span>از ساعت <em>*</em></span><div className={styles.inputWrap}><Clock3 size={16} /><input value={form.FromTime} onChange={(e) => setForm((p) => ({ ...p, FromTime: formatTimeInput(e.target.value) }))} placeholder="08:00" maxLength={5} /></div></label>
          <label className={styles.field}><span>تا ساعت <em>*</em></span><div className={styles.inputWrap}><Clock3 size={16} /><input value={form.ToTime} onChange={(e) => setForm((p) => ({ ...p, ToTime: formatTimeInput(e.target.value) }))} placeholder="10:30" maxLength={5} /></div></label>
          <label className={styles.field}><span>گروه سازمان <em>*</em></span><Dropdown value={form.OrganizationGroupId ?? ""} onChange={(v) => setForm((p) => ({ ...p, OrganizationGroupId: Number(v) || null, OrganizationId: null }))} options={lookups.groups} placeholder="انتخاب گروه سازمان" searchable /></label>
          <label className={styles.field}><span>نام سازمان <em>*</em></span><Dropdown value={form.OrganizationId ?? ""} onChange={(v) => setForm((p) => ({ ...p, OrganizationId: Number(v) || null }))} options={selectedGroupOrganizations} placeholder="انتخاب نام سازمان" searchable /></label>
          <label className={styles.field}><span>مکان جلسه</span><Dropdown value={form.LocationId ?? ""} onChange={(v) => setForm((p) => ({ ...p, LocationId: Number(v) || null }))} options={lookups.locations} placeholder="انتخاب محل جلسه" searchable /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>توضیحات مکان جلسه</span><div className={styles.inputWrap}><MapPin size={16} /><input value={form.LocationDescription} onChange={(e) => setForm((p) => ({ ...p, LocationDescription: e.target.value }))} placeholder="در صورت نیاز توضیح تکمیلی ثبت شود" maxLength={500} /></div></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>خلاصه مباحث مطروحه <em>*</em></span><textarea rows={5} value={form.SummaryText} onChange={(e) => setForm((p) => ({ ...p, SummaryText: e.target.value }))} placeholder="خلاصه مباحث مطروحه در جلسه را ثبت کنید..." /></label>
          <label className={`${styles.field} ${styles.fullWidth}`}><span>نتایج جلسه یا مصوبات</span><textarea rows={5} value={form.ResultText} onChange={(e) => setForm((p) => ({ ...p, ResultText: e.target.value }))} placeholder="نتایج، جمع‌بندی یا مصوبات جلسه را ثبت کنید..." /></label>
        </div>
        <div className={styles.summaryRow}>
          <SummaryItem label="فرد مورد تعامل" value={String(people.length)} />
          <SummaryItem label="نماینده دفتر نظارت" value={String(representatives.length)} />
          <SummaryItem label="وضعیت رکورد" value={form.InteractionId ? `ثبت شده (#${form.InteractionId})` : "ثبت اولیه نشده"} />
        </div>
      </div>

      <div className={styles.sectionGrid}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div><h2><Users2 size={18} /> افراد مورد تعامل</h2><p>ثبت اشخاص حاضر یا طرف گفت‌وگو در این تعامل</p></div>
            <button type="button" className={styles.secondaryButton} onClick={() => { setPersonDraft(emptyPerson); setPersonModalOpen(true); }}><Plus size={16} /> ثبت فرد جدید</button>
          </div>
          <div className={styles.listWrap}>
            {people.length === 0 ? <div className={styles.emptyState}>هنوز فردی برای این تعامل ثبت نشده است.</div> : people.map((item) => (
              <article key={item.ItemId || `${item.FullName}-${item.PositionTitle}`} className={styles.infoCard}>
                <button type="button" className={styles.deleteButton} onClick={() => void handleDeletePerson(item.ItemId)} aria-label="حذف"><Trash2 size={16} /></button>
                <div className={styles.infoCardHeader}><UserPlus2 size={17} /><strong>{item.FullName}</strong></div>
                <div className={styles.metaGrid}>
                  <SummaryItem label="رده سازمانی" value={item.RankTitle} />
                  <SummaryItem label="سمت" value={item.PositionTitle} />
                </div>
                {item.Notes ? <p className={styles.notesText}>{item.Notes}</p> : null}
                <div className={styles.inlineActions}><button type="button" onClick={() => { setPersonDraft(item); setPersonModalOpen(true); }}>ویرایش</button></div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div><h2><Building2 size={18} /> نمایندگان دفتر نظارت در تعامل</h2><p>ثبت نمایندگان شرکت‌کننده از دفتر نظارت</p></div>
            <button type="button" className={styles.secondaryButton} onClick={() => { setRepDraft(emptyRepresentative); setRepModalOpen(true); }}><Plus size={16} /> ثبت نماینده جدید</button>
          </div>
          <div className={styles.listWrap}>
            {representatives.length === 0 ? <div className={styles.emptyState}>هنوز نماینده‌ای برای این تعامل ثبت نشده است.</div> : representatives.map((item) => (
              <article key={item.ItemId || `${item.FullName}-${item.RoleTitle}`} className={styles.infoCard}>
                <button type="button" className={styles.deleteButton} onClick={() => void handleDeleteRepresentative(item.ItemId)} aria-label="حذف"><Trash2 size={16} /></button>
                <div className={styles.infoCardHeader}><Building2 size={17} /><strong>{item.FullName || "—"}</strong></div>
                <div className={styles.metaGrid}>
                  <SummaryItem label="عنوان مسئولیت" value={item.RoleTitle || "—"} />
                </div>
                {item.Notes ? <p className={styles.notesText}>{item.Notes}</p> : null}
                <div className={styles.inlineActions}><button type="button" onClick={() => { setRepDraft(item); setRepModalOpen(true); }}>ویرایش</button></div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {error ? <div className={styles.errorBox}><X size={16} />{error}</div> : null}
      {notice ? <div className={styles.successBox}><Check size={16} />{notice}</div> : null}

      {personModalOpen ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={`${styles.modalHeader} merat-modal-tone--neutral`}><h3>{personDraft.ItemId ? "ویرایش فرد مورد تعامل" : "ثبت افراد مورد تعامل"}</h3><button type="button" onClick={() => setPersonModalOpen(false)}><X size={18} /></button></div>
            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <label className={styles.field}><span>نام کامل</span><input value={personDraft.FullName} onChange={(e) => setPersonDraft((p) => ({ ...p, FullName: e.target.value }))} maxLength={150} /></label>
                <label className={styles.field}><span>رده سازمانی</span><input value={personDraft.RankTitle} onChange={(e) => setPersonDraft((p) => ({ ...p, RankTitle: e.target.value }))} maxLength={150} /></label>
                <label className={styles.field}><span>سمت</span><input value={personDraft.PositionTitle} onChange={(e) => setPersonDraft((p) => ({ ...p, PositionTitle: e.target.value }))} maxLength={150} /></label>
                <label className={`${styles.field} ${styles.fullWidth}`}><span>توضیحات</span><textarea rows={4} value={personDraft.Notes} onChange={(e) => setPersonDraft((p) => ({ ...p, Notes: e.target.value }))} maxLength={1000} /></label>
              </div>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondaryPlain} onClick={() => setPersonModalOpen(false)}>بستن</button><button type="button" className={styles.primaryButton} onClick={() => void handleSavePerson()}><Save size={16} />ثبت فرد</button></div>
          </div>
        </div>
      ) : null}

      {repModalOpen ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={`${styles.modalHeader} merat-modal-tone--neutral`}><h3>{repDraft.ItemId ? "ویرایش نماینده دفتر نظارت" : "مشخصات نمایندگان دفتر نظارت"}</h3><button type="button" onClick={() => setRepModalOpen(false)}><X size={18} /></button></div>
            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                <label className={styles.field}><span>سمت</span><Dropdown value={repDraft.RoleId ?? ""} onChange={(v) => setRepDraft((p) => ({ ...p, RoleId: Number(v) || null, RepresentativeId: null }))} options={lookups.roleOptions} placeholder="انتخاب سمت" searchable /></label>
                <label className={styles.field}><span>نام کامل</span><Dropdown value={repDraft.RepresentativeId ?? ""} onChange={(v) => setRepDraft((p) => ({ ...p, RepresentativeId: Number(v) || null }))} options={representativeNames} placeholder="انتخاب نام نماینده" searchable /></label>
                <label className={`${styles.field} ${styles.fullWidth}`}><span>توضیحات</span><textarea rows={4} value={repDraft.Notes} onChange={(e) => setRepDraft((p) => ({ ...p, Notes: e.target.value }))} maxLength={1000} /></label>
              </div>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondaryPlain} onClick={() => setRepModalOpen(false)}>بستن</button><button type="button" className={styles.primaryButton} onClick={() => void handleSaveRepresentative()}><Save size={16} />ثبت نماینده</button></div>
          </div>
        </div>
      ) : null}

        </div>
        <div className={styles.editorFooter}><button className={styles.secondaryPlain} onClick={()=>{setEditorOpen(false);void loadGrid();}}>بستن</button><button disabled={saving} className={styles.primaryButton} onClick={()=>void handleSaveMain()}><Save size={17}/> ذخیره تعامل</button></div>
        </div>
      </div>}
      {loading ? <div className={styles.loadingOverlay}><Loader2 size={24} className={styles.spin} />در حال دریافت اطلاعات...</div> : null}
    </section>
  );
}

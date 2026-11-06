"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import { showToast } from "@/component/CustomToast";
import { ProvinceInvestigatorEvidence, ProvinceInvestigatorSummary } from "./ProvinceInvestigatorEvidence";
import s from "./ProvinceInvestigatorWorksheetEditor.module.css";

type Form = {
  tahghighType: string; typeMahalTahghigh: string; codeManba: string;
  nahveAshnai: string; azSal: string; taSal: string;
  noeParvandeh: string; nahveBazkhani: string;
  nameSazman: string; nameShahr: string; peyvastCount: string; description: string;
};
const empty: Form = {
  tahghighType:"", typeMahalTahghigh:"", codeManba:"", nahveAshnai:"", azSal:"", taSal:"",
  noeParvandeh:"", nahveBazkhani:"", nameSazman:"", nameShahr:"", peyvastCount:"", description:"",
};
const txt = (v: unknown) => v == null ? "" : String(v);
const num = (v: unknown) => Number(v ?? 0);
const digits = (v: string) => v.replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 1776))
  .replace(/[٠-٩]/g, ch => String(ch.charCodeAt(0) - 1632));
const currentPersianYear = () => {
  try {
    const y = new Intl.DateTimeFormat("en-US-u-ca-persian", {year:"numeric"}).format(new Date());
    return Number(y) || 1500;
  } catch { return 1500; }
};


// A reusable Persian combobox: its option list is portaled to document.body,
// so it overlays form fields without changing modal height or being clipped by overflow.
type LookupOption = { value: string; label: string };
type PickerPosition = { top: number; left: number; width: number; maxHeight: number };
function WorksheetCustomSelect({ id, label, required, options: items, value, onChange, disabled }: {
  id: string; label: string; required?: boolean; options: LookupOption[];
  value: string; onChange: (next: string) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = `${id}-choices`;
  const labelId = `${id}-label`;

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("fa-IR").replace(/ي/g, "ی").replace(/ك/g, "ک");
    return items.filter(item => item.label.toLocaleLowerCase("fa-IR")
      .replace(/ي/g, "ی").replace(/ك/g, "ک").includes(q));
  }, [items, search]);
  const visible = filtered.slice(0, search.trim() ? 12 : 8);
  const selected = items.find(item => item.value === value);

  const updatePosition = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const scrollContainer = trigger.closest<HTMLElement>('[data-worksheet-modal-scroll="true"]');
    const scrollRect = scrollContainer?.getBoundingClientRect();
    // Close when the field itself has scrolled out of the visible modal area.
    if (scrollRect && (rect.bottom <= scrollRect.top || rect.top >= scrollRect.bottom)) {
      setOpen(false);
      return;
    }
    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const below = Math.max(0, window.innerHeight - rect.bottom - 12);
    const above = Math.max(0, rect.top - 12);
    const estimated = Math.min(322, 62 + visible.length * 37 + (filtered.length > visible.length ? 30 : 0));
    const openUp = below < Math.min(estimated, 200) && above > below;
    const available = openUp ? above : below;
    const maxHeight = Math.max(0, Math.min(estimated, available - 4));
    const top = openUp ? rect.top - maxHeight - 5 : rect.bottom + 5;
    setPosition({ top: Math.max(8, top), left, width, maxHeight });
  }, [visible.length, filtered.length]);

  useEffect(() => {
    if (!open) { setPosition(null); return; }
    updatePosition();
    const onOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
        setSearch("");
      }
    };
    // Capture scroll events from the modal body (also resize of the browser).
    // The menu remains visually attached to its trigger while scrolling.
    const reposition = () => updatePosition();
    document.addEventListener("pointerdown", onOutside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    const focusFrame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      cancelAnimationFrame(focusFrame);
    };
  }, [open, updatePosition]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const choose = (item: LookupOption) => {
    onChange(item.value);
    setOpen(false); setSearch(""); setActiveIndex(0);
    requestAnimationFrame(() => buttonRef.current?.focus());
  };
  const handleKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault(); event.stopPropagation();
      setOpen(false); setSearch(""); buttonRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); setActiveIndex(0); }
      else setActiveIndex(i => Math.min(Math.max(0, i + (event.key === "ArrowDown" ? 1 : -1)), Math.max(0, visible.length - 1)));
    } else if (event.key === "Enter" && open && visible.length > 0) {
      event.preventDefault(); choose(visible[Math.min(activeIndex, visible.length - 1)]);
    } else if (event.key === "Home" && open) {
      event.preventDefault(); setActiveIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault(); setActiveIndex(Math.max(visible.length - 1, 0));
    } else if (event.key === "Tab" && open) {
      setOpen(false); setSearch("");
      // Portaled list items are outside the modal's DOM focus trap. Return
      // focus to the combobox so the next Tab moves through normal form fields.
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) {
        event.preventDefault();
        buttonRef.current?.focus();
      }
    }
  };
  return <div className={s.label}>
    <span className={s.labelText} id={labelId}>{label}{required && <em aria-label="الزامی">*</em>}</span>
    <div className={s.picker} ref={rootRef} onKeyDown={handleKeys}
      data-worksheet-select-open={open ? "true" : undefined}>
      <button id={id} ref={buttonRef} type="button" role="combobox"
        aria-labelledby={labelId} aria-controls={listId} aria-expanded={open} aria-haspopup="listbox"
        disabled={disabled} className={`${s.pickerTrigger} ${open ? s.pickerTriggerOpen : ""}`}
        onClick={() => { setOpen(previous => !previous); setSearch(""); setActiveIndex(0); }}>
        <span className={selected ? s.pickerValue : s.pickerPlaceholder}>{selected?.label || "انتخاب کنید…"}</span>
        <svg className={s.pickerArrow} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && position && position.maxHeight >= 90 && typeof document !== "undefined" && createPortal(
        <div ref={panelRef} className={s.pickerPanel} dir="rtl"
          style={{top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight}}
          data-worksheet-dropdown="true">
          <input ref={searchRef} type="search" className={s.pickerSearch} placeholder={`جستجوی ${label}…`}
            aria-label={`جستجوی ${label}`} autoComplete="off" value={search}
            onChange={e => { setSearch(e.target.value); setActiveIndex(0); }} />
          <div id={listId} role="listbox" aria-labelledby={labelId} className={s.pickerItems}>
            {visible.map((item, index) => <button key={item.value} type="button" role="option"
              aria-selected={value === item.value} className={`${s.pickerOption} ${index === activeIndex ? s.pickerOptionActive : ""}`}
              onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(item)}>
              <span>{item.label}</span>{value === item.value && <span className={s.pickerCheck} aria-hidden="true">✓</span>}
            </button>)}
            {filtered.length === 0 && <div className={s.pickerEmpty}>موردی یافت نشد.</div>}
          </div>
          {filtered.length > visible.length && <p className={s.pickerMore}>برای یافتن گزینه‌های بیشتر، نام آن را جستجو کنید.</p>}
        </div>, document.body
      )}
    </div>
  </div>;
}

export default function ProvinceInvestigatorWorksheetEditor({ assignmentId, investigatorName, assignmentStatus, onSaved, scope = "OSTAN", canManage = true, requestCreate = 0 }: {
  assignmentId: number; investigatorName: string; assignmentStatus: string; onSaved: () => Promise<void>;
  scope?: "OSTAN" | "HOZE" | "COUNTY"; canManage?: boolean; requestCreate?: number;
}) {
  const [choices, setChoices] = useState<V2Row[]>([]);
  const [worksheets, setWorksheets] = useState<V2Row[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [pendingDelete,setPendingDelete]=useState<number|null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const lastCreateRequest = useRef(0);
  const apiPath = scope === "COUNTY" ? "/Api/TahghighV2/CountyInvestigatorWorksheet" : scope === "HOZE" ? "/Api/TahghighV2/HozeInvestigatorWorksheet" : "/Api/TahghighV2/ProvinceInvestigatorWorksheet";
  busyRef.current = busy;
  const canEdit = canManage && ["PENDING", "IN_PROGRESS"].includes(assignmentStatus);
  const currentYear = currentPersianYear();
  const isReview = form.tahghighType === "2";
  const options = useCallback((kind: string) => choices.filter(x => String(x.Kind) === kind), [choices]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const reload = useCallback(async () => {
    const rows = await meratV2Request(`${apiPath}?assignmentId=${assignmentId}`);
    setWorksheets(rows);
  }, [assignmentId, apiPath]);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(""); setOpenForm(false); setEditingId(null); setForm(empty);
    void Promise.all([
      meratV2Request(`${apiPath}?assignmentId=${assignmentId}&kind=options`),
      meratV2Request(`${apiPath}?assignmentId=${assignmentId}`),
    ]).then(([lookupRows, savedRows]) => { if(live){setChoices(lookupRows);setWorksheets(savedRows);} })
      .catch(err => { if(live) setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات کاربرگ"); })
      .finally(() => { if(live) setLoading(false); });
    return () => { live = false; };
  }, [assignmentId, apiPath]);

  // The constituency card's "add worksheet" button opens the *same* official
  // province form, not a text-only surrogate. A changing token is intentional.
  useEffect(() => {
    if (scope !== "HOZE" || !requestCreate || loading || !canEdit ||
        requestCreate === lastCreateRequest.current) return;
    lastCreateRequest.current = requestCreate;
    setOpenForm(true); setEditingId(null); setForm(empty); setError("");
  }, [scope, requestCreate, loading, canEdit]);

  // Render in a portal so the parent accordion's overflow cannot clip the dialog.
  useEffect(() => {
    if (!openForm) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      modalRef.current?.querySelector<HTMLButtonElement>('button[role="combobox"]')?.focus();
    });
    const handleKeydown = (event: KeyboardEvent) => {
      if (!modalRef.current) return;
      if (event.key === "Escape") {
        if (modalRef.current.querySelector('[data-worksheet-select-open="true"]')) return;
        if (!busyRef.current) { event.preventDefault(); setOpenForm(false); setError(""); }
        return;
      }
      if (event.key !== "Tab") return;
      const tabbable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!tabbable.length) return;
      const first = tabbable[0], last = tabbable[tabbable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [openForm]);

  const closeForm = () => {
    if (busy) return;
    setOpenForm(false); setEditingId(null); setForm(empty); setError("");
  };

  const sourceNames = useMemo(() => new Map<string, string>(options("SOURCE").map(x=>[String(x.Value),txt(x.Title)] as const)), [options]);
  const formValid = useMemo(() => {
    const from = Number(digits(form.azSal)), to = Number(digits(form.taSal));
    return Boolean(form.tahghighType && form.typeMahalTahghigh && form.nahveAshnai.trim())
      && Number.isInteger(from) && from>=1320 && from<=currentYear
      && Number.isInteger(to) && to>=from && to<=currentYear
      && (isReview ? Boolean(form.noeParvandeh && form.nahveBazkhani) : Boolean(form.codeManba));
  }, [form, currentYear, isReview]);

  async function save() {
    if (!canEdit || busy || !formValid) { setError("فیلدهای الزامی و بازه سال‌های آشنایی را بررسی کنید."); return; }
    setBusy(true); setError("");
    try {
      const result = await meratV2Request(apiPath, {
        assignmentId, worksheetId: editingId,
        tahghighType: Number(form.tahghighType), typeMahalTahghigh: Number(form.typeMahalTahghigh),
        codeManba: isReview ? null : Number(form.codeManba),
        azSal: Number(digits(form.azSal)), taSal: Number(digits(form.taSal)),
        nahveAshnai: form.nahveAshnai.trim(),
        noeParvandeh: isReview ? Number(form.noeParvandeh) : null,
        nahveBazkhani: isReview ? Number(form.nahveBazkhani) : null,
        nameSazman: isReview ? form.nameSazman.trim() : null,
        nameShahr: isReview ? form.nameShahr.trim() : null,
        peyvastCount: isReview && form.peyvastCount !== "" ? Number(digits(form.peyvastCount)) : null,
        description: form.description.trim() || null,
      });
      const createdId = num(result[0]?.WorksheetId);
      showToast.success(editingId ? "تغییرات کاربرگ ثبت شد." : "کاربرگ محقق ویژه ثبت شد.", scope === "COUNTY" ? "تحقیقات شهرستان" : scope === "HOZE" ? "تحقیقات حوزه" : "تحقیقات استان");
      setOpenForm(false);setEditingId(null);setForm(empty);
      await reload();
      if (createdId>0) setViewId(createdId);
      await onSaved();
    } catch(err) { setError(err instanceof Error ? err.message : "ثبت کاربرگ ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function deleteWorksheet(worksheetId:number){
    if(!canEdit||busy||worksheetId<=0)return;
    setBusy(true);setError("");
    try{
      await meratV2Request("/Api/TahghighV2/DeleteInvestigatorWorksheet",{worksheetId});
      setPendingDelete(null);
      if(viewId===worksheetId)setViewId(null);
      await reload();await onSaved();
      showToast.success("کاربرگ بدون پیوست حذف شد.","تحقیقات");
    }catch(err){setError(err instanceof Error?err.message:"حذف کاربرگ انجام نشد.");}
    finally{setBusy(false);}
  }
  async function confirmDelete(id:number){
    if(!canEdit||busy)return;
    setError("");
    try{
      const url=`/Api/TahghighV2/${scope==="OSTAN"?"ProvinceInvestigatorDocuments":"DocumentAttachments"}?targetEntity=RESEARCH_WORKSHEET&targetRecordId=${id}`;
      const response=await fetch(url,{credentials:"same-origin",cache:"no-store"});
      const data=await response.json() as {ok:boolean;data?:unknown[];message?:string};
      if(!response.ok||!data.ok)throw new Error(data.message||"بررسی اسناد کاربرگ انجام نشد.");
      if((data.data||[]).length>0)throw new Error("این کاربرگ پیوست دارد و قابل حذف نیست؛ ابتدا تمام اسناد آن، از جمله اسناد جمع‌بندی کاربرگ را حذف کنید.");
      setPendingDelete(id);
    }catch(err){setError(err instanceof Error?err.message:"بررسی اسناد ناموفق بود.");}
  }

  function edit(row: V2Row) {
    if (!canEdit) return;
    setError("");setEditingId(num(row.WorksheetId));setOpenForm(true);
    setForm({
      tahghighType:txt(row.TahghighType), typeMahalTahghigh:txt(row.TypeMahalTahghigh),
      codeManba:txt(row.CodeManba), nahveAshnai:txt(row.NahveAshnai),
      azSal:txt(row.AzSal),taSal:txt(row.TaSal),noeParvandeh:txt(row.NoeParvandeh),
      nahveBazkhani:txt(row.NahveBazkhani), nameSazman:txt(row.NameSazman),
      nameShahr:txt(row.NameShahr), peyvastCount:txt(row.PeyvastCount),description:txt(row.Description || (!row.TahghighType ? row.ReportText : "")),
    });
  }
  const selectField = (id: string, label: string, kind: string, value: string, onChange: (v: string)=>void, required=false) =>
    <WorksheetCustomSelect key={id} id={id} label={label} required={required}
      options={options(kind).map(o => ({ value: txt(o.Value), label: txt(o.Title) }))}
      value={value} onChange={onChange} disabled={busy || !canEdit}/>;

  return <div dir="rtl" className={s.root}>
    <div className={s.toolbar}>
      <div><strong>کاربرگ‌های {investigatorName}</strong><small>اطلاعات کاربرگ توسط کاربر مجاز {scope === "COUNTY" ? "شهرستان" : scope === "HOZE" ? "حوزه" : "استان"} ثبت می‌شود؛ محقق نیاز به حساب کاربری ندارد.</small></div>
      {canEdit && <button className={s.primary} type="button" disabled={loading || busy} onClick={() => {setOpenForm(true);setEditingId(null);setForm(empty);setError("");}}>
        ＋ افزودن کاربرگ
      </button>}
    </div>
    {loading && <p className={s.hint}>در حال دریافت اطلاعات کاربرگ…</p>}
    {error && !openForm && <p role="alert" className={s.error}>{error}</p>}
    {openForm && typeof document !== "undefined" && createPortal(
      <div className={s.modalBackdrop} role="presentation"
        onMouseDown={e => { if (e.target === e.currentTarget) closeForm(); }}>
        <div className={s.modal} ref={modalRef} dir="rtl" role="dialog" aria-modal="true"
          aria-labelledby={`worksheet-modal-title-${assignmentId}`} aria-describedby={`worksheet-modal-help-${assignmentId}`}>
          <div className={s.modalHead}>
            <div className={s.modalHeadText}>
              <h3 id={`worksheet-modal-title-${assignmentId}`}>
                {editingId ? "ویرایش کاربرگ تحقیق" : "افزودن کاربرگ تحقیق"}
              </h3>
              <small>محقق: {investigatorName}</small>
            </div>
            <button type="button" className={s.closeButton} onClick={closeForm} disabled={busy} aria-label="بستن مودال کاربرگ">×</button>
          </div>
          <form className={s.modalForm} onSubmit={e => {e.preventDefault();void save();}}>
            <div className={s.modalBody} data-worksheet-modal-scroll="true">
              {error && <p role="alert" className={s.error}>{error}</p>}
              <div className={s.grid}>
        {selectField(`type-${assignmentId}`,"نوع کاربرگ تحقیق","102",form.tahghighType,v=>update("tahghighType",v),true)}
        {selectField(`place-${assignmentId}`,"محل تحقیق","111",form.typeMahalTahghigh,v=>update("typeMahalTahghigh",v),true)}
        {!isReview && selectField(`source-${assignmentId}`,"منبع تحقیق","SOURCE",form.codeManba,v=>update("codeManba",v),true)}
        <label className={s.label}><span className={s.labelText}>نحوه آشنایی <em aria-label="الزامی">*</em></span>
          <input className={s.field} maxLength={200} value={form.nahveAshnai} onChange={e=>update("nahveAshnai",e.target.value)} disabled={busy || !canEdit}/>
        </label>
        <label className={s.label}><span className={s.labelText}>مدت آشنایی ـ از سال <em aria-label="الزامی">*</em></span>
          <input inputMode="numeric" className={s.field} maxLength={4} placeholder="۱۳۸۵" value={form.azSal} onChange={e=>update("azSal",digits(e.target.value).replace(/\D/g,""))} disabled={busy || !canEdit}/>
        </label>
        <label className={s.label}><span className={s.labelText}>مدت آشنایی ـ تا سال <em aria-label="الزامی">*</em></span>
          <input inputMode="numeric" className={s.field} maxLength={4} placeholder={String(currentYear)} value={form.taSal} onChange={e=>update("taSal",digits(e.target.value).replace(/\D/g,""))} disabled={busy || !canEdit}/>
        </label>
        {isReview && <>
          {selectField(`case-${assignmentId}`,"نوع پرونده","113",form.noeParvandeh,v=>update("noeParvandeh",v),true)}
          {selectField(`review-${assignmentId}`,"نحوه بازخوانی","114",form.nahveBazkhani,v=>update("nahveBazkhani",v),true)}
          <label className={s.label}><span className={s.labelText}>نام سازمان</span>
            <input className={s.field} maxLength={300} value={form.nameSazman} onChange={e=>update("nameSazman",e.target.value)} disabled={busy || !canEdit}/>
          </label>
          <label className={s.label}><span className={s.labelText}>نام شهر</span>
            <input className={s.field} maxLength={300} value={form.nameShahr} onChange={e=>update("nameShahr",e.target.value)} disabled={busy || !canEdit}/>
          </label>
          <label className={s.label}><span className={s.labelText}>تعداد پیوست</span>
            <input className={s.field} inputMode="numeric" maxLength={4} value={form.peyvastCount} onChange={e=>update("peyvastCount",digits(e.target.value).replace(/\D/g,""))} disabled={busy || !canEdit}/>
          </label>
        </>}
      </div>
      <label className={s.label}><span className={s.labelText}>توضیحات کاربرگ</span>
        <textarea className={`${s.field} ${s.textarea}`} rows={3} maxLength={12000} value={form.description}
          onChange={e=>update("description",e.target.value)} disabled={busy || !canEdit} placeholder="شرح نتیجه تحقیق…"/>
      </label>
              <p id={`worksheet-modal-help-${assignmentId}`} className={s.hint}>
                فیلدهای ستاره‌دار الزامی هستند؛ سال آشنایی از ۱۳۲۰ تا سال جاری است.
              </p>
            </div>
            <div className={s.modalFooter}>
              <button type="submit" className={s.primary} disabled={!formValid || busy || !canEdit}>
                {busy ? "در حال ثبت…" : editingId ? "ذخیره تغییرات" : "ثبت کاربرگ"}
              </button>
              <button type="button" className={s.secondary} disabled={busy} onClick={closeForm}>انصراف</button>
            </div>
          </form>
        </div>
      </div>, document.body
    )}
    <div className={s.list}>
      {!loading && worksheets.length===0 && <p className={s.hint}>هنوز کاربرگی ثبت نشده است.</p>}
      {worksheets.map(row => {
        const id=num(row.WorksheetId), expanded=viewId===id;
        return <article key={id} className={s.item}>
          <div className={s.itemTop}>
            <div><b>کاربرگ {id.toLocaleString("fa-IR")}</b>
              <span>{txt(row.TahghighTypeName) || "گزارش متنی"} · {txt(row.TypeMahalTahghighName)}</span>
            </div>
            <div className={s.itemActions}>
              <button type="button" className={`${s.detailsToggle} ${expanded ? s.detailsToggleOpen : ""}`}
                aria-expanded={expanded} aria-controls={`worksheet-details-${id}`}
                onClick={() => setViewId(expanded ? null : id)}>
                <span>جزئیات و پیوست‌ها</span>
                <svg className={s.detailsToggleArrow} width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {canEdit && <button type="button" className={s.secondary} onClick={()=>edit(row)}>ویرایش</button>}
              {canEdit && <button type="button" className={s.deleteWorksheet} disabled={busy} onClick={()=>void confirmDelete(id)}>حذف کاربرگ</button>}
            </div>
          </div>
          {expanded && <div id={`worksheet-details-${id}`} className={s.details}>
            <p><b>نحوه آشنایی:</b> {txt(row.NahveAshnai) || "—"}</p>
            <p><b>مدت آشنایی:</b> {txt(row.AzSal) || "—"} تا {txt(row.TaSal) || "—"}</p>
            {num(row.TahghighType)!==2 && <p><b>منبع:</b> {txt(row.ManbaName) || sourceNames.get(txt(row.CodeManba)) || txt(row.CodeManba) || "—"}</p>}
            {num(row.TahghighType)===2 && <>
              <p><b>نوع پرونده:</b> {txt(row.NoeParvandehName)||"—"} · <b>نحوه بازخوانی:</b> {txt(row.NahveBazkhaniName)||"—"}</p>
              <p><b>سازمان:</b> {txt(row.NameSazman)||"—"} · <b>شهر:</b> {txt(row.NameShahr)||"—"} · <b>تعداد پیوست اعلامی:</b> {txt(row.PeyvastCount)||"—"}</p>
            </>}
            {(txt(row.Description) || (!row.TahghighType ? txt(row.ReportText) : "")) && <p className={s.report}><b>توضیحات:</b> {txt(row.Description) || txt(row.ReportText)}</p>}
            <ProvinceInvestigatorEvidence targetEntity="RESEARCH_WORKSHEET" targetRecordId={id}
              investigatorName={investigatorName} readOnly={!canEdit} scope={scope}/>
          </div>}
        </article>;
      })}
    </div>
    {pendingDelete!==null&&typeof document!=="undefined"&&createPortal(
      <div className={s.modalBackdrop} role="presentation">
        <div role="dialog" aria-modal="true" aria-label="تأیید حذف کاربرگ" dir="rtl" className={s.deleteConfirm}>
          <strong>حذف کاربرگ {pendingDelete.toLocaleString("fa-IR")}</strong>
          <p>این کاربرگ بدون پیوست است. آیا از حذف آن اطمینان دارید؟ حذف در سوابق سامانه ثبت می‌شود.</p>
          {error&&<p role="alert" className={s.error}>{error}</p>}
          <div className={s.itemActions}>
            <button className={s.deleteWorksheet} type="button" disabled={busy} onClick={()=>void deleteWorksheet(pendingDelete)}>تأیید حذف</button>
            <button className={s.secondary} type="button" disabled={busy} onClick={()=>setPendingDelete(null)}>انصراف</button>
          </div>
        </div>
      </div>,document.body)}
    <ProvinceInvestigatorSummary assignmentId={assignmentId} investigatorName={investigatorName}
      readOnly={!canEdit} scope={scope} onSaved={onSaved}/>
  </div>;
}

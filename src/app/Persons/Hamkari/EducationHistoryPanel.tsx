"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Dropdown } from "@/component/Dropdown";
import styles from "./Hamkari.module.css";

type Education = {
  EducationId: number; VazeyatTahsil: number; NoeTahsilat: number; MadrakTahsili: number;
  NoeDaneshgah: number; NoeGroupTahsili: number; GroupTahsili: number; SalAkhzMadrak: number | string;
  ReshteTahsili: string; NameMahalTahsilStr: string; MahalTahsil: number; Neshani: string;
  VazeyatTahsilName?: string; NoeTahsilatName?: string; MadrakTahsiliName?: string; MahalTahsilName?: string;
};
type Option = { value: number; label: string };
const blank: Education = { EducationId:0,VazeyatTahsil:0,NoeTahsilat:0,MadrakTahsili:0,NoeDaneshgah:0,NoeGroupTahsili:0,GroupTahsili:0,SalAkhzMadrak:"",ReshteTahsili:"",NameMahalTahsilStr:"",MahalTahsil:0,Neshani:"" };
async function post(url:string,body:object) {
  const response = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
  const result = await response.json();
  if(!response.ok || result.status !== 200) throw new Error(result.error || "خطا در ارتباط با سرور");
  return result.data;
}

export default function EducationHistoryPanel({ personId,userId,rootMahal }:{personId:number;userId:number;rootMahal:number}) {
  const [rows,setRows] = useState<Education[]>([]);
  const [lookups,setLookups] = useState<Record<number,Option[]>>({});
  const [cities,setCities] = useState<Option[]>([]);
  const [draft,setDraft] = useState<Education|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const refresh = useCallback(async() => {
    if(!personId) return;
    setBusy(true);
    try { setRows(await post("/Api/Hamkari/PersonEducations",{action:"list",personId}));setError(""); }
    catch(e){setError(e instanceof Error?e.message:"خطا در بارگذاری");}
    finally{setBusy(false);}
  },[personId]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    let live=true;
    Promise.all([1031,1033,1034].map(async pid => {
      const data = await post("/Api/DFN/GetDFnByPID",{pid});
      return [pid,(Array.isArray(data)?data:[]).map((x:{Value:number;NameFarsi:string})=>({value:Number(x.Value),label:String(x.NameFarsi)}))] as const;
    })).then(items=>{if(live)setLookups(Object.fromEntries(items));}).catch(()=>{if(live)setError("فهرست‌های تحصیلی دریافت نشد.");});
    if(rootMahal) post("/Api/Citys/GetCitys",{pcityId:rootMahal}).then(data=>{
      if(live)setCities((Array.isArray(data)?data:[]).map((x:{CityId:number;FullName:string})=>({value:Number(x.CityId),label:String(x.FullName)})));
    }).catch(()=>{});
    return ()=>{live=false;};
  },[rootMahal]);
  useEffect(()=>{
    const type=draft?.NoeTahsilat;
    if(!type) return;
    const pid=Number(`10310${type}`);
    let live=true;
    post("/Api/DFN/GetDFnByPID",{pid}).then(data=>{
      if(live)setLookups(old=>({...old,[pid]:(Array.isArray(data)?data:[]).map((x:{Value:number;NameFarsi:string})=>({value:Number(x.Value),label:String(x.NameFarsi)}))}));
    }).catch(()=>{});
    return ()=>{live=false;};
  },[draft?.NoeTahsilat]);
  const change=(key:keyof Education,value:string|number)=>setDraft(old=>old?{...old,[key]:value}:old);
  const select=(label:string,key:keyof Education,options:Option[],required=false)=><label className={styles.jobField}><span>{label}{required?" *":""}</span>
    <Dropdown<number> value={Number(draft?.[key])||null} options={options} onChange={v=>change(key,Number(v)||0)} placeholder="انتخاب کنید" />
  </label>;
  const input=(label:string,key:keyof Education,maxLength=150)=><label className={styles.jobField}><span>{label}</span><input maxLength={maxLength} value={String(draft?.[key]??"")} onChange={e=>change(key,e.target.value)} /></label>;
  const save=async()=>{
    if(!draft||busy)return;
    if(!draft.NoeTahsilat){setError("نوع تحصیل الزامی است.");return;}
    if(draft.SalAkhzMadrak && !/^[0-9۰-۹]{4}$/.test(String(draft.SalAkhzMadrak))){setError("سال اخذ مدرک باید چهاررقمی باشد.");return;}
    setBusy(true);setError("");
    try {
      const education={...draft,SalAkhzMadrak:String(draft.SalAkhzMadrak).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))};
      await post("/Api/Hamkari/PersonEducations",{action:"save",personId,userId,educationId:draft.EducationId,education});
      setDraft(null);setNotice("سابقه تحصیلی ذخیره شد.");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"ذخیره ناموفق بود.");}finally{setBusy(false);}
  };
  const remove=async(row:Education)=>{
    if(!await meratConfirm(`سابقه تحصیلی «${row.MadrakTahsiliName||row.ReshteTahsili||"بدون عنوان"}» حذف شود؟`))return;
    try{await post("/Api/Hamkari/PersonEducations",{action:"delete",personId,userId,educationId:row.EducationId});setNotice("سابقه حذف شد.");await refresh();}
    catch(e){setError(e instanceof Error?e.message:"حذف ناموفق بود.");}
  };
  return <section className={styles.jobPanel} dir="rtl">
    <div className={styles.jobToolbar}><div><strong>سوابق تحصیلی فرد</strong><span>{rows.length.toLocaleString("fa-IR")} سابقه ثبت‌شده</span></div><button type="button" onClick={()=>{setDraft({...blank});setError("");}}><Plus size={17}/> افزودن سابقه تحصیلی</button></div>
    {notice&&<p className={styles.jobSuccess} role="status">{notice}</p>}{!draft&&error&&<p className={styles.jobError} role="alert">{error}</p>}
    <div className={styles.jobTableScroll}><table className={styles.jobTable}><thead><tr><th>ردیف</th><th>وضعیت تحصیل</th><th>نوع تحصیل</th><th>سال اخذ مدرک</th><th>محل تحصیل</th><th>رشته تحصیلی</th><th>مدرک تحصیلی</th><th>عملیات</th></tr></thead><tbody>
      {rows.map((r,i)=><tr key={r.EducationId}><td>{(i+1).toLocaleString("fa-IR")}</td><td><span className={styles.jobStatus}>{r.VazeyatTahsilName||"—"}</span></td><td>{r.NoeTahsilatName||"—"}</td><td>{r.SalAkhzMadrak||"—"}</td><td>{r.NameMahalTahsilStr||r.MahalTahsilName||"—"}</td><td className={styles.jobName}>{r.ReshteTahsili||"—"}</td><td>{r.MadrakTahsiliName||"—"}</td><td><div className={styles.jobActions}><button type="button" title="ویرایش" aria-label="ویرایش" onClick={()=>{setDraft({...r});setError("");}}><Pencil size={16}/></button><button type="button" title="حذف" aria-label="حذف" onClick={()=>void remove(r)}><Trash2 size={16}/></button></div></td></tr>)}
      {rows.length===0&&<tr><td colSpan={8} className={styles.jobEmpty}>{busy?"در حال دریافت اطلاعات...":"سابقه تحصیلی ثبت نشده است."}</td></tr>}
    </tbody></table></div>
    {draft&&<div className={styles.jobOverlay} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDraft(null);}}><div className={styles.jobDialog} role="dialog" aria-modal="true" aria-label="فرم سابقه تحصیلی">
      <div className={`${styles.jobDialogHeader} merat-modal-tone--neutral`}><strong>{draft.EducationId?"ویرایش سابقه تحصیلی":"افزودن سابقه تحصیلی"}</strong><button type="button" aria-label="بستن" onClick={()=>setDraft(null)}><X size={20}/></button></div>
      <div className={styles.jobForm}>
        {select("وضعیت تحصیل","VazeyatTahsil",[{value:1,label:"در حال تحصیل"},{value:2,label:"اتمام تحصیل"}])}
        <label className={styles.jobField}><span>نوع تحصیل *</span><Dropdown<number> value={draft.NoeTahsilat||null} options={lookups[1031]||[]} onChange={value=>setDraft(old=>old?{...old,NoeTahsilat:Number(value)||0,MadrakTahsili:0}:old)} placeholder="انتخاب کنید" /></label>
        {select("مدرک تحصیلی","MadrakTahsili",lookups[Number(`10310${draft.NoeTahsilat}`)]||[])}
        {input("سال اخذ مدرک","SalAkhzMadrak",4)}
        {input("رشته تحصیلی","ReshteTahsili")}
        {input("نام محل تحصیل (مدرسه / دانشگاه / حوزه)","NameMahalTahsilStr")}
        {select("نوع دانشگاه","NoeDaneshgah",lookups[1033]||[])}
        {select("نوع گروه تحصیلی","NoeGroupTahsili",lookups[1034]||[])}
        <label className={styles.jobField}><span>شهر محل تحصیل</span><Dropdown<number> value={draft.MahalTahsil||null} options={cities} onChange={v=>change("MahalTahsil",Number(v)||0)} placeholder="انتخاب محل" /></label>
        {input("کد گروه تحصیلی","GroupTahsili",8)}
        <label className={`${styles.jobField} ${styles.jobWide}`}><span>نشانی / توضیحات محل تحصیل</span><textarea rows={3} maxLength={1000} value={draft.Neshani||""} onChange={e=>change("Neshani",e.target.value)}/></label>
      </div>
      {error&&<p className={styles.jobError} role="alert">{error}</p>}
      <div className={styles.jobFooter}><button type="button" disabled={busy} onClick={()=>setDraft(null)}>انصراف</button><button type="button" disabled={busy} onClick={()=>void save()}>{busy?"در حال ذخیره...":"ذخیره سابقه تحصیلی"}</button></div>
    </div></div>}
  </section>;
}

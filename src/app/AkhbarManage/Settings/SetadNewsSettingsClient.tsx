"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./SetadNewsSettings.module.css";

type User = {UserId:number;PostId:number;FullName:string;OnvanPost:string;CanHandle:boolean;AllProvinces:boolean};
type Province = {ProvinceId:number;Name:string};
type Assignment = {UserId:number;ProvinceId:number};
export default function SetadNewsSettingsClient() {
 const [users,setUsers] = useState<User[]>([]);
 const [provinces,setProvinces] = useState<Province[]>([]);
 const [assigned,setAssigned] = useState<Assignment[]>([]);
 const [selected,setSelected] = useState<number>(0);
 const [enabled,setEnabled] = useState(false);
 const [all,setAll] = useState(true);
 const [regionIds,setRegionIds] = useState<number[]>([]);
 const [search,setSearch] = useState("");
 const [loading,setLoading] = useState(true);
 const [saving,setSaving] = useState(false);
 const [error,setError] = useState("");
 const [message,setMessage] = useState("");
 const load=useCallback(async()=>{
   setLoading(true);setError("");
   try { const r=await fetch("/Api/Akhbar/SetadPermissions",{cache:"no-store"});const d=await r.json();
     if(!r.ok||!d.admin) throw new Error(d.error||"تنظیمات فقط برای مدیر مجاز ستاد است.");
     setUsers(d.users||[]);setProvinces(d.provinceOptions||[]);setAssigned(d.assignments||[]);
   } catch(e) {setError(e instanceof Error?e.message:"خطا در دریافت تنظیمات");}
   finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 function selectUser(id:number) {setSelected(id);setMessage("");const u=users.find(x=>x.UserId===id);if(!u)return;
    setEnabled(Boolean(u.CanHandle));setAll(Boolean(u.AllProvinces));setRegionIds(assigned.filter(x=>Number(x.UserId)===id).map(x=>Number(x.ProvinceId)));}
 const filteredUsers=useMemo(()=>users.filter(u=>`${u.FullName} ${u.OnvanPost} ${u.UserId}`.includes(search)),[users,search]);
 function toggleProvince(id:number) {setRegionIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);}
 async function save() {if(!selected)return;setSaving(true);setError("");setMessage("");
  try {const r=await fetch("/Api/Akhbar/SetadPermissions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:selected,canHandle:enabled,allProvinces:all,provinces:all?[]:regionIds})});const d=await r.json();
    if(!r.ok)throw new Error(d.error||"خطا در ذخیره");setMessage("تنظیمات کاربر با موفقیت ثبت شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت تنظیمات");}finally{setSaving(false)}
 }
 return <div className={styles.root} dir="rtl">
   <header><h2>دسترسی کارشناسان به اخبار استان‌ها</h2><p>هر کاربر می‌تواند چند استان هم‌زمان داشته باشد. محدودیت‌ها در سرور اعمال می‌شوند.</p></header>
   {error&&<p className={styles.error} role="alert">{error}</p>}{message&&<p className={styles.ok} role="status">{message}</p>}
   {loading?<p>در حال دریافت تنظیمات...</p>:<div className={styles.columns}>
    <aside className={styles.list}><label>جست‌وجوی کاربر ستاد<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="نام یا پست..."/></label>
      {filteredUsers.map(u=><button key={u.UserId} type="button" className={selected===u.UserId?styles.active:""} onClick={()=>selectUser(u.UserId)}>
        <strong>{u.FullName||`کاربر ${u.UserId}`}</strong><small>{u.OnvanPost} · {u.UserId}</small>
      </button>)}
    </aside>
    <section className={styles.config}>
      {!selected?<p>برای تنظیم دسترسی، یک کاربر ستاد انتخاب کنید.</p>:<>
       <label className={styles.check}><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>مجوز مشاهده و رسیدگی به اخبار ستاد</label>
       <label className={styles.check}><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/>دسترسی به اخبار تمام استان‌ها</label>
       {!all&&<div><p>استان‌های مجاز (انتخاب چندگانه)</p><div className={styles.provinces}>
         {provinces.map(p=><label className={styles.check} key={p.ProvinceId}><input type="checkbox" checked={regionIds.includes(p.ProvinceId)} onChange={()=>toggleProvince(p.ProvinceId)}/>{p.Name}</label>)}
       </div><small>{regionIds.length} استان انتخاب شده است</small></div>}
       <button type="button" disabled={saving||enabled&&!all&&!regionIds.length} className={styles.save} onClick={()=>void save()}>{saving?"در حال ذخیره...":"ذخیره دسترسی کاربر"}</button>
      </>}
    </section>
   </div>}
 </div>
}

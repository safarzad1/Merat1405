"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./InteractionEditor.module.css";
const months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const fmt = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {year:"numeric",month:"numeric",day:"numeric",timeZone:"Asia/Tehran"});
function parts(d:Date){const values=fmt.formatToParts(d);const x=(key:string)=>Number(values.find(p=>p.type===key)?.value||0);return {y:x("year"),m:x("month"),d:x("day")};}
function addMonth(y:number,m:number,delta:number){const num=y*12+(m-1)+delta;return {y:Math.floor(num/12),m:((num%12)+12)%12+1};}
// Find the Gregorian date corresponding to the first day of a Persian month.
function firstDate(y:number,m:number){let start=new Date(y+621,2,1,12);start.setDate(start.getDate()+(m-1)*29-20);for(let i=0;i<115;i++){const p=parts(start);if(p.y===y&&p.m===m&&p.d===1)return new Date(start);start.setDate(start.getDate()+1);}return new Date();}
const pad=(v:number)=>String(v).padStart(2,"0");
export default function PersianCalendar({value,onChange}:{value:string;onChange:(date:string)=>void}){
 const today=parts(new Date());const parsed=/^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value||"");
 const [view,setView]=useState({y:parsed?Number(parsed[1]):today.y,m:parsed?Number(parsed[2]):today.m});
 const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[open]);
 const days=useMemo(()=>{const first=firstDate(view.y,view.m);const nm=addMonth(view.y,view.m,1);const next=firstDate(nm.y,nm.m);const count=Math.round((next.getTime()-first.getTime())/86400000);const offset=(first.getDay()+1)%7;return {count,offset};},[view]);
 const selected=parsed?{y:Number(parsed[1]),m:Number(parsed[2]),d:Number(parsed[3])}:null;
 return <div className={styles.calendarRoot} ref={ref} dir="rtl"><button type="button" className={styles.calendarTrigger} onClick={()=>setOpen(v=>!v)}><span>{value||"انتخاب تاریخ شمسی"}</span><CalendarDays size={17}/></button>
 {open&&<div className={styles.calendarPopup}><div className={styles.calendarHeader}><button type="button" aria-label="ماه قبل" onClick={()=>setView(p=>addMonth(p.y,p.m,-1))}><ChevronRight size={17}/></button><strong>{months[view.m-1]} {view.y}</strong><button type="button" aria-label="ماه بعد" onClick={()=>setView(p=>addMonth(p.y,p.m,1))}><ChevronLeft size={17}/></button></div><div className={styles.calendarDays}>{["ش","ی","د","س","چ","پ","ج"].map((x,i)=><b key={i}>{x}</b>)}{Array.from({length:days.offset},(_,i)=><span key={'e'+i}/>)}{Array.from({length:days.count},(_,i)=>{const d=i+1;return <button key={d} type="button" className={selected?.y===view.y&&selected.m===view.m&&selected.d===d?styles.calendarSelected:""} onClick={()=>{onChange(`${view.y}/${pad(view.m)}/${pad(d)}`);setOpen(false);}}>{d.toLocaleString("fa-IR")}</button>;})}</div><button type="button" className={styles.calendarToday} onClick={()=>{setView({y:today.y,m:today.m});onChange(`${today.y}/${pad(today.m)}/${pad(today.d)}`);setOpen(false);}}>امروز</button></div>}
 </div>;
}

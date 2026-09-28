"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "@/component/Dropdown";
interface User { CityId:number; FullName:string }
interface Props { pCityId:number; CityIdNo:number; IsMarkaz:number; label?:string; onSelect?:(info:{id:number;title:string}|null)=>void; error?:boolean; errorMessage?:string }
export default function InputUserDropdown({pCityId,CityIdNo,IsMarkaz,label,onSelect,error,errorMessage}:Props){
 const [items,setItems]=useState<User[]>([]); const [value,setValue]=useState<number|null>(null); const [loading,setLoading]=useState(false); const router=useRouter();
 useEffect(()=>{ if(!pCityId)return; let alive=true; setLoading(true); fetch('/Api/Citys/GetListCity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pcityId:pCityId,cityIdNo:CityIdNo,isMarkaz:IsMarkaz})}).then(async r=>{if(r.status===401){router.push('/Login');return null;} return r.json();}).then(x=>{if(alive&&x)setItems(x.data||[])}).catch(()=>alive&&setItems([])).finally(()=>alive&&setLoading(false)); return()=>{alive=false}},[pCityId,CityIdNo,IsMarkaz,router]);
 const options=useMemo(()=>items.map(x=>({value:Number(x.CityId),label:x.FullName})),[items]);
 return <div className="research-field">{label?<label>{label}</label>:null}<Dropdown<number> value={value} options={options} loading={loading} error={error} placeholder="انتخاب..." onChange={v=>{setValue(v);const f=items.find(x=>Number(x.CityId)===Number(v));onSelect?.(f?{id:Number(f.CityId),title:f.FullName}:null)}}/>{errorMessage?<small className="research-error">{errorMessage}</small>:null}</div>;
}

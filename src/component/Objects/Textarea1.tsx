"use client";
import type { ChangeEvent } from "react";
interface Props { label?: string; placeholder?: string; value?: string; maxLength?: number; onChange?: (e: ChangeEvent<HTMLTextAreaElement>)=>void; error?: boolean; errorMessage?: string; onlyNumber?: boolean; rows?: number; height?: string; justify?: boolean; lineHeight?: string; readOnly?: boolean; fullHeight?: boolean }
export default function Textarea1({label,placeholder,value,maxLength,onChange,error,errorMessage,onlyNumber=false,rows=4,readOnly=false,fullHeight=false}:Props){
 const change=(e:ChangeEvent<HTMLTextAreaElement>)=>{ if(readOnly)return; if(onlyNumber)e.target.value=e.target.value.replace(/\D/g,""); onChange?.(e); };
 return <div className={`research-field ${fullHeight?"research-field-full":""}`}>{label?<label>{label}</label>:null}<textarea rows={rows} value={value||""} onChange={change} maxLength={maxLength} placeholder={placeholder} readOnly={readOnly} className={error?"research-control research-control-error":"research-control"}/>{errorMessage?<small className="research-error">{errorMessage}</small>:null}</div>;
}

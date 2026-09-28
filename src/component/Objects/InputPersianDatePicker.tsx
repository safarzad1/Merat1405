"use client";
interface Props { label?:string; value?:string; onChange?:(date:string|null)=>void; allowPastDates?:boolean; error?:boolean; errorMessage?:string; required?:boolean; requiredStarColor?:string }
export default function InputPersianDate({label,value,onChange,error,errorMessage,required}:Props){
 return <div className="research-field">{label?<label>{label}{required?<span className="research-required">*</span>:null}</label>:null}<input dir="ltr" className={error?"research-control research-control-error":"research-control"} value={value||""} onChange={e=>onChange?.(e.target.value||null)} placeholder="1405/07/01" maxLength={10}/>{errorMessage?<small className="research-error">{errorMessage}</small>:null}</div>;
}

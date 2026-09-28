"use client";
import { useEffect, useRef } from "react";
interface Props { value?:string; content?:string; onChange?:(v:string)=>void; placeholder?:string; readOnly?:boolean; justify?:boolean; height?:string }
export default function RichTextEditor({ value, content, onChange, placeholder="متن را وارد کنید...", readOnly=false, justify=false }:Props){
  const ref=useRef<HTMLDivElement>(null); const resolved=value??content??"";
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==resolved)ref.current.innerHTML=resolved},[resolved]);
  return <div ref={ref} className="research-rich-editor" contentEditable={!readOnly} suppressContentEditableWarning data-placeholder={placeholder} style={{textAlign:justify?"justify":"right"}} onInput={e=>onChange?.((e.currentTarget as HTMLDivElement).innerHTML)} />
}

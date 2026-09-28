"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Minus, Plus, RotateCcw } from "@/component/ResearchIcons";

type Props={open:boolean;onClose:()=>void;fileName:string;title?:string};
export default function PdfModal({open,onClose,fileName,title=""}:Props){
  const[zoom,setZoom]=useState(110); const[key,setKey]=useState(0);
  useEffect(()=>{if(open){setZoom(110);setKey(k=>k+1)}},[open]);
  const src=useMemo(()=>{const safe=(fileName||"").trim().replace(/^\/+/,"");return safe?`/pdf/${safe}#zoom=${zoom}&view=FitH&toolbar=1&navpanes=0&k=${key}`:""},[fileName,zoom,key]);
  if(!open)return null;
  const change=(d:number)=>{setZoom(z=>Math.min(300,Math.max(50,z+d)));setKey(k=>k+1)};
  return <div className="fixed inset-0 z-[30030] flex items-center justify-center davtalab-modal-root">
    <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/50" onClick={onClose}/>
    <div className="relative z-[10000] w-[98vw] max-w-[1600px] h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl davtalab-pdf-modal">
      <div className="h-14 px-4 flex items-center justify-between text-white davtalab-modal-gradient">
        <div className="text-[15px] truncate">{title}</div>
        <div className="flex items-center gap-2"><span className="davtalab-zoom-chip">{zoom}%</span>
          <button type="button" onClick={()=>change(-10)} className="davtalab-icon-ghost" title="کوچک‌نمایی"><Minus size={18}/></button>
          <button type="button" onClick={()=>change(10)} className="davtalab-icon-ghost" title="بزرگ‌نمایی"><Plus size={18}/></button>
          <button type="button" onClick={()=>{setZoom(110);setKey(k=>k+1)}} className="davtalab-icon-ghost" title="بازنشانی"><RotateCcw size={18}/></button>
          <button type="button" onClick={onClose} className="davtalab-icon-ghost" title="بستن"><X size={21}/></button>
        </div>
      </div>
      <div className="h-[calc(92vh-56px)] bg-gray-50">{src?<iframe key={src} src={src} title={title} className="w-full h-full border-0"/>:<div className="p-4 text-red-600">نام فایل نامعتبر است.</div>}</div>
    </div>
  </div>
}

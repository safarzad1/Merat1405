"use client";
import {createContext,useContext,useState,type ReactNode} from "react";
import ConfirmModal from "@/component/ConfirmModal/ConfirmYesNo";
type Fn=()=>void; const C=createContext<{showConfirm:(m:string,a:Fn,h?:string,t?:"success"|"warning"|"error")=>void}|null>(null);
export function ConfirmModalProvider({children}:{children:ReactNode}){const[open,setOpen]=useState(false);const[msg,setMsg]=useState("");const[header,setHeader]=useState<string>();const[type,setType]=useState<"success"|"warning"|"error">("success");const[action,setAction]=useState<Fn|null>(null);const showConfirm=(m:string,a:Fn,h?:string,t?:"success"|"warning"|"error")=>{setMsg(m);setAction(()=>a);setHeader(h);setType(t||"success");setOpen(true)};return <C.Provider value={{showConfirm}}>{children}<ConfirmModal isOpen={open} message={msg} header={header} type={type} onCancel={()=>setOpen(false)} onConfirm={()=>{action?.();setOpen(false)}}/></C.Provider>}
export function useConfirm(){const c=useContext(C);if(!c)throw new Error("useConfirm must be used within ConfirmModalProvider");return c}

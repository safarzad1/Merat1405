"use client";
import {useEffect,useState,type ReactNode} from "react";
import {ConfirmModalProvider} from "@/Utils/ConfirmModalContext";
import {AlertProvider} from "@/component/AlertContext";
export default function ResearchProviders({children}:{children:ReactNode}){const[toast,setToast]=useState<{message:string;type:string}|null>(null);useEffect(()=>{let t:any;const h=(e:Event)=>{setToast((e as CustomEvent).detail);clearTimeout(t);t=setTimeout(()=>setToast(null),3200)};window.addEventListener("merat-toast",h);return()=>{clearTimeout(t);window.removeEventListener("merat-toast",h)}},[]);return <AlertProvider><ConfirmModalProvider>{children}{toast?<div className={`research-toast ${toast.type}`}>{toast.message}</div>:null}</ConfirmModalProvider></AlertProvider>}

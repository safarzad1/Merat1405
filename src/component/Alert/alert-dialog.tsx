"use client";
import {createContext,useContext,type ReactNode} from "react";
const C=createContext<{close?:()=>void}>({});
export function AlertDialog({open=true,onOpenChange,children}:{open?:boolean;onOpenChange?:(v:boolean)=>void;children:ReactNode}){if(!open)return null;return <C.Provider value={{close:()=>onOpenChange?.(false)}}>{children}</C.Provider>}
export function AlertDialogTrigger({children}:{children:ReactNode}){return <>{children}</>}
export function AlertDialogContent({children,className=""}:{children:ReactNode;className?:string}){const c=useContext(C);return <div className="research-modal-root"><button className="research-modal-backdrop" onClick={c.close} aria-label="بستن"/><div className={`research-modal-card ${className}`}>{children}</div></div>}
export const AlertDialogHeader=({children}:{children:ReactNode})=><div className="research-modal-body">{children}</div>;
export const AlertDialogFooter=({children}:{children:ReactNode})=><div className="research-modal-actions research-modal-body">{children}</div>;
export const AlertDialogTitle=({children,className=""}:{children:ReactNode;className?:string})=><h3 className={className}>{children}</h3>;
export const AlertDialogDescription=({children,className=""}:{children:ReactNode;className?:string})=><p className={className}>{children}</p>;
export function AlertDialogAction({children,onClick,className=""}:{children:ReactNode;onClick?:()=>void;className?:string}){const c=useContext(C);return <button type="button" className={`research-button primary ${className}`} onClick={()=>{onClick?.();c.close?.()}}>{children}</button>}
export function AlertDialogCancel({children,onClick,className=""}:{children:ReactNode;onClick?:()=>void;className?:string}){const c=useContext(C);return <button type="button" className={`research-button secondary ${className}`} onClick={()=>{onClick?.();c.close?.()}}>{children}</button>}

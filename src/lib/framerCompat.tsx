"use client";
import type {ComponentPropsWithoutRef,ElementType,ReactNode} from "react";
function make<T extends ElementType>(Tag:T){return function MotionComp({children,initial,animate,exit,transition,variants,whileHover,whileTap,...props}:any){return <Tag {...props}>{children}</Tag>}}
export const motion={div:make('div'),p:make('p'),span:make('span'),button:make('button'),section:make('section')};
export function AnimatePresence({children}:{children:ReactNode}){return <>{children}</>}

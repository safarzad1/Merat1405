"use client";

import React, { useEffect, useRef } from "react";
import { X } from "@/component/ResearchIcons";

type RightDrawerProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    widthClassName?: string; // مثلا: "w-[95vw] md:w-[860px]"
    children: React.ReactNode;
};

export default function RightDrawer({
    open,
    onClose,
    title = "جزئیات",
    widthClassName = "w-[92vw] sm:w-[560px] md:w-[720px]",
    children,
}: RightDrawerProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);

    // بستن با ESC
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    // جلوگیری از اسکرول صفحه وقتی Drawer باز است
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // فوکوس روی پنل
    useEffect(() => {
        if (open) setTimeout(() => panelRef.current?.focus(), 0);
    }, [open]);

    return (
        <div
            className={[
                "fixed inset-0 z-[15000]",
                open ? "pointer-events-auto" : "pointer-events-none",
            ].join(" ")}
            aria-hidden={!open}
        >
            {/* بک‌دراپ */}
            <div
                className={[
                    "absolute inset-0 bg-black/40 transition-opacity duration-200",
                    open ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onMouseDown={onClose}
            />

            {/* پنل: از راست می‌آید (RTL-friendly) */}
            <div
                ref={panelRef}
                tabIndex={-1}
                dir="rtl"
                className={[
                    "absolute right-0 top-0 h-full bg-white shadow-2xl outline-none",
                    "transition-transform duration-200 ease-out",
                    widthClassName,
                    open ? "translate-x-0" : "translate-x-full",
                    "flex flex-col",
                ].join(" ")}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* هدر */}
                <div className="h-12 shrink-0 px-3 border-b border-gray-200 bg-sky-800 text-white flex items-center justify-between">
                    <div className="text-sm font-semibold">{title}</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/15 transition"
                        title="بستن"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* بدنه */}
                <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}
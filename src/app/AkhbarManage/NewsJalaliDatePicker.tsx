"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./AkhbarManage.module.css";

const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric", month: "numeric", day: "numeric", timeZone: "Asia/Tehran",
});
const pad = (n: number) => String(n).padStart(2, "0");
const normalize = (s: string) => s.replace(/[۰-۹٠-٩]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c) : "٠١٢٣٤٥٦٧٨٩".indexOf(c)));
function persianParts(date: Date) {
  const items = formatter.formatToParts(date);
  const number = (type: string) => Number(items.find((p) => p.type === type)?.value ?? 0);
  return { y: number("year"), m: number("month"), d: number("day") };
}
function parse(value: string) {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalize(value.trim()));
  if (!m) return null;
  const [y, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return y >= 1300 && y <= 1700 && month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { y, m: month, d: day } : null;
}
function moveMonth(y: number, m: number, count: number) {
  const index = y * 12 + m - 1 + count;
  return { y: Math.floor(index / 12), m: ((index % 12) + 12) % 12 + 1 };
}
function firstDay(y: number, m: number) {
  // Search within 70 days of the approximate start, using UTC to avoid DST drift.
  const start = Date.UTC(y + 621, 2, 1 + (m - 1) * 29, 12);
  for (let i = 0; i < 70; i++) {
    const candidate = new Date(start + i * 86400000);
    const p = persianParts(candidate);
    if (p.y === y && p.m === m && p.d === 1) return candidate;
  }
  throw new Error("تاریخ شمسی نامعتبر است.");
}

export default function NewsJalaliDatePicker({ value, onChange, disabled = false, label, maxToday = false, invalid = false }: {
  value: string; onChange: (date: string) => void; disabled?: boolean; label: string; maxToday?: boolean; invalid?: boolean;
}) {
  const today = persianParts(new Date());
  const selected = parse(value);
  const [view, setView] = useState({ y: selected?.y ?? today.y, m: selected?.m ?? today.m });
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: -10000, left: 0, width: 320, maxHeight: 360 });

  const positionPopup = useCallback(() => {
    if (!root.current || !popupRef.current) return;
    const rect = root.current.getBoundingClientRect();
    const margin = 12;
    const bottomMargin = 30; // Leave comfortable free space at the bottom of the screen.
    const gap = 6;
    const width = Math.min(320, Math.max(220, window.innerWidth - 2 * margin));
    const desiredHeight = popupRef.current.scrollHeight || 340;
    const freeBelow = window.innerHeight - rect.bottom - gap - bottomMargin;
    const freeAbove = rect.top - gap - margin;
    const showAbove = freeBelow < desiredHeight && freeAbove > freeBelow;
    const availableHeight = Math.max(120, showAbove ? freeAbove : freeBelow);
    const maxHeight = Math.min(desiredHeight, availableHeight, window.innerHeight - margin - bottomMargin);
    const top = showAbove
      ? Math.max(margin, rect.top - gap - maxHeight)
      : Math.min(Math.max(margin, rect.bottom + gap), window.innerHeight - bottomMargin - maxHeight);
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - margin - width));
    setPosition({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    positionPopup();
    window.addEventListener("resize", positionPopup);
    // A parent panel may scroll while the calendar is open.
    window.addEventListener("scroll", positionPopup, true);
    return () => {
      window.removeEventListener("resize", positionPopup);
      window.removeEventListener("scroll", positionPopup, true);
    };
  }, [open, positionPopup, view.y, view.m]);
  const start = useMemo(() => firstDay(view.y, view.m), [view.y, view.m]);
  const days = useMemo(() => {
    const next = moveMonth(view.y, view.m, 1);
    return { length: Math.round((firstDay(next.y, next.m).getTime() - start.getTime()) / 86400000), offset: (start.getUTCDay() + 1) % 7 };
  }, [start, view.y, view.m]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  function choose(y: number, m: number, d: number) {
    const now = persianParts(new Date());
    if (maxToday && (y > now.y || (y === now.y && (m > now.m || (m === now.m && d > now.d))))) return;
    onChange(`${y}/${pad(m)}/${pad(d)}`);
    setOpen(false);
  }
  function clear() {
    onChange("");
    setOpen(false);
  }
  return <div className={styles.newsDateRoot} ref={root} dir="rtl">
    <div className={styles.newsDateField}>
      <button type="button" disabled={disabled} aria-label={label} aria-expanded={open} className={styles.newsDateTrigger} aria-invalid={invalid || undefined} onClick={() => { if (!open) setView({ y: selected?.y ?? today.y, m: selected?.m ?? today.m }); setOpen(!open); }}>
        <span dir="ltr">{selected ? `${selected.y}/${pad(selected.m)}/${pad(selected.d)}` : ""}</span><CalendarDays size={17}/>
      </button>
      {!disabled && value.trim() && <button type="button" className={styles.newsDateClear} aria-label={`پاک کردن ${label}`} title={`پاک کردن ${label}`} onClick={clear}><X size={16}/></button>}
    </div>
    {open && typeof document !== "undefined" && createPortal(<div
      ref={popupRef}
      data-news-date-popup="true"
      className={styles.newsDatePopup}
      role="dialog"
      aria-label={`تقویم ${label}`}
      dir="rtl"
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
    >
      <div className={styles.newsDateHeader}>
        <button type="button" aria-label="ماه قبل" onClick={() => setView((p) => moveMonth(p.y, p.m, -1))}><ChevronRight size={18}/></button>
        <strong>{months[view.m - 1]} {view.y}</strong>
        <button type="button" aria-label="ماه بعد" disabled={maxToday && (view.y > today.y || (view.y === today.y && view.m >= today.m))} onClick={() => setView((p) => moveMonth(p.y, p.m, 1))}><ChevronLeft size={18}/></button>
      </div>
      <div className={styles.newsDateGrid}>
        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((x, i) => <b key={i}>{x}</b>)}
        {Array.from({ length: days.offset }, (_, i) => <span key={`blank-${i}`}/>)}
        {Array.from({ length: days.length }, (_, i) => <button type="button" key={i} className={selected?.y === view.y && selected.m === view.m && selected.d === i + 1 ? styles.newsDateSelected : ""} disabled={maxToday && (view.y > today.y || (view.y === today.y && (view.m > today.m || (view.m === today.m && i + 1 > today.d))))} onClick={() => choose(view.y, view.m, i + 1)}>{i + 1}</button>)}
      </div>
      <div className={styles.newsDateActions}>
        <button type="button" onClick={() => choose(today.y, today.m, today.d)}>امروز</button>
        <button type="button" onClick={clear}>پاک کردن</button>
      </div>
    </div>, document.body)}
  </div>;
}

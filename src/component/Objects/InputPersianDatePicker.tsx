"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  label?: string;
  value?: string | null;
  onChange?: (date: string | null) => void;
  allowPastDates?: boolean;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  requiredStarColor?: string;
}

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const WEEK_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const DAY_MS = 86400000;
const pad = (n: number) => String(n).padStart(2, "0");
const persianDigitsToEnglish = (v: string) => v.replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
const dayFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC"
});
const todayFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  year: "numeric", month: "numeric", day: "numeric", timeZone: "Asia/Tehran"
});

type JalaliDay = { y: number; m: number; d: number };
function toParts(date: Date, formatter = dayFormatter): JalaliDay {
  const parts = formatter.formatToParts(date);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value ?? 0);
  return { y: part("year"), m: part("month"), d: part("day") };
}
function getToday(): JalaliDay { return toParts(new Date(), todayFormatter); }
function parseDate(value: string | null | undefined): JalaliDay | null {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(persianDigitsToEnglish((value || "").trim()));
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
}
function monthShift(y: number, m: number, offset: number) {
  const n = y * 12 + m - 1 + offset;
  return { y: Math.floor(n / 12), m: ((n % 12) + 12) % 12 + 1 };
}
// Find the first day using the browser's accurate Persian calendar rather than
// assuming 30 days for all months. The search is within 40 days of March 20 + 30*(month-1).
function monthStart(y: number, m: number): Date {
  const approximate = Date.UTC(y + 621, 2, 20 + (m - 1) * 30, 12);
  for (let offset = -40; offset <= 40; offset++) {
    const date = new Date(approximate + offset * DAY_MS);
    const parts = toParts(date);
    if (parts.y === y && parts.m === m && parts.d === 1) return date;
  }
  // Input years are limited by the navigation controls, so this is only defensive.
  return new Date(approximate);
}
function dayKey(d: JalaliDay) { return d.y * 10000 + d.m * 100 + d.d; }
function dateString(d: JalaliDay) { return `${d.y}/${pad(d.m)}/${pad(d.d)}`; }

/** Return today in Iran as a Gregorian-free yyyy/MM/dd Jalali string. */
export function getTodayJalali(): string {
  return dateString(getToday());
}

export default function InputPersianDate({
  label, value, onChange, allowPastDates = true, error, errorMessage, required, requiredStarColor
}: Props) {
  const today = getToday();
  const selected = parseDate(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: selected?.y ?? today.y, m: selected?.m ?? today.m });
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || typeof window === "undefined") return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = Math.min(330, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const height = 368;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const top = below >= height || below >= above
      ? Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - height - 8))
      : Math.max(8, rect.top - height - 6);
    setPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !popupRef.current?.contains(target)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    // Position is kept in sync when a scrollable modal moves.
    const moved = () => updatePosition();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", moved);
    window.addEventListener("scroll", moved, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", moved);
      window.removeEventListener("scroll", moved, true);
    };
  }, [open, updatePosition]);

  const calendar = useMemo(() => {
    const first = monthStart(view.y, view.m);
    const next = monthShift(view.y, view.m, 1);
    const numberOfDays = Math.round((monthStart(next.y, next.m).getTime() - first.getTime()) / DAY_MS);
    return { offset: (first.getUTCDay() + 1) % 7, numberOfDays };
  }, [view.y, view.m]);

  const choose = (day: JalaliDay) => {
    if (!allowPastDates && dayKey(day) < dayKey(getToday())) return;
    onChange?.(dateString(day));
    setOpen(false);
  };
  const toggle = () => {
    if (!open) {
      const now = getToday();
      setView({ y: selected?.y ?? now.y, m: selected?.m ?? now.m });
      updatePosition();
    }
    setOpen(o => !o);
  };
  const yearStart = Math.min(today.y - 30, view.y - 4);
  const yearEnd = Math.max(today.y + 30, view.y + 4);

  return (
    <div className="research-field merat-jalali-field" dir="rtl">
      {label && <label>{label}{required && <span className="research-required" style={requiredStarColor ? { color: requiredStarColor } : undefined}>*</span>}</label>}
      <div className={`merat-jalali-input ${error ? "research-control-error" : ""}`} ref={anchorRef}>
        <button type="button" className="merat-jalali-trigger" onClick={toggle} aria-haspopup="dialog" aria-expanded={open} aria-label={label ? `انتخاب تاریخ ${label}` : "انتخاب تاریخ شمسی"}>
          <CalendarDays size={18} aria-hidden="true" />
          <span dir="ltr">{value || "انتخاب تاریخ شمسی"}</span>
          <ChevronLeft size={16} className="merat-jalali-trigger-arrow" aria-hidden="true" />
        </button>
      </div>
      {error && errorMessage && <small className="research-error">{errorMessage}</small>}
      {open && typeof document !== "undefined" && createPortal(
        <div ref={popupRef} className="merat-jalali-popup" dir="rtl" role="dialog" aria-label="تقویم شمسی" style={{ position: "fixed", top: position.top, left: position.left, width: position.width, zIndex: 2147483600 }}>
          <div className="merat-jalali-nav">
            <button type="button" onClick={() => setView(v => monthShift(v.y, v.m, -1))} aria-label="ماه قبل"><ChevronRight size={17} /></button>
            <select aria-label="ماه شمسی" value={view.m} onChange={e => setView(v => ({ ...v, m: Number(e.target.value) }))}>
              {MONTHS.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}
            </select>
            <select aria-label="سال شمسی" value={view.y} onChange={e => setView(v => ({ ...v, y: Number(e.target.value) }))}>
              {Array.from({ length: yearEnd - yearStart + 1 }, (_, index) => yearStart + index).map(year => <option value={year} key={year}>{year}</option>)}
            </select>
            <button type="button" onClick={() => setView(v => monthShift(v.y, v.m, 1))} aria-label="ماه بعد"><ChevronLeft size={17} /></button>
          </div>
          <div className="merat-jalali-grid">
            {WEEK_DAYS.map((day, i) => <strong key={i}>{day}</strong>)}
            {Array.from({ length: calendar.offset }, (_, i) => <span key={`empty-${i}`} />)}
            {Array.from({ length: Math.max(0, calendar.numberOfDays) }, (_, i) => {
              const day = { y: view.y, m: view.m, d: i + 1 };
              const active = selected && dayKey(day) === dayKey(selected);
              const isToday = dayKey(day) === dayKey(today);
              const disabled = !allowPastDates && dayKey(day) < dayKey(today);
              return <button type="button" key={i} disabled={disabled} className={`${active ? "is-selected" : ""} ${isToday ? "is-today" : ""}`} aria-label={dateString(day)} aria-pressed={!!active} onClick={() => choose(day)}>{i + 1}</button>;
            })}
          </div>
          <div className="merat-jalali-footer">
            <button type="button" onClick={() => choose(getToday())}>امروز</button>
            {value && <button type="button" onClick={() => { onChange?.(null); setOpen(false); }}>پاک کردن</button>}
            <button type="button" className="merat-jalali-close" onClick={() => setOpen(false)} aria-label="بستن تقویم"><X size={16} /></button>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

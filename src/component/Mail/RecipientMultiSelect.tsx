"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { MailGroupRow, PickedRecipient } from "./types";
import styles from "./Mail.module.css";

function normalizeFa(value: string) {
  return String(value || "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export default function RecipientMultiSelect({ items, loading, value, onChange }: { items: MailGroupRow[]; loading?: boolean; value: PickedRecipient[]; onChange: (value: PickedRecipient[]) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const selectedIds = useMemo(() => new Set(value.map((x) => Number(x.id))), [value]);
  const filtered = useMemo(() => {
    const q = normalizeFa(query);
    return (items || []).filter((x) => !q || normalizeFa(x.OnvanGroup).includes(q));
  }, [items, query]);
  const toggle = (item: MailGroupRow) => {
    const id = Number(item.ID);
    if (selectedIds.has(id)) onChange(value.filter((x) => Number(x.id) !== id));
    else onChange([...value, { id, title: item.OnvanGroup }]);
  };
  return (
    <div ref={rootRef} className={styles.recipientBox}>
      <div className={styles.recipientControl} onClick={() => setOpen(true)}>
        {value.map((x) => <span key={x.id} className={styles.recipientChip}>{x.title}<button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v.id !== x.id)); }}><X size={13} /></button></span>)}
        <input className={styles.recipientSearch} value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={loading ? "در حال دریافت..." : value.length ? "افزودن گیرنده..." : "گروه یا کاربر را انتخاب کنید..."} disabled={loading} />
        <ChevronDown size={16} />
      </div>
      {open ? <div className={styles.recipientMenu}>
        {filtered.length === 0 ? <div className={styles.empty} style={{ minHeight: 70 }}>موردی یافت نشد.</div> : filtered.map((item) => {
          const selected = selectedIds.has(Number(item.ID));
          return <button key={item.ID} type="button" className={`${styles.recipientOption} ${selected ? styles.recipientOptionSelected : ""}`} onClick={() => toggle(item)}>
            <span className={styles.optionCheck}>{selected ? <Check size={12} /> : null}</span><span>{item.OnvanGroup}</span>
          </button>;
        })}
      </div> : null}
    </div>
  );
}

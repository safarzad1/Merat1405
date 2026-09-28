"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import styles from "./Mail.module.css";

export default function MailEditor({ value, onChange, placeholder = "متن پیام را وارد کنید..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);
  const cmd = (name: string) => { ref.current?.focus(); document.execCommand(name); onChange(ref.current?.innerHTML || ""); };
  return <>
    <div className={styles.editorToolbar}>
      <button type="button" onClick={() => cmd("bold")} title="ضخیم"><Bold size={15} /></button>
      <button type="button" onClick={() => cmd("italic")} title="مورب"><Italic size={15} /></button>
      <button type="button" onClick={() => cmd("underline")} title="زیرخط"><Underline size={15} /></button>
      <button type="button" onClick={() => cmd("insertUnorderedList")} title="فهرست"><List size={15} /></button>
    </div>
    <div ref={ref} className={styles.editor} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={(e) => onChange(e.currentTarget.innerHTML)} />
  </>;
}

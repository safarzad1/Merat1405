"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  isOpen: boolean;
  message: string;
  header?: string;
  type?: "success" | "warning" | "error";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, message, header, type = "success", onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <div className="research-modal-root" role="presentation">
      <button type="button" className="research-modal-backdrop" onClick={onCancel} aria-label="بستن پنجره" />
      <section className="research-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="merat-confirm-title" aria-describedby="merat-confirm-message" dir="rtl">
        <header className={`research-modal-header merat-modal-tone--${/برگشت|بازگشت/.test(header || "") ? "return" : type === "warning" || type === "error" ? "notice" : "confirm"}`} id="merat-confirm-title">{header || "تأیید عملیات"}</header>
        <div className="research-modal-body">
          <p id="merat-confirm-message" style={{ margin: 0 }}>{message}</p>
          <div className="research-modal-actions">
            <button type="button" className="research-button primary" onClick={onConfirm}>{type === "error" ? "تأیید" : "بله، تأیید می‌کنم"}</button>
            <button type="button" className="research-button secondary" ref={cancelRef} onClick={onCancel}>انصراف</button>
          </div>
        </div>
      </section>
    </div>, document.body
  );
}

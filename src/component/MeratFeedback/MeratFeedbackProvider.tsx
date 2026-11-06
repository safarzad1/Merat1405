"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  MERAT_FEEDBACK_EVENT,
  setMeratFeedbackHostReady,
  type MeratFeedbackRequest,
} from "./feedback";

function toneClass(type: MeratFeedbackRequest["type"]) {
  if (type === "success") return "merat-modal-tone--confirm";
  if (type === "info") return "merat-modal-tone--neutral";
  return "merat-modal-tone--notice";
}

export default function MeratFeedbackProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<MeratFeedbackRequest[]>([]);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const current = queue[0] || null;

  useEffect(() => {
    const onRequest = (event: Event) => {
      const request = (event as CustomEvent<MeratFeedbackRequest>).detail;
      if (!request || !request.message) return;
      setQueue((items) => [...items, request]);
    };
    window.addEventListener(MERAT_FEEDBACK_EVENT, onRequest);
    setMeratFeedbackHostReady(true);
    return () => {
      setMeratFeedbackHostReady(false);
      window.removeEventListener(MERAT_FEEDBACK_EVENT, onRequest);
    };
  }, []);

  const close = useCallback((accepted: boolean) => {
    if (!current) return;
    if (current.kind === "confirm") current.resolve(accepted);
    setQueue((items) => items.slice(1));
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [current, close]);

  const dialog = current && typeof document !== "undefined" ? createPortal(
    <div className="research-modal-root" dir="rtl">
      <button
        type="button"
        className="research-modal-backdrop"
        onClick={() => close(false)}
        aria-label="بستن پنجره"
      />
      <section
        className="research-modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="merat-feedback-title"
        aria-describedby="merat-feedback-message"
      >
        <header id="merat-feedback-title" className={`research-modal-header ${toneClass(current.type)}`}>
          {current.title}
        </header>
        <div className="research-modal-body">
          <p id="merat-feedback-message" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{current.message}</p>
          <div className="research-modal-actions">
            {current.kind === "confirm" ? <>
              <button type="button" className="research-button primary" onClick={() => close(true)}>
                {current.confirmText || "تأیید"}
              </button>
              <button type="button" className="research-button secondary" ref={confirmButtonRef} onClick={() => close(false)}>
                {current.cancelText || "انصراف"}
              </button>
            </> : <button type="button" className="research-button primary" ref={confirmButtonRef} onClick={() => close(true)}>
              {current.confirmText || "متوجه شدم"}
            </button>}
          </div>
        </div>
      </section>
    </div>,
    document.body
  ) : null;

  return <>{children}{dialog}</>;
}

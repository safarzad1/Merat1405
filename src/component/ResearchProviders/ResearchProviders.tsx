"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function ResearchProviders({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; type?: string }>).detail;
      if (!detail?.message) return;
      setToast({ message: detail.message, type: detail.type || "info" });
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener("merat-toast", handler);
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("merat-toast", handler);
    };
  }, []);
  return <>{children}{toast ? <div className={`research-toast ${toast.type}`} role="status">{toast.message}</div> : null}</>;
}

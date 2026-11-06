"use client";
type ToastKind = "success" | "error" | "warning" | "info";
function dispatchToast(type: ToastKind, message: string, title?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("merat-toast", { detail: { message, title, type } }));
  }
}
export const showToast = {
  success: (message: string, title?: string) => dispatchToast("success", message, title),
  error: (message: string, title?: string) => dispatchToast("error", message, title),
  warning: (message: string, title?: string) => dispatchToast("warning", message, title),
  info: (message: string, title?: string) => dispatchToast("info", message, title),
};

"use client";

export type MeratFeedbackTone = "info" | "success" | "warning" | "error";

export type MeratAlertOptions = {
  title?: string;
  type?: MeratFeedbackTone;
  confirmText?: string;
};

export type MeratConfirmOptions = {
  title?: string;
  type?: MeratFeedbackTone;
  confirmText?: string;
  cancelText?: string;
};

export type MeratFeedbackRequest =
  | ({ kind: "alert"; message: string; confirmText?: string } & Required<Pick<MeratAlertOptions, "title" | "type">>)
  | ({ kind: "confirm"; message: string; confirmText?: string; cancelText?: string; resolve: (accepted: boolean) => void } & Required<Pick<MeratConfirmOptions, "title" | "type">>);

export const MERAT_FEEDBACK_EVENT = "merat:feedback-request";
let feedbackHostReady = false;
const pendingRequests: MeratFeedbackRequest[] = [];

function dispatchRequest(request: MeratFeedbackRequest) {
  if (typeof window === "undefined") return;
  if (!feedbackHostReady) {
    pendingRequests.push(request);
    return;
  }
  window.dispatchEvent(new CustomEvent<MeratFeedbackRequest>(MERAT_FEEDBACK_EVENT, { detail: request }));
}

export function setMeratFeedbackHostReady(ready: boolean) {
  feedbackHostReady = ready;
  if (ready && typeof window !== "undefined" && pendingRequests.length) {
    const waiting = pendingRequests.splice(0, pendingRequests.length);
    waiting.forEach((request) => {
      window.dispatchEvent(new CustomEvent<MeratFeedbackRequest>(MERAT_FEEDBACK_EVENT, { detail: request }));
    });
  }
}

function toMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value.trim() ? value : "عملیات انجام نشد.";
  if (value === null || value === undefined) return "عملیات انجام نشد.";
  try { return String(value); } catch { return "عملیات انجام نشد."; }
}

function defaultTitle(type: MeratFeedbackTone, confirm: boolean) {
  if (confirm) return "تأیید عملیات";
  if (type === "success") return "عملیات موفق";
  if (type === "warning") return "توجه";
  if (type === "info") return "پیام سامانه";
  return "خطا";
}

export function meratAlert(message: unknown, options: MeratAlertOptions = {}) {
  if (typeof window === "undefined") return;
  const type = options.type || "error";
  const request: MeratFeedbackRequest = {
    kind: "alert",
    message: toMessage(message),
    title: options.title || defaultTitle(type, false),
    type,
    confirmText: options.confirmText || "متوجه شدم",
  };
  dispatchRequest(request);
}

export function meratConfirm(message: unknown, options: MeratConfirmOptions = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const type = options.type || "warning";
  return new Promise<boolean>((resolve) => {
    const request: MeratFeedbackRequest = {
      kind: "confirm",
      message: toMessage(message),
      title: options.title || defaultTitle(type, true),
      type,
      confirmText: options.confirmText || "بله، تأیید می‌کنم",
      cancelText: options.cancelText || "انصراف",
      resolve,
    };
    dispatchRequest(request);
  });
}

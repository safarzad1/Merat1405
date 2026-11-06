"use client";

import type { ReactNode } from "react";
import { meratAlert, meratConfirm } from "@/component/MeratFeedback/feedback";

export type AlertOptions = {
  title: string;
  description: string;
  type?: "info" | "warning" | "error" | "success";
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
};

export function AlertProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAlert() {
  const showAlert = (options: AlertOptions) => {
    if (options.showCancel) {
      void meratConfirm(options.description, {
        title: options.title,
        type: options.type || "warning",
        confirmText: options.confirmText || "تأیید",
        cancelText: options.cancelText || "انصراف",
      }).then(async (accepted) => {
        if (accepted && options.onConfirm) {
          try { await options.onConfirm(); }
          catch (error) { meratAlert(error, { title: "عملیات ناموفق", type: "error" }); }
        }
      });
      return;
    }
    meratAlert(options.description, {
      title: options.title,
      type: options.type || "error",
      confirmText: options.confirmText || "متوجه شدم",
    });
  };
  return { showAlert };
}

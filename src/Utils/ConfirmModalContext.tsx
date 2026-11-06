"use client";

import type { ReactNode } from "react";
import { meratAlert, meratConfirm } from "@/component/MeratFeedback/feedback";

type ConfirmType = "success" | "warning" | "error";
type ConfirmAction = () => void | Promise<void>;

export function ConfirmModalProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useConfirm() {
  const showConfirm = (
    message: string,
    action: ConfirmAction,
    header?: string,
    type: ConfirmType = "success",
  ) => {
    void meratConfirm(message, { title: header || "تأیید عملیات", type }).then(async (accepted) => {
      if (!accepted) return;
      try { await action(); }
      catch (error) { meratAlert(error, { title: "عملیات ناموفق", type: "error" }); }
    });
  };
  return { showConfirm };
}

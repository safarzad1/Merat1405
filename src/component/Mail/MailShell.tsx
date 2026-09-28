"use client";

import type { ReactNode } from "react";
import MailSidebar from "./MailSidebar";
import MailTopbar from "./MailTopbar";
import styles from "./Mail.module.css";

export default function MailShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} dir="rtl">
      <MailTopbar />
      <div className={styles.workspace}>
        <MailSidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

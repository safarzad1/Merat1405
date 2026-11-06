import type { Metadata } from "next";
import "./globals.css";
import ThemeRuntime from "@/component/ThemeRuntime";
import ChatLauncher from "@/component/MeratChat/ChatLauncher";
import MeratFeedbackProvider from "@/component/MeratFeedback/MeratFeedbackProvider";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "مرآت جدید",
  description: "نسخه جدید سامانه مرآت",
  icons: {
    icon: "/Logo.png",
    shortcut: "/Logo.png",
    apple: "/Logo.png",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get("token")?.value) && cookieStore.get("merat-new-session")?.value === "1";
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning><ThemeRuntime authenticated={hasSession} />{hasSession ? <MeratFeedbackProvider>{children}</MeratFeedbackProvider> : children}{hasSession ? <ChatLauncher /> : null}</body>
    </html>
  );
}

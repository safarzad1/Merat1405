import type { Metadata } from "next";
import "./globals.css";
import ThemeRuntime from "@/component/ThemeRuntime";

export const metadata: Metadata = {
  title: "مرآت جدید",
  description: "نسخه جدید سامانه مرآت",
  icons: {
    icon: "/Logo.png",
    shortcut: "/Logo.png",
    apple: "/Logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning><ThemeRuntime />{children}</body>
    </html>
  );
}

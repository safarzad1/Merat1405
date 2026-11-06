import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function LegacyNewsSettingsPage() {
  redirect("/AdminSettings?tab=news");
}

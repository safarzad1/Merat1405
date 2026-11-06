import { redirect } from "next/navigation";

// Old bookmarks remain valid; analytics is no longer a standalone page/menu.
export default function LegacyNewsAnalyticsRedirect() {
  redirect("/Dashboard?tab=news");
}

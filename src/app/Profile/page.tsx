import PanelPage from "@/component/PanelPage";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <PanelPage title="پروفایل من"><ProfileClient /></PanelPage>;
}

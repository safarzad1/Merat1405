import PanelPage from "@/component/PanelPage";
import UsersListClient from "../Ostan/UsersListClient";

export const dynamic = "force-dynamic";
export default function Page() {
  return <PanelPage title="مدیریت کاربران ستاد"><UsersListClient scope="setad" /></PanelPage>;
}

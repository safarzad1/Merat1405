import PanelPage from "@/component/PanelPage";
import UsersListClient from "./UsersListClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PanelPage title="مدیریت کاربران استان و شهرستان">
      <UsersListClient />
    </PanelPage>
  );
}

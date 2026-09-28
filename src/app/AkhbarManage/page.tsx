import PanelPage from "@/component/PanelPage";
import AkhbarClient from "./AkhbarClient";

export const dynamic = "force-dynamic";

export default function AkhbarManagePage() {
  return (
    <PanelPage title="مدیریت اخبار">
      <AkhbarClient />
    </PanelPage>
  );
}

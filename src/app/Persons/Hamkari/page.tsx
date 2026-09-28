import PanelPage from "@/component/PanelPage";
import HamkariClient from "./HamkariClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PanelPage title="همکاران">
      <HamkariClient />
    </PanelPage>
  );
}

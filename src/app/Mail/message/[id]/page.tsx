import { decryptText } from "@/lib/cryptoUtil";
import MessagePageClient from "./MessagePageClient";

export default async function Page({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const p = await params;
  let decoded = "";
  try { decoded = decryptText(decodeURIComponent(p.id)); } catch { decoded = ""; }
  if (!decoded && /^\d+$/.test(String(p.id || ""))) decoded = String(p.id);
  return <MessagePageClient id={decoded} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasToken = Boolean(cookieStore.get("token")?.value);
  const hasSession = cookieStore.get("merat-new-session")?.value === "1";

  redirect(hasToken && hasSession ? "/Dashboard" : "/Login");
}

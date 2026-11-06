import { cookies } from "next/headers";
import { getAuthActor } from "@/lib/userScope";

/**
 * Bridge V2 APIs to Merat's existing server-side JWT session.
 * The browser never supplies a UserId. We require both the signed token and
 * the new-session marker, then re-check the user against dbo.Users via getAuthActor.
 */
export async function getAuthenticatedUserId(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const isNewSession = cookieStore.get("merat-new-session")?.value === "1";
  if (!token || !isNewSession) throw new Error("UNAUTHORIZED");

  try {
    const actor = await getAuthActor(token);
    if (!Number.isSafeInteger(actor.userId) || actor.userId <= 0) throw new Error("UNAUTHORIZED");
    return actor.userId;
  } catch (error) {
    if (error instanceof Error && (
      error.message === "UNAUTHORIZED" ||
      ["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(error.name)
    )) throw new Error("UNAUTHORIZED");
    throw error;
  }
}

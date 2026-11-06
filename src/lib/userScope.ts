import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export type AuthActor = { userId: number; mahal: number };

export async function getAuthActor(token?: string): Promise<AuthActor> {
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifyToken(token) as { userId?: number | string };
  const userId = Number(payload?.userId || 0);
  if (!userId) throw new Error("UNAUTHORIZED");

  const pool = await getConnection();
  const result = await pool.request()
    .input("UserId", sql.BigInt, userId)
    .query("SELECT TOP 1 UserId, Mahal FROM dbo.Users WHERE UserId=@UserId AND ISNULL(IsActive,1)=1");
  const row = result.recordset?.[0];
  if (!row) throw new Error("UNAUTHORIZED");
  return { userId: Number(row.UserId), mahal: Number(row.Mahal) };
}

export function isMahalInScope(actorMahal: number, targetMahal: number) {
  const actor = String(Number(actorMahal) || "");
  const target = String(Number(targetMahal) || "");
  return Boolean(actor && target && target.startsWith(actor));
}

export async function assertMahalInScope(token: string | undefined, targetMahal: number) {
  const actor = await getAuthActor(token);
  if (!isMahalInScope(actor.mahal, Number(targetMahal))) throw new Error("FORBIDDEN");
  return actor;
}

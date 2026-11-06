import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";

// Always read the current database flag; never trust browser storage or a client-supplied UserId.
export async function getAdminAccess(token?: string) {
  const actor = await getAuthActor(token);
  const pool = await getConnection();
  const row = (await pool.request().input("UserId", sql.BigInt, actor.userId)
    .query("SELECT TOP(1) CAST(IsAdmin AS bit) AS IsAdmin FROM dbo.Users WHERE UserId=@UserId AND ISNULL(IsActive,1)=1"))
    .recordset?.[0];
  if (!row) throw new Error("UNAUTHORIZED");
  return { actor, pool, isAdmin: row.IsAdmin === true || row.IsAdmin === 1 };
}

export async function requireAdmin(token?: string) {
  const access = await getAdminAccess(token);
  if (!access.isAdmin) throw new Error("FORBIDDEN");
  return access;
}

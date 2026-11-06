import { getMeratPool, sql } from "./db";

/** Calls must first authorize and paginate rows through their existing inbox SP. */
export async function withReturnNotices(
  rows: Record<string, unknown>[],
  idField: "ReferralId" | "CountyReferralId",
): Promise<Record<string, unknown>[]> {
  const ids = [...new Set(rows.map(r => Number(r[idField])))]
    .filter(id => Number.isSafeInteger(id) && id > 0);
  if (ids.length === 0) return rows;
  const pool = await getMeratPool();
  const result = await pool.request()
    .input("Ids", sql.NVarChar(sql.MAX), JSON.stringify(ids))
    .query(`
      SELECT x.ChildReferralId, x.ReturnReason
      FROM (
        SELECT h.ChildReferralId,h.ReturnReason,
          ROW_NUMBER() OVER (PARTITION BY h.ChildReferralId ORDER BY h.ReturnId DESC) AS rn
        FROM TahghighatV2.ChildReturnHistory h
        JOIN TahghighatV2.Referral r ON r.ReferralId=h.ChildReferralId
        WHERE r.IsClosed=0 AND r.IsDeleted=0 AND r.StateCode='CHILD_WORKING'
          AND h.ChildReferralId IN (
            SELECT TRY_CONVERT(bigint, [value]) FROM OPENJSON(@Ids)
          )
      ) x WHERE x.rn=1;
    `);
  const reasons = new Map<number, string>();
  for (const r of result.recordset) reasons.set(Number(r.ChildReferralId), String(r.ReturnReason || ""));
  return rows.map(r => ({ ...r, ReturnReason: reasons.get(Number(r[idField])) ?? null }));
}

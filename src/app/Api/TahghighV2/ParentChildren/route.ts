import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DestinationInfo = {
  CityId: number;
  CityName: string | null;
  ProvinceName: string | null;
  HozehName: string | null;
};

// All referral identifiers are authorized by SP_GetParentChildren before
// looking up the corresponding geographic labels. Never take a city scope
// from the browser and never use the permissions-gated modal destination list
// to name historical referrals.
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const parent = requiredInt(req.nextUrl.searchParams.get("parentReferralId"), "ارجاع اصلی");
    const rows = await execute("TahghighatV2.SP_GetParentChildren", query => query
      .input("ParentReferralId", sql.BigInt, parent)
      .input("UserId", sql.BigInt, userId));

    if (rows.length === 0) return respond(rows);

    const destinationIds = [...new Set(rows.map(row => Number(row.ToMahal)))].filter(
      id => Number.isSafeInteger(id) && id > 0,
    );
    if (destinationIds.length === 0) return respond(rows);

    const pool = await getMeratPool();
    const result = await pool.request()
      .input("DestinationIdsJson", sql.NVarChar(sql.MAX), JSON.stringify(destinationIds))
      .query(`
        SELECT
          c.CityId,
          c.Name AS CityName,
          p.Name AS ProvinceName,
          NULLIF(LTRIM(RTRIM(h.NameHozeh)), N'') AS HozehName
        FROM dbo.Citys c
        LEFT JOIN dbo.Citys p ON p.CityId = c.PCityId
        OUTER APPLY (
          SELECT TOP (1) hz.NameHozeh
          FROM Entekhabat.Hozeh hz
          WHERE c.IsHoze = 1
            AND hz.MarkazHozeh = c.CityId
            AND hz.Ostan = c.PCityId
          ORDER BY hz.ID DESC
        ) h
        WHERE c.CityId IN (
          SELECT DISTINCT TRY_CONVERT(int, [value])
          FROM OPENJSON(@DestinationIdsJson)
          WHERE TRY_CONVERT(int, [value]) IS NOT NULL
        );
      `);

    // The list can only display the delete action when the authenticated
    // province user is allowed to cancel an untouched child. SQL re-checks
    // all these conditions transactionally when deletion is submitted.
    const eligibility = await pool.request()
      .input("ParentReferralId", sql.BigInt, parent)
      .input("UserId", sql.BigInt, userId)
      .query(`
        SELECT r.ReferralId,
          CONVERT(bit, CASE WHEN
            u.PostId IN (51,52)
            AND u.IsActive=1 AND u.Mahal=p.ToMahal
            AND p.IsDeleted=0 AND p.IsClosed=0 AND p.StateCode='PENDING_CHILD_RESULTS'
            AND r.IsDeleted=0 AND r.IsClosed=0 AND r.StateCode='CHILD_INBOX'
            AND r.ReceiverLevel IN ('OSTAN','HOZE')
            AND EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission ap
                WHERE ap.PostId=u.PostId AND ap.ActionCode='CANCEL_CHILD_REFERRAL' AND ap.IsAllowed=1)
            AND EXISTS (SELECT 1 FROM TahghighatV2.WorkflowEvent e
                WHERE e.ReferralId=r.ReferralId AND e.ActionCode='CHILD_CREATED')
            AND NOT EXISTS (SELECT 1 FROM TahghighatV2.WorkflowEvent e
                WHERE e.ReferralId=r.ReferralId AND e.ActionCode<>'CHILD_CREATED')
            AND NOT EXISTS (SELECT 1 FROM TahghighatV2.Referral x
                WHERE x.ParentReferralId=r.ReferralId)
            AND NOT EXISTS (SELECT 1 FROM TahghighatV2.ResearchAssignment a
                WHERE a.ReferralId=r.ReferralId)
            AND NOT EXISTS (SELECT 1 FROM TahghighatV2.ProvinceSummary s
                WHERE s.ReferralId=r.ReferralId)
            AND NOT EXISTS (SELECT 1 FROM TahghighatV2.HozeSummary s
                WHERE s.ReferralId=r.ReferralId)
            AND NOT EXISTS (SELECT 1 FROM TahghighatV2.NoResearchDecision n
                WHERE n.ReferralId=r.ReferralId)
            THEN 1 ELSE 0 END) AS CanDelete
        FROM TahghighatV2.Referral r
        JOIN TahghighatV2.Referral p ON p.ReferralId=r.ParentReferralId
        JOIN dbo.Users u ON u.UserId=@UserId
        WHERE p.ReferralId=@ParentReferralId AND r.IsDeleted=0;
      `);
    const canDelete = new Map<number, boolean>();
    for (const item of eligibility.recordset) {
      canDelete.set(Number(item.ReferralId), Boolean(item.CanDelete));
    }

    const names = new Map<number, DestinationInfo>();
    for (const item of result.recordset as DestinationInfo[]) {
      names.set(Number(item.CityId), item);
    }

    const textOrEmpty = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";

    return respond(rows.map(row => {
      const match = names.get(Number(row.ToMahal));
      const level = String(row.ReceiverLevel || "").toUpperCase();
      const centerCityName = textOrEmpty(match?.CityName);
      const officialHozehName = textOrEmpty(match?.HozehName);
      const provinceName = textOrEmpty(match?.ProvinceName);
      const displayName = level === "HOZE"
        ? officialHozehName || centerCityName
        : centerCityName;
      return {
        ...row,
        CanDelete: canDelete.get(Number(row.ReferralId)) === true,
        DestinationName: displayName || null,
        DestinationCityName: level === "HOZE" ? centerCityName || null : null,
        DestinationProvinceName: level === "HOZE" ? provinceName || null : null,
      };
    }));
  } catch (error) {
    return fail(error);
  }
}

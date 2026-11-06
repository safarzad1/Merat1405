import { NextRequest } from "next/server";
import { authenticatedUserId, fail, respond } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Both province and Hoze options are authorization-scoped; a client-supplied province is never trusted.
// Delegation itself is separately rechecked by TahghighatV2.SP_DelegateChild.
export async function GET(_request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const pool = await getMeratPool();
    const result = await pool.request().input("UserId", sql.BigInt, userId).query(`
      DECLARE @Province int, @PostId int, @CanReferHoze bit=0, @CanReferOtherProvince bit=0;
      SELECT @Province = Mahal, @PostId = PostId
      FROM dbo.Users WHERE UserId = @UserId AND IsActive = 1;
      IF @PostId NOT IN (51, 52) OR @Province IS NULL OR NOT EXISTS (
        SELECT 1 FROM dbo.Citys WHERE CityId = @Province AND PCityId = 1 AND IsActive = 1
      )
      BEGIN
        THROW 53402, N'دسترسی به مقصدهای ارجاع استان مجاز نیست.', 1;
      END;

      -- The picker and SP_DelegateChild use the same sender action permissions.
      SELECT @CanReferHoze = CONVERT(bit, CASE WHEN EXISTS (
        SELECT 1 FROM TahghighatV2.PostActionPermission
        WHERE PostId=@PostId AND ActionCode='REFER_HOZE' AND IsAllowed=1
      ) THEN 1 ELSE 0 END);
      SELECT @CanReferOtherProvince = CONVERT(bit, CASE WHEN EXISTS (
        SELECT 1 FROM TahghighatV2.PostActionPermission
        WHERE PostId=@PostId AND ActionCode='REFER_OTHER_OSTAN' AND IsAllowed=1
      ) THEN 1 ELSE 0 END);

      SELECT c.CityId AS DestinationCityId,
        COALESCE(NULLIF(h.NameHozeh,N''), c.Name) AS DestinationName,
        CAST('HOZE' AS varchar(20)) AS TargetLevel,
        CONVERT(bit, 1) AS CanRefer
      FROM dbo.Citys c
      OUTER APPLY (
        SELECT TOP(1) hz.NameHozeh FROM Entekhabat.Hozeh hz
        WHERE hz.MarkazHozeh = c.CityId AND hz.Ostan = @Province
        ORDER BY hz.ID DESC
      ) h
      WHERE @CanReferHoze=1
        AND c.PCityId=@Province AND c.IsHoze=1 AND c.IsActive=1
        AND EXISTS (
          SELECT 1
          FROM dbo.Users u
          INNER JOIN TahghighatV2.PostActionPermission p ON p.PostId = u.PostId
          WHERE u.Mahal = c.CityId
            AND u.IsActive = 1
            AND u.PostId = 61
            AND p.ActionCode = 'CHILD_REPLY'
            AND p.IsAllowed = 1
        )
      UNION ALL
      -- A province can receive a cross-province referral only if it has an active
      -- province user who can process child referrals (the same check as SQL).
      SELECT c.CityId, c.Name, CAST('OSTAN' AS varchar(20)),
        CONVERT(bit, 1) AS CanRefer
      FROM dbo.Citys c
      WHERE @CanReferOtherProvince=1
        AND c.PCityId=1 AND c.CityId<>@Province AND c.IsActive=1
        AND EXISTS (
          SELECT 1
          FROM dbo.Users u
          INNER JOIN TahghighatV2.PostActionPermission p ON p.PostId=u.PostId
          WHERE u.Mahal=c.CityId
            AND u.IsActive=1
            AND u.PostId IN (51,52)
            AND p.ActionCode='CHILD_REPLY'
            AND p.IsAllowed=1
        )
      ORDER BY TargetLevel, DestinationName;
    `);
    return respond((result.recordset || []) as Record<string, unknown>[]);
  } catch (error) { return fail(error); }
}

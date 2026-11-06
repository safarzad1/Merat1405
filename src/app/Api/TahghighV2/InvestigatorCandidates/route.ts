import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, fail, respond, requiredInt } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegacyCandidate = {
  legacyCode: string | null;
  personId: string;
  fullName: string;
};

/**
 * Loads special-province investigators from the authoritative legacy
 * collaboration procedure. These people are collaborators, not V2 users:
 * PersonId is the identity key and AuthUserId is deliberately not required.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(
      req.nextUrl.searchParams.get("referralId"),
      "شناسه ارجاع"
    );

    const pool = await getMeratPool();

    // Province and election code are derived from the authenticated user's
    // own province referral. They are never accepted from the browser.
    const scopeResult = await pool.request()
      .input("UserId", sql.BigInt, userId)
      .input("ReferralId", sql.BigInt, referralId)
      .query(`
        SELECT TOP (1)
          CONVERT(int, u.Mahal) AS ProvinceCityId,
          cf.CodeEntekhabat
        FROM dbo.Users u
        JOIN TahghighatV2.Referral r
          ON r.ReferralId = @ReferralId
         AND r.ToMahal = u.Mahal
         AND r.ReceiverLevel = 'OSTAN'
         AND r.IsDeleted = 0
         AND r.IsClosed = 0
        JOIN TahghighatV2.CaseFile cf ON cf.CaseId = r.CaseId
        JOIN dbo.Citys c
          ON c.CityId = u.Mahal
         AND c.PCityId = 1
         AND c.IsActive = 1
        WHERE u.UserId = @UserId
          AND u.IsActive = 1
          AND u.PostId IN (51, 52)
          AND EXISTS
          (
            SELECT 1
            FROM TahghighatV2.PostActionPermission permission
            WHERE permission.PostId = u.PostId
              AND permission.ActionCode = 'ASSIGN_INVESTIGATOR'
              AND permission.IsAllowed = 1
          );
      `);

    const scope = scopeResult.recordset?.[0];
    if (!scope) {
      throw new ApiError(
        403,
        "PROVINCE_SCOPE_DENIED",
        "دسترسی مشاهده محققان ویژه برای این پرونده و استان وجود ندارد."
      );
    }

    // Same source as the legacy application. It filters by active Hamkari,
    // province hierarchy, collaboration type and special-investigator mode.
    const legacyResult = await pool.request()
      .input("CodeEntekhabat", sql.Int, Number(scope.CodeEntekhabat))
      .input("Mahal", sql.Int, Number(scope.ProvinceCityId))
      .input("NoeHamkari", sql.Int, 2)
      .input("Vije", sql.Int, 1)
      .execute("Tahghighat.SP_Get_MohagheghInEntekhabat");

    // PersonId is canonical. A collaborator may have duplicate Hamkari rows,
    // or more than one legacy code; that must not duplicate the dropdown item.
    const byPerson = new Map<string, LegacyCandidate>();
    for (const raw of legacyResult.recordset || []) {
      const row = raw as Record<string, unknown>;
      const personId = String(row.PersonId ?? "").trim();
      const code = String(row.ShomarehParvandeh ?? "").trim();
      const procedureName = String(row.FullName ?? "").trim();
      const fullName = procedureName ||
        [row.FirstName, row.LastName].filter(Boolean).join(" ").trim();

      if (!/^\d+$/.test(personId) || !fullName) continue;
      const legacyCode = /^\d+$/.test(code) ? code : null;
      const existing = byPerson.get(personId);
      if (!existing) {
        byPerson.set(personId, { personId, legacyCode, fullName });
        continue;
      }

      // Preserve a legacy code only when it is unambiguous for this PersonId.
      if (existing.legacyCode && legacyCode && existing.legacyCode !== legacyCode) {
        existing.legacyCode = null;
      } else if (!existing.legacyCode && legacyCode) {
        existing.legacyCode = legacyCode;
      }
      if (fullName.length > existing.fullName.length) existing.fullName = fullName;
    }

    const candidates = Array.from(byPerson.values());
    if (candidates.length === 0) return respond([]);

    // Create/refresh province-scoped registry entries by PersonId. No lookup
    // against dbo.Users and no account creation or AuthUserId mapping occurs.
    const mappingResult = await pool.request()
      .input("ProvinceCityId", sql.Int, Number(scope.ProvinceCityId))
      .input("CandidatesJson", sql.NVarChar(sql.MAX), JSON.stringify(candidates))
      .query(`
        SET NOCOUNT ON;
        SET XACT_ABORT ON;

        DECLARE @Candidates TABLE
        (
          PersonId bigint NOT NULL PRIMARY KEY,
          LegacyCodeMohaghegh bigint NULL,
          FullName nvarchar(500) NOT NULL
        );

        INSERT INTO @Candidates(PersonId, LegacyCodeMohaghegh, FullName)
        SELECT PersonId,
               CASE WHEN COUNT(DISTINCT LegacyCodeMohaghegh) = 1
                    THEN MAX(LegacyCodeMohaghegh) ELSE NULL END,
               MAX(FullName)
        FROM OPENJSON(@CandidatesJson)
        WITH
        (
          PersonId bigint '$.personId',
          LegacyCodeMohaghegh bigint '$.legacyCode',
          FullName nvarchar(500) '$.fullName'
        )
        WHERE PersonId IS NOT NULL
          AND NULLIF(LTRIM(RTRIM(FullName)), N'') IS NOT NULL
        GROUP BY PersonId;

        BEGIN TRY
          BEGIN TRANSACTION;
          DECLARE @LockResult int;
          DECLARE @LockResource nvarchar(255) =
            N'MRV2:INVREG:' + CONVERT(nvarchar(20), @ProvinceCityId);
          EXEC @LockResult = sys.sp_getapplock
            @Resource = @LockResource,
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 10000;
          IF @LockResult < 0
            THROW 55321, N'قفل فهرست محققان استان دریافت نشد؛ دوباره تلاش کنید.', 1;

          -- Backfill an old registry row by its legacy collaborator code when
          -- PersonId was not available at the time it was first registered.
          ;WITH LegacyMatches AS
          (
            SELECT r.InvestigatorKey, c.PersonId,
                   COUNT_BIG(*) OVER (PARTITION BY r.InvestigatorKey) AS MatchCount
            FROM TahghighatV2.InvestigatorRegistry r WITH (UPDLOCK, HOLDLOCK)
            JOIN @Candidates c
              ON c.LegacyCodeMohaghegh = r.LegacyCodeMohaghegh
            WHERE r.ProvinceCityId = @ProvinceCityId
              AND r.PersonId IS NULL
              AND c.LegacyCodeMohaghegh IS NOT NULL
          )
          UPDATE r SET PersonId = m.PersonId
          FROM TahghighatV2.InvestigatorRegistry r
          JOIN LegacyMatches m ON m.InvestigatorKey = r.InvestigatorKey
          WHERE m.MatchCount = 1;

          -- Keep an existing manual deactivation intact. Active rows receive
          -- the current legacy code only if their stored code is still empty.
          UPDATE r
             SET r.LegacyCodeMohaghegh = COALESCE(r.LegacyCodeMohaghegh, c.LegacyCodeMohaghegh)
          FROM TahghighatV2.InvestigatorRegistry r WITH (UPDLOCK, HOLDLOCK)
          JOIN @Candidates c ON c.PersonId = r.PersonId
          WHERE r.ProvinceCityId = @ProvinceCityId
            AND r.IsActive = 1
            AND r.LegacyCodeMohaghegh IS NULL
            AND c.LegacyCodeMohaghegh IS NOT NULL;

          -- One registry identity per person/province is created when absent.
          -- AuthUserId remains NULL: these collaborators do not sign in to V2.
          INSERT INTO TahghighatV2.InvestigatorRegistry
            (AuthUserId, PersonId, LegacyCodeMohaghegh, ProvinceCityId, IsActive,
             RegisteredBySqlLogin, RegisteredAtUtc)
          SELECT NULL, c.PersonId, c.LegacyCodeMohaghegh, @ProvinceCityId, 1,
                 COALESCE(ORIGINAL_LOGIN(), SUSER_SNAME()), SYSUTCDATETIME()
          FROM @Candidates c
          WHERE NOT EXISTS
          (
            SELECT 1
            FROM TahghighatV2.InvestigatorRegistry existing WITH (UPDLOCK, HOLDLOCK)
            WHERE existing.PersonId = c.PersonId
              AND existing.ProvinceCityId = @ProvinceCityId
          );

          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
          THROW;
        END CATCH;

        SELECT
          picked.InvestigatorKey,
          c.PersonId,
          c.FullName,
          CONVERT(bit, CASE WHEN picked.IsActive = 1 THEN 1 ELSE 0 END) AS IsAssignable,
          CASE
            WHEN picked.InvestigatorKey IS NULL THEN N'شناسه محقق در فهرست استان ثبت نشد.'
            WHEN picked.IsActive = 0 THEN N'این محقق در فهرست استان غیرفعال شده است.'
            ELSE N''
          END AS MappingMessage
        FROM @Candidates c
        OUTER APPLY
        (
          SELECT TOP (1) r.InvestigatorKey, r.IsActive
          FROM TahghighatV2.InvestigatorRegistry r
          WHERE r.PersonId = c.PersonId
            AND r.ProvinceCityId = @ProvinceCityId
          ORDER BY CASE WHEN r.IsActive = 1 THEN 0 ELSE 1 END,
                   r.InvestigatorKey
        ) picked
        ORDER BY c.FullName, c.PersonId;
      `);

    return respond((mappingResult.recordset || []) as Record<string, unknown>[]);
  } catch (error) {
    return fail(error);
  }
}

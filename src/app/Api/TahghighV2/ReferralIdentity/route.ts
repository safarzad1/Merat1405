import { NextRequest } from "next/server";
import { authenticatedUserId, fail, respond, requiredInt } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Displays applicant information ONLY to the active province officer assigned
// to this referral. UserId and province are never accepted from the browser.
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const referralId = requiredInt(request.nextUrl.searchParams.get("referralId"), "شناسه ارجاع");
    const pool = await getMeratPool();
    const result = await pool.request()
      .input("UserId", sql.BigInt, userId)
      .input("ReferralId", sql.BigInt, referralId)
      .query(`
        SELECT TOP (1)
          P.CodeMelli, P.FirstName, P.LastName, P.NamePedar,
          P.NameMostar, LEFT(LTRIM(RTRIM(P.TarikhTavalod)), 4) AS SalTavalod,
          Province.Name AS NameOstan, Sender.Name AS NameSender, H.NameHozeh
        FROM TahghighatV2.Referral R
        JOIN TahghighatV2.CaseFile CF ON CF.CaseId = R.CaseId
        JOIN dbo.Users U ON U.UserId = @UserId AND U.IsActive = 1
          AND U.PostId IN (51,52) AND U.Mahal = R.ToMahal
        JOIN dbo.Citys ScopeCity ON ScopeCity.CityId = U.Mahal
          AND ScopeCity.PCityId = 1 AND ScopeCity.IsActive = 1
        LEFT JOIN dbo.Citys Province ON Province.CityId = R.ToMahal
        LEFT JOIN dbo.Citys Sender ON Sender.CityId = R.FromMahal
        OUTER APPLY (
          SELECT TOP (1) CodeMelli, FirstName, LastName, NamePedar, NameMostar, TarikhTavalod
          FROM Davtalab.Ashkhas A
          WHERE A.ShomarehParvandeh = CF.ShomarehParvandeh
            AND ISNULL(A.IsDelete,0) = 0
        ) P
        OUTER APPLY (
          SELECT TOP (1) NameHozeh
          FROM dbo.Vbl_AshkhasEntekhabat V
          WHERE V.ShomarehParvandeh = CF.ShomarehParvandeh
            AND V.CodeEntekhabat = CF.CodeEntekhabat
            AND V.CodeHozeh = CF.CodeHozeh
        ) H
        WHERE R.ReferralId = @ReferralId
          AND R.ReceiverLevel = 'OSTAN' AND R.IsDeleted = 0;
      `);
    return respond((result.recordset || []) as Record<string, unknown>[]);
  } catch (error) { return fail(error); }
}

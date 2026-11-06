import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;

    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }

    const body = await req.json();
    const {
        codeentekhabat,
        mahalreciver,
        erjastate, // (فعلاً استفاده نشده)
        page,
        sizepage,
        indexsort,
        ascdesc,
        search,
        idValue, userId
    } = body;

    if (!page) {
        return NextResponse.json({ status: 400, error: "page required" }, { status: 400 });
    }

    let actor: Awaited<ReturnType<typeof requireResearchIdentity>>;
    try {
        actor = await requireResearchIdentity(token, userId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        // Keep the existing legacy UI and API contract. Switch only the data
        // source for provincial staff, whose referrals now live exclusively in V2.
        const profile = await pool.request()
            .input("UserId", sql.BigInt, actor.userId)
            .query(`SELECT U.PostId, U.Mahal
                    FROM dbo.Users U
                    WHERE U.UserId=@UserId AND U.IsActive=1`);
        const currentUser = profile.recordset?.[0];
        if (!currentUser) return NextResponse.json({ status: 403, error: "کاربر فعال یافت نشد." }, { status: 403 });

        // Province and hozeh/counties now use TahghighatV2 for dashboard statistics.
        // A legacy Tahghighat.Erja query cannot display those V2 rows, and caused
        // the reported discrepancy (counter=1, table=empty) for Bandar Abbas.
        if ([60, 61, 70].includes(Number(currentUser.PostId))) {
            const pageNumber = Number(page);
            const pageSize = Number(sizepage);
            const item = Number(idValue);
            const sort = Number(indexsort ?? 1);
            const direction = Number(ascdesc ?? 1);
            const needle = typeof search === "string" ? search.trim() : "";
            if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 ||
                !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
                ![1, 2, 3, 4].includes(item) ||
                ![1, 2, 3, 4, 5].includes(sort) || ![1, 2].includes(direction) || needle.length > 200) {
                return NextResponse.json({ status: 400, error: "صفحه‌بندی یا فیلتر نامعتبر است." }, { status: 400 });
            }
            // These predicates intentionally match SP_GetResearchDashboardStatistics,
            // including the CountyRepresentative authorization check for PostId=70.
            // Scope comes exclusively from the authenticated user, never caller-supplied mahal.
            const v2 = await pool.request()
                .input("UserId", sql.BigInt, actor.userId)
                .input("Page", sql.Int, pageNumber)
                .input("SizePage", sql.Int, pageSize)
                .input("ItemValue", sql.Int, item)
                .input("SortIndex", sql.Int, sort)
                .input("SECDEC", sql.Int, direction)
                .input("Search", sql.NVarChar(200), needle)
                .query(`
                    ;WITH Visible AS (
                        SELECT R.ReferralId AS ErjaId,
                               R.ParentReferralId AS ErjaParentId,
                               R.FromMahal AS MahalSender, R.ToMahal AS MahalReciver,
                               R.ReceiverLevel, R.StateCode, R.IsClosed,
                               R.Description, CF.ShomarehParvandeh,
                               CF.CodeEntekhabat, CF.CodeHozeh, CF.OstanCityId,
                               P.CodeMelli, P.FirstName, P.LastName, P.NamePedar,
                               LEFT(NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(20),P.TarikhTavalod))),N''),4) AS SalTavalod,
                               Prov.Name AS NameOstan,
                               COALESCE(HZ.NameHozeh, HozeCity.Name, N'—') AS NameHozeh,
                               CAST(CASE WHEN R.StateCode='CHILD_WORKING' THEN 2
                                         WHEN R.StateCode='CHILD_REPLIED' THEN 3 ELSE 1 END AS int) AS ErjaLastState,
                               (SELECT COUNT_BIG(*) FROM TahghighatV2.Referral Child
                                WHERE Child.ParentReferralId=R.ReferralId AND Child.IsDeleted=0) AS CountErja,
                               (SELECT COUNT_BIG(*) FROM TahghighatV2.ResearchAssignment A
                                WHERE A.ReferralId=R.ReferralId AND A.StatusCode<>'CANCELLED') AS CountErjaMohaghegh,
                               (SELECT COUNT_BIG(*) FROM TahghighatV2.ResearchWorksheet W
                                JOIN TahghighatV2.ResearchAssignment A ON A.AssignmentId=W.AssignmentId
                                WHERE A.ReferralId=R.ReferralId) AS CountTahghigh_Karbarg,
                               CONVERT(nvarchar(400),N'') AS NameMahalReciver
                        FROM TahghighatV2.Referral R
                        JOIN TahghighatV2.CaseFile CF ON CF.CaseId=R.CaseId
                        JOIN TahghighatV2.WorkflowState WS ON WS.StateCode=R.StateCode
                        JOIN dbo.Users U ON U.UserId=@UserId AND U.IsActive=1
                        JOIN dbo.Citys City ON City.CityId=U.Mahal AND City.IsActive=1
                        LEFT JOIN dbo.Citys Prov ON Prov.CityId=CF.OstanCityId
                        LEFT JOIN dbo.Citys HozeCity ON HozeCity.CityId=CF.CodeHozeh
                        OUTER APPLY (
                            SELECT TOP(1) H.NameHozeh FROM Entekhabat.Hozeh H
                            WHERE H.CodeHozeh=CF.CodeHozeh AND H.Ostan=CF.OstanCityId
                            ORDER BY H.ID DESC
                        ) HZ
                        LEFT JOIN Davtalab.Ashkhas P ON P.ShomarehParvandeh=CF.ShomarehParvandeh
                                                    AND ISNULL(P.IsDelete,0)=0
                        WHERE R.IsDeleted=0 AND (
                            (U.PostId IN (60,61) AND R.ReceiverLevel='HOZE'
                             AND R.ToMahal=U.Mahal AND City.IsHoze=1)
                            OR
                            (U.PostId=70 AND R.ReceiverLevel='SHAHR'
                             AND R.ToMahal=U.Mahal AND City.IsHoze=0 AND EXISTS (
                                SELECT 1 FROM TahghighatV2.CountyRepresentative CR
                                JOIN TahghighatV2.Referral H ON H.ReferralId=R.ParentReferralId
                                WHERE CR.AuthUserId=U.UserId AND CR.CountyCityId=U.Mahal
                                  AND CR.HozeCityId=H.ToMahal AND CR.IsActive=1
                                  AND H.ReceiverLevel='HOZE' AND H.IsDeleted=0
                             ))
                        )
                    ), Filtered AS (
                        SELECT V.* FROM Visible V
                        WHERE (@ItemValue=1
                           OR (@ItemValue=2 AND V.StateCode='CHILD_INBOX' AND V.IsClosed=0)
                           OR (@ItemValue=3 AND V.StateCode='CHILD_REPLIED' AND V.IsClosed=1)
                           OR (@ItemValue=4 AND EXISTS (
                              SELECT 1 FROM TahghighatV2.ResearchAssignment A
                              JOIN TahghighatV2.Referral Target ON Target.ReferralId=A.ReferralId
                              WHERE Target.IsDeleted=0 AND A.StatusCode IN ('PENDING','IN_PROGRESS')
                                AND ((V.ReceiverLevel='SHAHR' AND A.ReferralId=V.ErjaId)
                                  OR (V.ReceiverLevel='HOZE' AND Target.ParentReferralId=V.ErjaId
                                      AND Target.ReceiverLevel='SHAHR'))
                           )))
                          AND (@Search=N'' OR
                               CONVERT(nvarchar(30),V.ShomarehParvandeh) LIKE N'%'+@Search+N'%' OR
                               V.CodeMelli LIKE N'%'+@Search+N'%' OR
                               V.FirstName LIKE N'%'+@Search+N'%' OR
                               V.LastName LIKE N'%'+@Search+N'%')
                    ), Paginated AS (
                        SELECT V.*,
                            ROW_NUMBER() OVER(ORDER BY
                                CASE WHEN @SortIndex=1 AND @SECDEC=1 THEN V.ShomarehParvandeh END ASC,
                                CASE WHEN @SortIndex=1 AND @SECDEC=2 THEN V.ShomarehParvandeh END DESC,
                                CASE WHEN @SortIndex=2 AND @SECDEC=1 THEN V.FirstName END ASC,
                                CASE WHEN @SortIndex=2 AND @SECDEC=2 THEN V.FirstName END DESC,
                                CASE WHEN @SortIndex=3 AND @SECDEC=1 THEN V.LastName END ASC,
                                CASE WHEN @SortIndex=3 AND @SECDEC=2 THEN V.LastName END DESC,
                                CASE WHEN @SortIndex=4 AND @SECDEC=1 THEN V.NameHozeh END ASC,
                                CASE WHEN @SortIndex=4 AND @SECDEC=2 THEN V.NameHozeh END DESC,
                                CASE WHEN @SortIndex=5 AND @SECDEC=1 THEN V.NameOstan END ASC,
                                CASE WHEN @SortIndex=5 AND @SECDEC=2 THEN V.NameOstan END DESC,
                                V.ErjaId DESC) AS Rdf,
                            COUNT_BIG(*) OVER() AS TotalCount
                        FROM Filtered V
                    )
                    SELECT * FROM Paginated
                    WHERE Rdf > (CONVERT(bigint,@Page)-1)*@SizePage
                      AND Rdf <= CONVERT(bigint,@Page)*@SizePage
                    ORDER BY Rdf;
                `);
            return NextResponse.json({ status: 200, data: v2.recordset }, { status: 200 });
        }

        if ([51, 52, 53].includes(Number(currentUser.PostId))) {
            const pageNumber = Number(page);
            const pageSize = Number(sizepage);
            const item = Number(idValue);
            const sort = Number(indexsort ?? 1);
            const direction = Number(ascdesc ?? 1);
            const needle = typeof search === "string" ? search.trim() : "";
            if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 ||
                !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
                ![1,2,3,4,5,6,7,8,9,10,11,12,13,15].includes(item) ||
                ![1,2,3,4,5].includes(sort) || ![1,2].includes(direction) || needle.length > 200) {
                return NextResponse.json({ status: 400, error: "صفحه‌بندی یا فیلتر نامعتبر است." }, { status: 400 });
            }
            // Scope exactly matches SP_GetProvinceInbox: same CaseFile and
            // WorkflowState joins, province receiver and not-deleted records.
            // Never trust mahalreciver/userId from the caller to grant scope.
            const v2 = await pool.request()
                .input("UserId", sql.BigInt, actor.userId)
                .input("Page", sql.Int, pageNumber)
                .input("SizePage", sql.Int, pageSize)
                .input("ItemValue", sql.Int, item)
                .input("SortIndex", sql.Int, sort)
                .input("SECDEC", sql.Int, direction)
                .input("Search", sql.NVarChar(200), needle)
                .query(`
                    ;WITH Base AS (
                       SELECT R.ReferralId AS ErjaId, R.ParentReferralId AS ErjaParentId,
                              R.StateCode, R.IsClosed, R.Description,
                              CAST(CASE WHEN EXISTS (
                                  SELECT 1 FROM TahghighatV2.Referral ChildReply
                                  WHERE ChildReply.ParentReferralId=R.ReferralId
                                    AND ChildReply.CaseId=R.CaseId AND ChildReply.IsDeleted=0
                                    AND ChildReply.ReceiverLevel IN('HOZE','OSTAN')
                                    AND ChildReply.StateCode='CHILD_REPLIED' AND ChildReply.IsClosed=1
                              ) THEN 1 ELSE 0 END AS bit) AS HasReceivedChildReply,
                              CF.ShomarehParvandeh, CF.CodeEntekhabat, CF.CodeHozeh,
                              Person.CodeMelli, Person.FirstName, Person.LastName, Person.NamePedar,
                              Person.SalTavalod,
                              Province.Name AS NameOstan,
                              COALESCE(Hoze.NameHozeh,CONVERT(nvarchar(30),CF.CodeHozeh)) AS NameHozeh,
                              CAST(CASE WHEN R.StateCode='CHILD_WORKING' THEN 2
                                        WHEN R.StateCode='PROVINCE_RETURNED' THEN 3 ELSE 1 END AS int) AS ErjaLastState,
                              (SELECT COUNT_BIG(*) FROM TahghighatV2.Referral C
                                  WHERE C.ParentReferralId=R.ReferralId AND C.IsDeleted=0) AS CountErja,
                              (SELECT COUNT_BIG(*) FROM TahghighatV2.ResearchAssignment A
                                  WHERE A.ReferralId=R.ReferralId AND A.StatusCode<>'CANCELLED') AS CountErjaMohaghegh,
                              (SELECT COUNT_BIG(*) FROM TahghighatV2.ResearchWorksheet W
                                  JOIN TahghighatV2.ResearchAssignment A ON A.AssignmentId=W.AssignmentId
                                  WHERE A.ReferralId=R.ReferralId) AS CountTahghigh_Karbarg,
                              CONVERT(nvarchar(400),N'') AS NameMahalReciver
                       FROM TahghighatV2.Referral R
                       JOIN TahghighatV2.CaseFile CF ON CF.CaseId=R.CaseId
                       JOIN TahghighatV2.WorkflowState WS ON WS.StateCode=R.StateCode
                       JOIN dbo.Users U ON U.UserId=@UserId AND U.IsActive=1
                           AND U.PostId IN(51,52,53) AND U.Mahal=R.ToMahal
                       JOIN dbo.Citys Prov ON Prov.CityId=U.Mahal AND Prov.PCityId=1 AND Prov.IsActive=1
                       LEFT JOIN dbo.Citys Province ON Province.CityId=R.ToMahal
                       OUTER APPLY (SELECT TOP (1) P.CodeMelli,P.FirstName,P.LastName,P.NamePedar,
                                              LEFT(NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(20),P.TarikhTavalod))),N''),4) AS SalTavalod
                                    FROM Davtalab.Ashkhas P
                                    WHERE P.ShomarehParvandeh=CF.ShomarehParvandeh
                                    AND ISNULL(P.IsDelete,0)=0) Person
                       OUTER APPLY (SELECT TOP (1) V.NameHozeh
                                    FROM dbo.Vbl_AshkhasEntekhabat V
                                    WHERE V.ShomarehParvandeh=CF.ShomarehParvandeh
                                      AND V.CodeEntekhabat=CF.CodeEntekhabat
                                      AND V.CodeHozeh=CF.CodeHozeh) Hoze
                       OUTER APPLY (SELECT TOP (1) E.ActionCode, ACT.PostId
                                    FROM TahghighatV2.WorkflowEvent E
                                    LEFT JOIN dbo.Users ACT ON ACT.UserId=E.ActorUserId
                                    WHERE E.ReferralId=R.ReferralId ORDER BY E.EventId DESC) LastAction
                       WHERE R.ToMahal=U.Mahal AND R.ReceiverLevel='OSTAN' AND R.IsDeleted=0
                         AND (@Search=N'' OR
                              CONVERT(nvarchar(30),CF.ShomarehParvandeh) LIKE N'%'+@Search+N'%' OR
                              Person.CodeMelli LIKE N'%'+@Search+N'%' OR
                              Person.FirstName LIKE N'%'+@Search+N'%' OR
                              Person.LastName LIKE N'%'+@Search+N'%')
                         AND (
                             @ItemValue=1
                             OR (@ItemValue=2 AND R.IsClosed=0 AND (
                                   R.StateCode IN('PROVINCE_INBOX','CHILD_INBOX')
                                   OR (R.StateCode IN('PROVINCE_WORKING','PENDING_CHILD_RESULTS','PROVINCE_RETURNED')
                                       AND EXISTS (
                                          SELECT 1 FROM TahghighatV2.Referral ChildReply
                                          WHERE ChildReply.ParentReferralId=R.ReferralId
                                            AND ChildReply.CaseId=R.CaseId AND ChildReply.IsDeleted=0
                                            AND ChildReply.ReceiverLevel IN('HOZE','OSTAN')
                                            AND ChildReply.StateCode='CHILD_REPLIED' AND ChildReply.IsClosed=1
                                       ))
                               ))
                             OR (@ItemValue=3 AND R.StateCode='DIRECTOR_REVIEW' AND R.IsClosed=0)
                             OR (@ItemValue=4 AND R.StateCode='PROVINCE_RETURNED' AND R.IsClosed=0
                                 AND LastAction.ActionCode='RETURN_PROVINCE' AND LastAction.PostId=50)
                             OR (@ItemValue=5 AND EXISTS (SELECT 1 FROM TahghighatV2.ResearchAssignment A
                                 WHERE A.ReferralId=R.ReferralId AND A.StatusCode<>'CANCELLED'))
                             OR (@ItemValue=7 AND R.StateCode='SETAD_REVIEW' AND R.IsClosed=0)
                             OR (@ItemValue=8 AND R.StateCode='PROVINCE_RETURNED' AND R.IsClosed=0
                                 AND LastAction.ActionCode='RETURN_PROVINCE' AND LastAction.PostId=5)
                             OR (@ItemValue=9 AND EXISTS(SELECT 1 FROM TahghighatV2.Referral C
                                 WHERE C.ParentReferralId=R.ReferralId AND C.ReceiverLevel='HOZE' AND C.IsDeleted=0))
                             OR (@ItemValue=10 AND EXISTS(SELECT 1 FROM TahghighatV2.Referral C
                                 WHERE C.ParentReferralId=R.ReferralId AND C.ReceiverLevel='OSTAN'
                                   AND C.ToMahal<>R.ToMahal AND C.IsDeleted=0))
                             OR (@ItemValue=11 AND EXISTS(SELECT 1 FROM TahghighatV2.Referral C
                                 WHERE C.ParentReferralId=R.ReferralId AND C.ReceiverLevel='OSTAN'
                                   AND C.ToMahal<>R.ToMahal AND C.IsDeleted=0 AND C.IsClosed=1))
                             OR (@ItemValue=12 AND EXISTS(SELECT 1 FROM TahghighatV2.Referral C
                                 WHERE C.ParentReferralId=R.ReferralId AND C.ReceiverLevel='HOZE'
                                   AND C.IsDeleted=0 AND C.IsClosed=1))
                             OR (@ItemValue=15 AND EXISTS(SELECT 1 FROM TahghighatV2.NoResearchDecision N
                                 WHERE N.ReferralId=R.ReferralId))
                         )
                    ), Paginated AS (
                        SELECT B.*,
                          ROW_NUMBER() OVER(ORDER BY
                            CASE WHEN @SortIndex=1 AND @SECDEC=1 THEN B.ShomarehParvandeh END ASC,
                            CASE WHEN @SortIndex=1 AND @SECDEC=2 THEN B.ShomarehParvandeh END DESC,
                            CASE WHEN @SortIndex=2 AND @SECDEC=1 THEN B.FirstName END ASC,
                            CASE WHEN @SortIndex=2 AND @SECDEC=2 THEN B.FirstName END DESC,
                            CASE WHEN @SortIndex=3 AND @SECDEC=1 THEN B.LastName END ASC,
                            CASE WHEN @SortIndex=3 AND @SECDEC=2 THEN B.LastName END DESC,
                            CASE WHEN @SortIndex=4 AND @SECDEC=1 THEN B.NameHozeh END ASC,
                            CASE WHEN @SortIndex=4 AND @SECDEC=2 THEN B.NameHozeh END DESC,
                            CASE WHEN @SortIndex=5 AND @SECDEC=1 THEN B.NameOstan END ASC,
                            CASE WHEN @SortIndex=5 AND @SECDEC=2 THEN B.NameOstan END DESC,
                            B.ErjaId DESC) AS Rdf,
                          COUNT_BIG(*) OVER() AS TotalCount
                        FROM Base B
                    )
                    SELECT * FROM Paginated
                    WHERE Rdf > (CONVERT(bigint,@Page)-1)*@SizePage
                      AND Rdf <= CONVERT(bigint,@Page)*@SizePage
                    ORDER BY Rdf;
                `);
            return NextResponse.json({ status: 200, data: v2.recordset }, { status: 200 });
        }

        const result = await pool
            .request()
            .input("CodeEntekhabat", sql.Int, codeentekhabat)
            .input("MahalReciver", sql.Int, mahalreciver)
            // .input("ErjaLastState", sql.Int, erjastate)
            .input("Page", sql.Int, page)
            .input("SizePage", sql.Int, sizepage)
            .input("Search", sql.NVarChar(200), search ?? "")
            .input("SortIndex", sql.Int, indexsort ?? 1)
            .input("SECDEC", sql.Int, ascdesc ?? 1)
            .input("ItemValue", sql.Int, idValue ?? 0)
            .input("UserId", sql.BigInt, userId ?? 0)
            .execute("Tahghighat.SP_Get_Erja_MahalReciver_ErjaLastState");

        return NextResponse.json({ status: 200, data: result.recordset }, { status: 200 });
    } catch (err) {
        return researchAccessResponse(err);
    }
}

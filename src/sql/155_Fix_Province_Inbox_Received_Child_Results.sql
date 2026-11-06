USE [MeratDB];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
-- Phase 155. Count returned HOZE/other-province reports as actionable provincial inbox items.
-- Do NOT change Referral.StateCode: permission and workflow transitions rely on the original state.
-- Same criteria are implemented by the GetTahghighat API for province inbox display.
CREATE OR ALTER PROCEDURE [TahghighatV2].[SP_GetResearchDashboardStatistics]
    @UserId BIGINT,
    @OnlyTotal BIT = 0,
    @TotalCases BIGINT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Mahal INT, @PostId INT, @PID INT;
    SELECT @Mahal = U.Mahal, @PostId = U.PostId
    FROM dbo.Users AS U
    WHERE U.UserId = @UserId AND U.IsActive = 1;

    IF @PostId IS NULL OR @Mahal IS NULL
        BEGIN
            THROW 55802, N'کاربر فعال شناسایی نشد.', 1;
        END;

    SET @PID = CASE
        WHEN @PostId IN (1,2,3,4,5) THEN 300
        WHEN @PostId IN (51,52,53) THEN 301
        WHEN @PostId = 50 THEN 302
        WHEN @PostId = 54 THEN 303
        WHEN @PostId IN (60,61,70) THEN 304
        ELSE NULL END;
    IF @PID IS NULL
        BEGIN
            THROW 55803, N'برای سمت انتخابی گروه آمار تحقیقات تعریف نشده است.', 1;
        END;

    IF @PID = 300 AND @Mahal <> 1
        BEGIN
            THROW 55804, N'کاربر آمار ستاد باید محل خدمت ستاد داشته باشد.', 1;
        END;
    IF @PID IN (301,302,303) AND NOT EXISTS
       (SELECT 1 FROM dbo.Citys WHERE CityId=@Mahal AND PCityId=1 AND IsActive=1)
        BEGIN
            THROW 55805, N'محل خدمت استان معتبر نیست.', 1;
        END;
    IF @PostId IN (60,61) AND NOT EXISTS
       (SELECT 1 FROM dbo.Citys WHERE CityId=@Mahal AND IsHoze=1 AND IsActive=1)
        BEGIN
            THROW 55806, N'حوزه انتخابیه کاربر معتبر نیست.', 1;
        END;
    IF @PostId=70 AND NOT EXISTS
       (SELECT 1 FROM dbo.Citys WHERE CityId=@Mahal AND IsHoze=0 AND IsActive=1)
        BEGIN
            THROW 55807, N'شهرستان کاربر معتبر نیست.', 1;
        END;

    -- Match the V2 inbox's per-role permission checks; a user without V2
    -- inbox access must not see its scoped counts through this endpoint.
    IF @PostId IN (51,52) AND NOT EXISTS
       (SELECT 1 FROM TahghighatV2.PostActionPermission P WHERE P.PostId=@PostId
        AND P.IsAllowed=1 AND P.ActionCode IN ('START_PROVINCE','NO_RESEARCH','SUBMIT_DIRECTOR'))
        BEGIN
            THROW 55809, N'مجوز مشاهده آمار استان موجود نیست.', 1;
        END;
    IF @PostId=50 AND NOT EXISTS
       (SELECT 1 FROM TahghighatV2.PostActionPermission P WHERE P.PostId=50
        AND P.IsAllowed=1 AND P.ActionCode='DIRECTOR_APPROVE')
        BEGIN
            THROW 55810, N'مجوز مشاهده آمار رئیس دفتر موجود نیست.', 1;
        END;
    IF @PostId=5 AND NOT EXISTS
       (SELECT 1 FROM TahghighatV2.PostActionPermission P WHERE P.PostId=5
        AND P.IsAllowed=1 AND P.ActionCode='SETAD_APPROVE')
        BEGIN
            THROW 55811, N'مجوز مشاهده آمار ستاد موجود نیست.', 1;
        END;
    IF @PostId=61 AND NOT EXISTS
       (SELECT 1 FROM TahghighatV2.PostActionPermission P WHERE P.PostId=61
        AND P.IsAllowed=1 AND P.ActionCode='CHILD_REPLY')
        BEGIN
            THROW 55812, N'مجوز مشاهده آمار حوزه موجود نیست.', 1;
        END;

    -- Only current, non-deleted V2 referrals. For province counters this
    -- deliberately mirrors SP_GetProvinceInbox's joins and scope.
    CREATE TABLE #Visible
    (
        ReferralId BIGINT NOT NULL PRIMARY KEY,
        CaseId BIGINT NOT NULL,
        ParentReferralId BIGINT NULL,
        CodeEntekhabat INT NOT NULL,
        ShomarehParvandeh BIGINT NOT NULL,
        ReceiverLevel VARCHAR(20) NOT NULL,
        StateCode VARCHAR(40) NOT NULL,
        IsClosed BIT NOT NULL,
        ToMahal INT NOT NULL
    );
    INSERT #Visible (ReferralId,CaseId,ParentReferralId,CodeEntekhabat,
                     ShomarehParvandeh,ReceiverLevel,StateCode,IsClosed,ToMahal)
    SELECT R.ReferralId,R.CaseId,R.ParentReferralId,CF.CodeEntekhabat,
           CF.ShomarehParvandeh,R.ReceiverLevel,R.StateCode,R.IsClosed,R.ToMahal
    FROM TahghighatV2.Referral AS R
    JOIN TahghighatV2.CaseFile AS CF ON CF.CaseId=R.CaseId
    JOIN TahghighatV2.WorkflowState AS WS ON WS.StateCode=R.StateCode
    WHERE R.IsDeleted=0 AND
      (
        (@PID=300 AND R.ParentReferralId IS NULL AND R.ReceiverLevel='OSTAN' AND R.FromMahal=1)
        OR (@PID IN (301,302) AND R.ToMahal=@Mahal AND R.ReceiverLevel='OSTAN')
        OR (@PostId IN (60,61) AND R.ToMahal=@Mahal AND R.ReceiverLevel='HOZE')
        OR (@PostId=70 AND R.ToMahal=@Mahal AND R.ReceiverLevel='SHAHR'
            AND EXISTS (SELECT 1 FROM TahghighatV2.CountyRepresentative CR
                        JOIN TahghighatV2.Referral H ON H.ReferralId=R.ParentReferralId
                        WHERE CR.AuthUserId=@UserId AND CR.CountyCityId=@Mahal
                          AND CR.HozeCityId=H.ToMahal AND CR.IsActive=1
                          AND H.ReceiverLevel='HOZE' AND H.IsDeleted=0))
        -- Council has no V2 referral/action implementation yet.
      );

    SELECT @TotalCases=COUNT_BIG(*) FROM #Visible;
    IF @OnlyTotal=1 RETURN;

    CREATE TABLE #Children
    (
        ReferralId BIGINT NOT NULL PRIMARY KEY,
        ParentReferralId BIGINT NOT NULL,
        ReceiverLevel VARCHAR(20) NOT NULL,
        ToMahal INT NOT NULL,
        StateCode VARCHAR(40) NOT NULL,
        IsClosed BIT NOT NULL
    );
    INSERT #Children (ReferralId,ParentReferralId,ReceiverLevel,ToMahal,StateCode,IsClosed)
    SELECT C.ReferralId,C.ParentReferralId,C.ReceiverLevel,C.ToMahal,C.StateCode,C.IsClosed
    FROM TahghighatV2.Referral AS C
    JOIN #Visible AS V ON V.ReferralId=C.ParentReferralId
    WHERE C.IsDeleted=0;

    CREATE TABLE #LastAction
    (
        ReferralId BIGINT NOT NULL PRIMARY KEY,
        ActionCode VARCHAR(40) NULL,
        ActorPostId INT NULL
    );
    INSERT #LastAction(ReferralId,ActionCode,ActorPostId)
    SELECT V.ReferralId, EV.ActionCode, U.PostId
    FROM #Visible V
    OUTER APPLY
       (SELECT TOP (1) E.ActionCode,E.ActorUserId
        FROM TahghighatV2.WorkflowEvent E
        WHERE E.ReferralId=V.ReferralId ORDER BY E.EventId DESC) EV
    LEFT JOIN dbo.Users U ON U.UserId=EV.ActorUserId;

    SELECT D.NameFarsi, D.Value,
       CONVERT(BIGINT, CASE
       -- Headquarters (300)
       WHEN @PID=300 AND D.Value=1 THEN (SELECT COUNT_BIG(*) FROM #Visible)
       WHEN @PID=300 AND D.Value IN (2,3) THEN
          (SELECT COUNT_BIG(*) FROM #Visible V
           WHERE V.StateCode='SETAD_REVIEW' AND V.IsClosed=0
             AND EXISTS (SELECT 1 FROM Davtalab.AshkhasEntekhabat A
                         WHERE A.ShomarehParvandeh=V.ShomarehParvandeh
                           AND A.CodeEntekhabat=V.CodeEntekhabat
                           AND A.Natije=CASE WHEN D.Value=2 THEN 10 ELSE 16 END))
       WHEN @PID=300 AND D.Value=4 THEN (SELECT COUNT_BIG(*) FROM #Visible WHERE StateCode='APPROVED')
       WHEN @PID=300 AND D.Value=5 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V JOIN #LastAction L ON L.ReferralId=V.ReferralId
           WHERE V.StateCode='PROVINCE_RETURNED' AND L.ActionCode='RETURN_PROVINCE' AND L.ActorPostId=5)
       WHEN @PID=300 AND D.Value=6 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM TahghighatV2.NoResearchDecision N WHERE N.ReferralId=V.ReferralId))

       -- Province (301), same all-cases scope as SP_GetProvinceInbox
       WHEN @PID=301 AND D.Value=1 THEN (SELECT COUNT_BIG(*) FROM #Visible)
       WHEN @PID=301 AND D.Value=2 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V
            WHERE V.IsClosed=0 AND (
              V.StateCode IN ('PROVINCE_INBOX','CHILD_INBOX')
              OR (V.ParentReferralId IS NULL
                 AND V.StateCode IN ('PROVINCE_WORKING','PENDING_CHILD_RESULTS')
                 AND EXISTS (
                   SELECT 1 FROM TahghighatV2.Referral C
                   WHERE C.ParentReferralId=V.ReferralId AND C.CaseId=V.CaseId
                     AND C.IsDeleted=0 AND C.IsClosed=1 AND C.StateCode='CHILD_REPLIED'
                     AND C.ReceiverLevel IN ('HOZE','OSTAN')
                 ))
            ))
       WHEN @PID=301 AND D.Value=3 THEN
          (SELECT COUNT_BIG(*) FROM #Visible WHERE StateCode='DIRECTOR_REVIEW' AND IsClosed=0)
       WHEN @PID=301 AND D.Value=4 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V JOIN #LastAction L ON L.ReferralId=V.ReferralId
           WHERE V.StateCode='PROVINCE_RETURNED' AND V.IsClosed=0
             AND L.ActionCode='RETURN_PROVINCE' AND L.ActorPostId=50)
       WHEN @PID=301 AND D.Value=5 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM TahghighatV2.ResearchAssignment A
              WHERE A.ReferralId=V.ReferralId AND A.StatusCode<>'CANCELLED'))
       WHEN @PID=301 AND D.Value=6 THEN CONVERT(BIGINT,0) -- council V2 action not implemented
       WHEN @PID=301 AND D.Value=7 THEN
          (SELECT COUNT_BIG(*) FROM #Visible WHERE StateCode='SETAD_REVIEW' AND IsClosed=0)
       WHEN @PID=301 AND D.Value=8 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V JOIN #LastAction L ON L.ReferralId=V.ReferralId
           WHERE V.StateCode='PROVINCE_RETURNED' AND V.IsClosed=0
             AND L.ActionCode='RETURN_PROVINCE' AND L.ActorPostId=5)
       WHEN @PID=301 AND D.Value=9 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM #Children C WHERE C.ParentReferralId=V.ReferralId AND C.ReceiverLevel='HOZE'))
       WHEN @PID=301 AND D.Value=10 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM #Children C WHERE C.ParentReferralId=V.ReferralId
               AND C.ReceiverLevel='OSTAN' AND C.ToMahal<>@Mahal))
       WHEN @PID=301 AND D.Value=11 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM #Children C WHERE C.ParentReferralId=V.ReferralId
               AND C.ReceiverLevel='OSTAN' AND C.ToMahal<>@Mahal AND C.IsClosed=1))
       WHEN @PID=301 AND D.Value=12 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM #Children C WHERE C.ParentReferralId=V.ReferralId
               AND C.ReceiverLevel='HOZE' AND C.IsClosed=1))
       WHEN @PID=301 AND D.Value=13 THEN CONVERT(BIGINT,0) -- no V2 RETURN_HOZE transition
       WHEN @PID=301 AND D.Value=15 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM TahghighatV2.NoResearchDecision N WHERE N.ReferralId=V.ReferralId))

       -- Director (302): sent is historical action, not a duplicate of inbox
       WHEN @PID=302 AND D.Value=1 THEN (SELECT COUNT_BIG(*) FROM #Visible)
       WHEN @PID=302 AND D.Value=2 THEN
          (SELECT COUNT_BIG(*) FROM #Visible WHERE StateCode='DIRECTOR_REVIEW' AND IsClosed=0)
       WHEN @PID=302 AND D.Value=3 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM TahghighatV2.WorkflowEvent E
              WHERE E.ReferralId=V.ReferralId AND E.ActionCode='DIRECTOR_APPROVE'))

       -- Council (303) has no separately assigned V2 inbox yet
       WHEN @PID=303 AND D.Value IN (1,2) THEN CONVERT(BIGINT,0)

       -- Hoze (304); Post 70 uses county referrals authorized to that user
       WHEN @PID=304 AND D.Value=1 THEN (SELECT COUNT_BIG(*) FROM #Visible)
       WHEN @PID=304 AND D.Value=2 THEN
          (SELECT COUNT_BIG(*) FROM #Visible WHERE StateCode='CHILD_INBOX' AND IsClosed=0)
       WHEN @PID=304 AND D.Value=3 THEN
          (SELECT COUNT_BIG(*) FROM #Visible WHERE StateCode='CHILD_REPLIED' AND IsClosed=1)
       WHEN @PID=304 AND D.Value=4 THEN
          (SELECT COUNT_BIG(*) FROM #Visible V WHERE EXISTS
             (SELECT 1 FROM TahghighatV2.ResearchAssignment A
              JOIN TahghighatV2.Referral R ON R.ReferralId=A.ReferralId
              WHERE R.IsDeleted=0 AND A.StatusCode IN ('PENDING','IN_PROGRESS')
                AND ((@PostId=70 AND A.ReferralId=V.ReferralId)
                  OR (@PostId IN (60,61) AND R.ParentReferralId=V.ReferralId
                      AND R.ReceiverLevel='SHAHR'))))
       ELSE CONVERT(BIGINT,0)
       END) AS CountParvandeh,
       CAST('red' AS VARCHAR(10)) AS fill
    FROM dbo.DFN D
    WHERE D.PID=@PID
    ORDER BY D.Value,D.ID;
END;

GO

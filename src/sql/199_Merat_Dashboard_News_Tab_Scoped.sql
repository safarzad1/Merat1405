-- Merat: profile schema required by preceding source releases + scoped news tab analytics.
-- Run in SSMS, database MeratDB. Re-runnable (CREATE OR ALTER).
USE [MeratDB];
GO

-- A self-contained profile photo store for signed-in users.
-- Does not depend on PersonFiles or MeratFilesDB.
IF OBJECT_ID(N'dbo.UserAvatar',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserAvatar
    (
        UserId BIGINT NOT NULL CONSTRAINT PK_UserAvatar PRIMARY KEY,
        PhotoJpeg VARBINARY(MAX) NOT NULL,
        UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_UserAvatar_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_UserAvatar_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
    );
END;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetNewsAnalytics]
 @UserId BIGINT,
 @DateFrom NVARCHAR(10)=NULL,
 @DateTo NVARCHAR(10)=NULL,
 @ProvinceId BIGINT=NULL,
 @OrgLevel TINYINT=0,
 @Status NVARCHAR(15)=N'ALL',
 @Search NVARCHAR(120)=NULL,
 @MaxDetails INT=100
AS
BEGIN
 SET NOCOUNT ON;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserId=@UserId AND IsActive=1)
  THROW 52102,N'کاربر فعال یافت نشد.',1;
 IF @DateFrom IS NOT NULL AND (@DateFrom NOT LIKE N'[1][34][0-9][0-9]/[01][0-9]/[0-3][0-9]' OR LEN(@DateFrom)<>10
     OR dbo.ShamsiToMiladi(@DateFrom) IS NULL) THROW 52103,N'تاریخ شروع نامعتبر است.',1;
 IF @DateTo IS NOT NULL AND (@DateTo NOT LIKE N'[1][34][0-9][0-9]/[01][0-9]/[0-3][0-9]' OR LEN(@DateTo)<>10
     OR dbo.ShamsiToMiladi(@DateTo) IS NULL) THROW 52104,N'تاریخ پایان نامعتبر است.',1;
 IF @DateFrom IS NOT NULL AND @DateTo IS NOT NULL AND @DateFrom>@DateTo
   THROW 52105,N'تاریخ شروع بعد از پایان است.',1;
 IF @OrgLevel NOT IN(0,1,2,3,4) THROW 52106,N'سطح سازمانی نامعتبر است.',1;
 IF @Status NOT IN(N'ALL',N'DRAFT',N'OPEN',N'RETURNED',N'FINAL') THROW 52107,N'وضعیت خبر نامعتبر است.',1;
 IF @MaxDetails IS NULL OR @MaxDetails<1 SET @MaxDetails=100;
 IF @MaxDetails>2000 SET @MaxDetails=2000;
 SET @Search=NULLIF(LTRIM(RTRIM(@Search)),N'');
 IF LEN(@Search)>120 THROW 52108,N'متن جست‌وجو طولانی است.',1;
 IF @ProvinceId IS NOT NULL AND @ProvinceId<1 THROW 52109,N'شناسه استان نامعتبر است.',1;

 DECLARE @ActorMahal BIGINT, @ActorPostId INT, @ActorRollId INT;
 SELECT @ActorMahal=U.Mahal,@ActorPostId=U.PostId,@ActorRollId=P.RollId
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1;
 IF @ActorPostId IS NULL OR @ActorPostId IN (54,55,56)
   THROW 52111,N'دسترسی به آمار اخبار برای این سمت مجاز نیست.',1;

 DECLARE @Now DATETIME2(0)=CONVERT(DATETIME2(0),DATEADD(MINUTE,210,SYSUTCDATETIME()));
 IF @Now IS NULL THROW 52110,N'ساعت شمسی سامانه قابل تبدیل نیست.',1;

 -- All visible news are scoped through the *same* SQL visibility function used by the news module.
 -- Origin geography follows Phase 4: Citys.PCityId=1 means province; HQ-origin reports have ProvinceId=1.
 SELECT K.ShomareKhabar,K.OnvanKhabar,K.CreateDateTime,K.CurrentStatusCode,
        K.CreateUserId,K.CurrentUserId,K.CurrentPostId,K.CreateMahal,
        CAST(CASE WHEN K.CreateMahal=1 THEN 1
          WHEN C.PCityId=1 THEN C.CityId ELSE C.PCityId END AS BIGINT) AS ProvinceId,
        CASE WHEN K.CreateMahal=1 THEN N'ستاد' ELSE COALESCE(PR.Name,N'نامشخص') END AS ProvinceName,
        CASE WHEN CP.RollId=1 THEN 1 WHEN CP.RollId IN(2,5) THEN 2
             WHEN CP.RollId=3 THEN 3 WHEN CP.RollId=4 THEN 4 ELSE 0 END AS CurrentLevel
 INTO #Scope
 FROM Akhbar.Khabar K
 LEFT JOIN dbo.Citys C ON C.CityId=K.CreateMahal
 LEFT JOIN dbo.Citys PR ON PR.CityId=CASE WHEN C.PCityId=1 THEN C.CityId ELSE C.PCityId END
 LEFT JOIN dbo.Posts CP ON CP.PostId=K.CurrentPostId
 WHERE K.IsDelete=0
   AND (@DateFrom IS NULL OR LEFT(K.CreateDateTime,10)>=@DateFrom)
   AND (@DateTo IS NULL OR LEFT(K.CreateDateTime,10)<=@DateTo)
   -- Unsigned drafts are private even from geographic supervisors until submitted.
   AND (K.CurrentStatusCode<>N'PISHNEVIS' OR K.CreateUserId=@UserId)
   -- Organizational report scope: only origin news from this user's subordinate geography.
   -- Participation in a news route outside the area does not grant access to the whole outside province.
   AND (
       (@ActorRollId=1 AND @ActorMahal=1 AND
        (Akhbar.FN_SetadNewsProvinceAllowed(K.ShomareKhabar,@UserId)=1
          OR (K.CreateUserId=@UserId AND K.CurrentStatusCode=N'PISHNEVIS')))
    OR (@ActorRollId IN (2,5) AND @ActorPostId BETWEEN 50 AND 53 AND
        (K.CreateMahal=@ActorMahal OR EXISTS
            (SELECT 1 FROM dbo.Citys LOC WHERE LOC.CityId=K.CreateMahal AND LOC.PCityId=@ActorMahal)))
    OR (@ActorRollId=3 AND @ActorPostId IN(60,61) AND
        (K.CreateMahal=@ActorMahal OR EXISTS
            (SELECT 1 FROM dbo.Citys LOC WHERE LOC.CityId=K.CreateMahal AND LOC.CityIdHozeh=@ActorMahal)))
    OR (@ActorRollId=4 AND @ActorPostId=70 AND K.CreateMahal=@ActorMahal)
   );
 CREATE UNIQUE CLUSTERED INDEX CX_NewsAnalyticsScope ON #Scope(ShomareKhabar);

 SELECT * INTO #News FROM #Scope S
 WHERE (@ProvinceId IS NULL OR S.ProvinceId=@ProvinceId)
   AND (@OrgLevel=0 OR S.CurrentLevel=@OrgLevel)
   AND (@Search IS NULL OR S.OnvanKhabar LIKE N'%'+@Search+N'%'
        OR S.ShomareKhabar=TRY_CONVERT(BIGINT,@Search))
   AND (@Status=N'ALL'
     OR (@Status=N'DRAFT' AND S.CurrentStatusCode=N'PISHNEVIS')
     OR (@Status=N'OPEN' AND (S.CurrentStatusCode LIKE N'KARTABL_%' OR S.CurrentStatusCode LIKE N'BARGASHT_%'))
     OR (@Status=N'RETURNED' AND S.CurrentStatusCode LIKE N'BARGASHT_%')
     OR (@Status=N'FINAL' AND S.CurrentStatusCode IN(N'TAEED_NAHAEI_SETAD',N'TAEED_NAHAEI_HOZE')));
 CREATE UNIQUE CLUSTERED INDEX CX_NewsAnalyticsNews ON #News(ShomareKhabar);

 -- A news has at most one metric row; duplicate active inboxes are not double-counted.
 ;WITH R AS
 (SELECT KT.ShomareKhabar,KT.CurrentUserId,KT.CurrentPostId,KT.ErsalDateTime,
     ROW_NUMBER() OVER(PARTITION BY KT.ShomareKhabar ORDER BY KT.KartablId DESC) AS RowNo,
     COUNT_BIG(*) OVER(PARTITION BY KT.ShomareKhabar) AS ActiveCount
  FROM Akhbar.KhabarKartabl KT JOIN #News N ON N.ShomareKhabar=KT.ShomareKhabar WHERE KT.IsActive=1)
 SELECT R.ShomareKhabar,R.CurrentUserId,R.CurrentPostId,R.ErsalDateTime,R.ActiveCount,
        CASE WHEN P.RollId=1 THEN 1 WHEN P.RollId IN(2,5) THEN 2
             WHEN P.RollId=3 THEN 3 WHEN P.RollId=4 THEN 4 ELSE 0 END AS OrgLevel,
        CASE WHEN T.AtTime IS NULL OR T.AtTime>@Now THEN NULL
             ELSE DATEDIFF(MINUTE,T.AtTime,@Now) END AS AgeMinutes
 INTO #Open FROM R
 LEFT JOIN dbo.Posts P ON P.PostId=R.CurrentPostId
 CROSS APPLY(SELECT Akhbar.FN_NewsJalaliDateTimeToGregorian(R.ErsalDateTime) AS AtTime) T
 WHERE R.RowNo=1 AND EXISTS(SELECT 1 FROM #News N WHERE N.ShomareKhabar=R.ShomareKhabar AND (N.CurrentStatusCode LIKE N'KARTABL_%' OR N.CurrentStatusCode LIKE N'BARGASHT_%'));

 -- A 'completed hop' is time from a send/return addressed to a recipient until the next
 -- send/return in the same news. Managerial reassignment is NOT a new news or another hop.
 ;WITH Moves AS
 (SELECT L.ShomareKhabar,L.LogId,L.FromUserId,L.ToUserId,L.ToPostId,L.NoeEghdam,L.EshkalatIds,L.Tozihat,
     L.CreateDateTime,
     LEAD(L.CreateDateTime) OVER(PARTITION BY L.ShomareKhabar ORDER BY L.LogId) AS NextAt
  FROM Akhbar.KhabarGardeshLog L JOIN #News N ON N.ShomareKhabar=L.ShomareKhabar
  WHERE L.NoeEghdam IN(N'ارسال خبر',N'تأیید و ارسال',N'برگشت خبر',N'تأیید نهایی'))
 SELECT M.ShomareKhabar,M.LogId,M.FromUserId,M.ToUserId,M.NoeEghdam,M.EshkalatIds,M.Tozihat,
      CASE WHEN P.RollId=1 THEN 1 WHEN P.RollId IN(2,5) THEN 2
           WHEN P.RollId=3 THEN 3 WHEN P.RollId=4 THEN 4 ELSE 0 END AS OrgLevel,
      CASE WHEN M.NextAt IS NULL OR T.StartAt IS NULL OR T.FinishAt IS NULL
             OR T.FinishAt<T.StartAt OR DATEDIFF(DAY,T.StartAt,T.FinishAt)>366 THEN NULL
           ELSE DATEDIFF(MINUTE,T.StartAt,T.FinishAt) END AS HandlingMinutes
 INTO #Moves
 FROM Moves M LEFT JOIN dbo.Posts P ON P.PostId=M.ToPostId
 CROSS APPLY(SELECT Akhbar.FN_NewsJalaliDateTimeToGregorian(M.CreateDateTime) AS StartAt,
                    Akhbar.FN_NewsJalaliDateTimeToGregorian(M.NextAt) AS FinishAt) T;

 SELECT * INTO #Completed FROM #Moves WHERE HandlingMinutes IS NOT NULL AND OrgLevel BETWEEN 1 AND 4;

 -- Flags are aggregated once per news: avoid scalar subqueries inside COUNT_BIG.
 SELECT M.ShomareKhabar,
   MAX(CASE WHEN M.NoeEghdam IN(N'ارسال خبر',N'تأیید و ارسال',N'تأیید نهایی') THEN 1 ELSE 0 END) AS HasSend,
   MAX(CASE WHEN M.NoeEghdam IN(N'تأیید و ارسال',N'تأیید نهایی') THEN 1 ELSE 0 END) AS HasApproval,
   MAX(CASE WHEN M.NoeEghdam=N'برگشت خبر' THEN 1 ELSE 0 END) AS HasReturn
 INTO #ActionFlags FROM #Moves M GROUP BY M.ShomareKhabar;
 CREATE UNIQUE CLUSTERED INDEX IX_ActionFlags ON #ActionFlags(ShomareKhabar);

 -- 0: summary of the same filtered cohort as the other result sets.
 SELECT COUNT_BIG(*) AS TotalNews,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode=N'PISHNEVIS' THEN 1 END) AS DraftCount,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode LIKE N'KARTABL_%' OR N.CurrentStatusCode LIKE N'BARGASHT_%' THEN 1 END) AS OpenCount,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode LIKE N'BARGASHT_%' THEN 1 END) AS ReturnedCount,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode IN(N'TAEED_NAHAEI_SETAD',N'TAEED_NAHAEI_HOZE') THEN 1 END) AS FinalCount,
   COUNT_BIG(CASE WHEN N.CurrentUserId=@UserId AND O.CurrentUserId=@UserId THEN 1 END) AS MyInboxCount,
   COUNT_BIG(CASE WHEN F.HasSend=1 THEN 1 END) AS SentCount,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode IN(N'TAEED_NAHAEI_SETAD',N'TAEED_NAHAEI_HOZE')
     OR F.HasApproval=1 THEN 1 END) AS ApprovedCount,
   COUNT_BIG(CASE WHEN F.HasReturn=1 THEN 1 END) AS EverReturnedCount,
   COUNT_BIG(CASE WHEN O.AgeMinutes>=ISNULL(T.HoursLimit,48)*60 THEN 1 END) AS OverdueCount,
   COUNT_BIG(CASE WHEN O.ShomareKhabar IS NOT NULL AND O.AgeMinutes IS NULL THEN 1 END) AS UnknownAgeCount,
   (SELECT COUNT_BIG(*) FROM #Moves WHERE NoeEghdam=N'برگشت خبر') AS ReturnActions,
   (SELECT COUNT_BIG(*) FROM #Completed) AS CompletedHops
 FROM #News N LEFT JOIN #Open O ON O.ShomareKhabar=N.ShomareKhabar
 LEFT JOIN #ActionFlags F ON F.ShomareKhabar=N.ShomareKhabar
 LEFT JOIN Akhbar.NewsOverdueThreshold T ON T.OrgLevel=O.OrgLevel;

 -- 1: historical completed processing times plus separate current backlog for each stage.
 ;WITH M AS
 (SELECT OrgLevel,COUNT_BIG(*) AS CompletedHops,
    CONVERT(DECIMAL(18,1),AVG(CONVERT(FLOAT,HandlingMinutes))) AS AvgMinutes
  FROM #Completed GROUP BY OrgLevel),
 Median AS
 (SELECT DISTINCT OrgLevel,
    CONVERT(DECIMAL(18,1),PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY HandlingMinutes)
      OVER(PARTITION BY OrgLevel)) AS MedianMinutes FROM #Completed),
 Opened AS
 (SELECT O.OrgLevel,COUNT_BIG(*) AS OpenNews,
   COUNT_BIG(CASE WHEN O.AgeMinutes>=ISNULL(T.HoursLimit,48)*60 THEN 1 END) AS OverdueNews,
   MAX(O.AgeMinutes) AS LongestOpenMinutes
  FROM #Open O LEFT JOIN Akhbar.NewsOverdueThreshold T ON T.OrgLevel=O.OrgLevel
  GROUP BY O.OrgLevel)
 SELECT V.OrgLevel,ISNULL(M.CompletedHops,0) AS CompletedHops,M.AvgMinutes,
   Median.MedianMinutes,ISNULL(O.OpenNews,0) AS OpenNews,ISNULL(O.OverdueNews,0) AS OverdueNews,
   O.LongestOpenMinutes
 FROM (VALUES (1),(2),(3),(4)) V(OrgLevel)
 LEFT JOIN M ON M.OrgLevel=V.OrgLevel
 LEFT JOIN Median ON Median.OrgLevel=V.OrgLevel
 LEFT JOIN Opened O ON O.OrgLevel=V.OrgLevel
 ORDER BY V.OrgLevel;

 -- 2: province comparisons, one row per news; historical hops do not inflate news counts.
 SELECT N.ProvinceId,N.ProvinceName,COUNT_BIG(*) AS TotalNews,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode IN(N'TAEED_NAHAEI_SETAD',N'TAEED_NAHAEI_HOZE') THEN 1 END) AS FinalCount,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode LIKE N'BARGASHT_%' THEN 1 END) AS ReturnedCount,
   COUNT_BIG(CASE WHEN O.AgeMinutes>=ISNULL(T.HoursLimit,48)*60 THEN 1 END) AS OverdueCount,
   COUNT_BIG(CASE WHEN N.CurrentStatusCode LIKE N'KARTABL_%' OR N.CurrentStatusCode LIKE N'BARGASHT_%' THEN 1 END) AS OpenCount,
   MAX(H.AvgMinutes) AS AvgMinutes
 FROM #News N LEFT JOIN #Open O ON O.ShomareKhabar=N.ShomareKhabar
 LEFT JOIN Akhbar.NewsOverdueThreshold T ON T.OrgLevel=O.OrgLevel
 LEFT JOIN (SELECT X.ProvinceId,CONVERT(DECIMAL(18,1),AVG(CONVERT(FLOAT,M.HandlingMinutes))) AS AvgMinutes
            FROM #Completed M JOIN #News X ON X.ShomareKhabar=M.ShomareKhabar
            GROUP BY X.ProvinceId) H ON (H.ProvinceId=N.ProvinceId OR (H.ProvinceId IS NULL AND N.ProvinceId IS NULL))
 GROUP BY N.ProvinceId,N.ProvinceName ORDER BY TotalNews DESC,N.ProvinceName;

 -- 3: grouped return reasons, no raw potentially sensitive free-text exposed in the chart.
 SELECT TOP(20) CASE WHEN NULLIF(LTRIM(RTRIM(M.EshkalatIds)),N'') IS NOT NULL
   THEN N'کد علت: '+LEFT(LTRIM(RTRIM(M.EshkalatIds)),100)
   WHEN NULLIF(LTRIM(RTRIM(M.Tozihat)),N'') IS NOT NULL THEN N'علت با توضیح آزاد'
   ELSE N'علت ثبت نشده' END AS Reason,
   COUNT_BIG(*) AS ReturnCount
 FROM #Moves M WHERE M.NoeEghdam=N'برگشت خبر'
 GROUP BY CASE WHEN NULLIF(LTRIM(RTRIM(M.EshkalatIds)),N'') IS NOT NULL
   THEN N'کد علت: '+LEFT(LTRIM(RTRIM(M.EshkalatIds)),100)
   WHEN NULLIF(LTRIM(RTRIM(M.Tozihat)),N'') IS NOT NULL THEN N'علت با توضیح آزاد'
   ELSE N'علت ثبت نشده' END
 ORDER BY ReturnCount DESC,Reason;

 -- 4: count actual actions performed by each user rather than attributing whole
 -- stage durations to a former assignee after reassignment.
 ;WITH Actions AS
 (SELECT FromUserId AS UserId,COUNT_BIG(*) AS Actions,
   COUNT_BIG(CASE WHEN NoeEghdam=N'برگشت خبر' THEN 1 END) AS ReturnedActions
  FROM #Moves WHERE FromUserId IS NOT NULL GROUP BY FromUserId),
 Backlog AS
 (SELECT CurrentUserId AS UserId,COUNT_BIG(*) AS OpenNews,
   COUNT_BIG(CASE WHEN O.AgeMinutes>=ISNULL(T.HoursLimit,48)*60 THEN 1 END) AS OverdueNews
  FROM #Open O LEFT JOIN Akhbar.NewsOverdueThreshold T ON T.OrgLevel=O.OrgLevel
  WHERE CurrentUserId IS NOT NULL GROUP BY CurrentUserId),
 Actors AS
 (SELECT UserId FROM Actions UNION SELECT UserId FROM Backlog)
 SELECT TOP(100) A.UserId,ISNULL(NULLIF(V.FullName,N''),CONCAT(N'کاربر ',CONVERT(NVARCHAR(30),A.UserId))) AS FullName,
   ISNULL(P.OnvanPost,N'') AS PostName,ISNULL(S.Actions,0) AS Actions,
   ISNULL(S.ReturnedActions,0) AS ReturnedActions,
   ISNULL(B.OpenNews,0) AS OpenNews,ISNULL(B.OverdueNews,0) AS OverdueNews
 FROM Actors A LEFT JOIN Actions S ON S.UserId=A.UserId
 LEFT JOIN Backlog B ON B.UserId=A.UserId
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=A.UserId
 LEFT JOIN dbo.Users U ON U.UserId=A.UserId
 LEFT JOIN dbo.Posts P ON P.PostId=U.PostId
 ORDER BY OpenNews DESC,Actions DESC,A.UserId;

 -- 5: bounded details from the same filtered cohort (Excel can request up to 2000 rows).
 SELECT TOP(@MaxDetails) N.ShomareKhabar,N.OnvanKhabar,N.CreateDateTime,
   N.ProvinceName,N.CurrentStatusCode,N.CurrentLevel,
   ISNULL(NULLIF(V.FullName,N''),N'') AS CurrentOwner,
   O.ErsalDateTime AS InboxDateTime,O.AgeMinutes,
   CAST(CASE WHEN O.AgeMinutes>=ISNULL(T.HoursLimit,48)*60 THEN 1 ELSE 0 END AS BIT) AS IsOverdue,
   O.ActiveCount
 FROM #News N LEFT JOIN #Open O ON O.ShomareKhabar=N.ShomareKhabar
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=N.CurrentUserId
 LEFT JOIN Akhbar.NewsOverdueThreshold T ON T.OrgLevel=O.OrgLevel
 ORDER BY N.CreateDateTime DESC,N.ShomareKhabar DESC;

 -- 6: dropdown options from scope BEFORE province filtering; users cannot discover forbidden provinces.
 SELECT DISTINCT ProvinceId,ProvinceName FROM #Scope
 WHERE ProvinceId IS NOT NULL ORDER BY ProvinceName;
END;
GO

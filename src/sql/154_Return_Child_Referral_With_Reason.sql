USE [MeratDB];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
-- Keep complete audit of each return; prior reports, worksheets, and images stay intact.
IF OBJECT_ID(N'TahghighatV2.ChildReturnHistory',N'U') IS NULL
BEGIN
 CREATE TABLE TahghighatV2.ChildReturnHistory
 (
  ReturnId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_MRV2_ChildReturnHistory PRIMARY KEY,
  ParentReferralId bigint NOT NULL,
  ChildReferralId bigint NOT NULL,
  ReturnReason nvarchar(4000) NOT NULL,
  PreviousReportText nvarchar(max) NULL,
  ReturnedByUserId bigint NOT NULL,
  ReturnedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_MRV2_ChildReturnHistory_At DEFAULT SYSUTCDATETIME()
 );
 CREATE INDEX IX_MRV2_ChildReturnHistory_Child ON TahghighatV2.ChildReturnHistory(ChildReferralId,ReturnId DESC);
END;
GO
IF COL_LENGTH(N'TahghighatV2.ChildReturnHistory',N'PreviousReportText') IS NULL
 ALTER TABLE TahghighatV2.ChildReturnHistory ADD PreviousReportText nvarchar(max) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM TahghighatV2.WorkflowAction WHERE ActionCode='RETURN_CHILD_FOR_REVISION')
 INSERT TahghighatV2.WorkflowAction(ActionCode,TitleFa)
 VALUES('RETURN_CHILD_FOR_REVISION',N'برگشت ارجاع زیرمجموعه برای اصلاح');
GO
-- Explicit permissions for both HOZE posts and province's two research posts.
INSERT TahghighatV2.PostActionPermission(PostId,ActionCode,IsAllowed)
SELECT v.PostId,'RETURN_CHILD_FOR_REVISION',CONVERT(bit,1)
FROM (VALUES(51),(52),(60),(61)) v(PostId)
WHERE NOT EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission p
 WHERE p.PostId=v.PostId AND p.ActionCode='RETURN_CHILD_FOR_REVISION');
UPDATE TahghighatV2.PostActionPermission SET IsAllowed=1
 WHERE ActionCode='RETURN_CHILD_FOR_REVISION' AND PostId IN(51,52,60,61);
GO
CREATE OR ALTER PROCEDURE TahghighatV2.SP_ReturnChildForRevision
 @ParentReferralId bigint,
 @ChildReferralId bigint,
 @Reason nvarchar(4000),
 @UserId bigint
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF @ParentReferralId IS NULL OR @ParentReferralId<=0 OR @ChildReferralId IS NULL OR @ChildReferralId<=0
   OR @UserId IS NULL OR @UserId<=0 OR LEN(LTRIM(RTRIM(ISNULL(@Reason,N''))))<5
   OR LEN(@Reason)>4000
  THROW 56901,N'شناسه معتبر و دلیل برگشت حداقل پنج نویسه الزامی است.',1;
 DECLARE @Post int,@Mahal int,@ParentLevel varchar(20),@ParentState varchar(40),
         @ChildLevel varchar(20),@ChildState varchar(40),@ChildClosed bit,
         @RootId bigint,@ParentParent bigint,@LockResult int,@CaseId bigint,@ParentClosed bit,
         @PreviousReport nvarchar(max);
 SELECT @Post=u.PostId,@Mahal=u.Mahal FROM dbo.Users u WHERE u.UserId=@UserId AND u.IsActive=1;
 IF @Post IS NULL THROW 56902,N'کاربر فعال نیست.',1;
 IF NOT EXISTS(SELECT 1 FROM TahghighatV2.PostActionPermission p
  WHERE p.PostId=@Post AND p.ActionCode='RETURN_CHILD_FOR_REVISION' AND p.IsAllowed=1)
  THROW 56902,N'مجوز برگشت تحقیقات برای این پست فعال نیست.',1;
 -- Lock the complete case under the same root resource used by existing V2 actions.
 SELECT @ParentParent=p.ParentReferralId FROM TahghighatV2.Referral p WHERE p.ReferralId=@ParentReferralId;
 IF @ParentParent IS NULL SET @RootId=@ParentReferralId;
 ELSE SELECT @RootId=COALESCE(ParentReferralId,ReferralId) FROM TahghighatV2.Referral WHERE ReferralId=@ParentReferralId;
 IF @RootId IS NULL THROW 56903,N'پرونده مبدأ یافت نشد.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @LockName nvarchar(255)=N'MRV2:REF:'+CONVERT(nvarchar(20),@RootId);
  EXEC @LockResult=sys.sp_getapplock @Resource=@LockName,@LockMode=N'Exclusive',
    @LockOwner=N'Transaction',@LockTimeout=10000;
  IF @LockResult<0 THROW 56904,N'پرونده در حال انجام عملیات دیگری است.',1;
  SELECT @ParentLevel=p.ReceiverLevel,@ParentState=p.StateCode,
   @ParentClosed=p.IsClosed,@CaseId=p.CaseId
   FROM TahghighatV2.Referral p WITH(UPDLOCK,HOLDLOCK)
   WHERE p.ReferralId=@ParentReferralId AND p.ToMahal=@Mahal AND p.IsDeleted=0;
  SELECT @ChildLevel=c.ReceiverLevel,@ChildState=c.StateCode,@ChildClosed=c.IsClosed
   FROM TahghighatV2.Referral c WITH(UPDLOCK,HOLDLOCK)
   WHERE c.ReferralId=@ChildReferralId AND c.ParentReferralId=@ParentReferralId
     AND c.CaseId=@CaseId AND c.IsDeleted=0;
  IF @ParentLevel IS NULL OR @ChildLevel IS NULL OR @ParentClosed<>0
    THROW 56905,N'ارجاع در محدوده دسترسی این کاربر یا در وضعیت قابل برگشت نیست.',1;
  IF NOT ((@ParentLevel='OSTAN' AND @ChildLevel IN('HOZE','OSTAN') AND @Post IN(51,52))
     OR (@ParentLevel='HOZE' AND @ChildLevel='SHAHR' AND @Post IN(60,61)))
    THROW 56906,N'این سمت اجازه برگشت این نوع ارجاع را ندارد.',1;
  IF (@ParentLevel='OSTAN' AND @ParentState NOT IN('PROVINCE_WORKING','PENDING_CHILD_RESULTS','PROVINCE_RETURNED'))
    OR (@ParentLevel='HOZE' AND @ParentState<>'CHILD_WORKING')
    THROW 56907,N'فرستنده در وضعیت قابل برگشت پاسخ نیست.',1;
  IF @ChildClosed<>1 OR @ChildState<>'CHILD_REPLIED'
    THROW 56908,N'فقط پاسخ دریافت‌شده و بسته‌شده قابل برگشت است.',1;
  -- Do not reopen a child while its descendants are unfinished.
  ;WITH Descendants AS (
    SELECT r.ReferralId,r.IsClosed,r.IsDeleted,0 AS Depth FROM TahghighatV2.Referral r WHERE r.ReferralId=@ChildReferralId
    UNION ALL
    SELECT r.ReferralId,r.IsClosed,r.IsDeleted,d.Depth+1
    FROM TahghighatV2.Referral r JOIN Descendants d ON r.ParentReferralId=d.ReferralId WHERE d.Depth<30
  )
  SELECT ReferralId,IsClosed,IsDeleted INTO #Subtree FROM Descendants OPTION(MAXRECURSION 31);
  IF EXISTS(SELECT 1 FROM #Subtree WHERE ReferralId<>@ChildReferralId AND IsClosed=0 AND IsDeleted=0)
    THROW 56909,N'ابتدا ارجاعات باز زیرمجموعه تعیین‌تکلیف شوند.',1;
  UPDATE TahghighatV2.Referral SET StateCode='CHILD_WORKING',IsClosed=0,
   UpdatedByUserId=@UserId,UpdatedAtUtc=SYSUTCDATETIME()
   WHERE ReferralId=@ChildReferralId;
  IF @ParentLevel='OSTAN' AND @ParentState<>'PENDING_CHILD_RESULTS'
    UPDATE TahghighatV2.Referral SET StateCode='PENDING_CHILD_RESULTS',
      UpdatedByUserId=@UserId,UpdatedAtUtc=SYSUTCDATETIME()
    WHERE ReferralId=@ParentReferralId;
  SELECT @PreviousReport=CASE @ChildLevel
     WHEN 'HOZE' THEN (SELECT TOP(1) SummaryText FROM TahghighatV2.HozeSummary WHERE ReferralId=@ChildReferralId)
     WHEN 'SHAHR' THEN (SELECT TOP(1)
          COALESCE(NULLIF(LTRIM(RTRIM(cr.ReportText)),N''),cs.SummaryText)
          FROM TahghighatV2.Referral r
          LEFT JOIN TahghighatV2.CountyReplyReport cr ON cr.CountyReferralId=r.ReferralId
          LEFT JOIN TahghighatV2.CountySummary cs ON cs.ReferralId=r.ReferralId
          WHERE r.ReferralId=@ChildReferralId)
     WHEN 'OSTAN' THEN (SELECT TOP(1) SummaryText FROM TahghighatV2.ProvinceSummary WHERE ReferralId=@ChildReferralId)
   END;
  INSERT TahghighatV2.ChildReturnHistory
    (ParentReferralId,ChildReferralId,ReturnReason,PreviousReportText,ReturnedByUserId)
   VALUES(@ParentReferralId,@ChildReferralId,LTRIM(RTRIM(@Reason)),@PreviousReport,@UserId);
  INSERT TahghighatV2.WorkflowEvent
    (ReferralId,ActionCode,PreviousStateCode,NewStateCode,Description,ActorUserId)
   VALUES(@ChildReferralId,'RETURN_CHILD_FOR_REVISION',@ChildState,'CHILD_WORKING',@Reason,@UserId);
  COMMIT;
  SELECT CONVERT(bit,1) IsSuccess,@ChildReferralId ChildReferralId,
   'CHILD_WORKING' StateCode;
 END TRY BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetChildReturnNotice
 @ChildReferralId bigint,@UserId bigint
AS
BEGIN
 SET NOCOUNT ON;
 IF @ChildReferralId IS NULL OR @ChildReferralId<=0 OR @UserId IS NULL OR @UserId<=0
  THROW 56911,N'شناسه نامعتبر است.',1;
 IF NOT EXISTS(
    SELECT 1 FROM TahghighatV2.Referral r
    JOIN dbo.Users u ON u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=r.ToMahal
    WHERE r.ReferralId=@ChildReferralId AND r.IsDeleted=0
      AND ((r.ReceiverLevel='SHAHR' AND u.PostId=70)
        OR (r.ReceiverLevel='HOZE' AND u.PostId IN(60,61))
        OR (r.ReceiverLevel='OSTAN' AND u.PostId IN(51,52))))
  THROW 56912,N'دسترسی به دلیل برگشت این ارجاع مجاز نیست.',1;
 SELECT TOP(1) h.ReturnId,h.ReturnReason,h.ReturnedAtUtc,
  p.ReceiverLevel AS SenderLevel,pc.Name AS SenderName
 FROM TahghighatV2.ChildReturnHistory h
 JOIN TahghighatV2.Referral c ON c.ReferralId=h.ChildReferralId
 JOIN TahghighatV2.Referral p ON p.ReferralId=h.ParentReferralId
 LEFT JOIN dbo.Citys pc ON pc.CityId=p.ToMahal
 WHERE h.ChildReferralId=@ChildReferralId AND c.IsClosed=0 AND c.IsDeleted=0
  AND c.StateCode='CHILD_WORKING'
 ORDER BY h.ReturnId DESC;
END;
GO
-- For a province returned by another province, save the revised outgoing text
-- before running the existing CHILD_REPLY transition. Root province cases are excluded.
CREATE OR ALTER PROCEDURE TahghighatV2.SP_SaveReturnedProvinceChildText
 @ChildReferralId bigint,@SummaryText nvarchar(max),@UserId bigint
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF @ChildReferralId IS NULL OR @ChildReferralId<=0 OR @UserId IS NULL OR @UserId<=0
    OR LEN(LTRIM(RTRIM(ISNULL(@SummaryText,N'')))) NOT BETWEEN 20 AND 10000
   THROW 56921,N'متن پاسخ اصلاح‌شده باید بین ۲۰ و ۱۰هزار نویسه باشد.',1;
 DECLARE @Mahal int,@Post int,@ParentId bigint,@State varchar(40),@Lock int;
 SELECT @Mahal=Mahal,@Post=PostId FROM dbo.Users WHERE UserId=@UserId AND IsActive=1;
 IF @Post NOT IN(51,52) OR @Mahal IS NULL
   THROW 56922,N'کاربر مجاز استان یافت نشد.',1;
 SELECT @ParentId=ParentReferralId FROM TahghighatV2.Referral
 WHERE ReferralId=@ChildReferralId AND ReceiverLevel='OSTAN' AND ToMahal=@Mahal;
 IF @ParentId IS NULL THROW 56923,N'ارجاع برگشتی متعلق به این استان نیست.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @Resource nvarchar(255)=N'MRV2:REF:'+CONVERT(nvarchar(20),@ParentId);
  EXEC @Lock=sys.sp_getapplock @Resource=@Resource,@LockMode=N'Exclusive',
   @LockOwner=N'Transaction',@LockTimeout=10000;
  IF @Lock<0 THROW 56924,N'پرونده در حال پردازش است.',1;
  SELECT @State=c.StateCode FROM TahghighatV2.Referral c WITH(UPDLOCK,HOLDLOCK)
   JOIN TahghighatV2.Referral p ON p.ReferralId=c.ParentReferralId AND p.IsClosed=0
   AND p.IsDeleted=0 AND p.StateCode='PENDING_CHILD_RESULTS'
   WHERE c.ReferralId=@ChildReferralId AND c.ParentReferralId=@ParentId
    AND c.ReceiverLevel='OSTAN' AND c.ToMahal=@Mahal AND c.IsDeleted=0 AND c.IsClosed=0;
  IF @State IS NULL OR @State<>'CHILD_WORKING' OR NOT EXISTS(SELECT 1 FROM TahghighatV2.ChildReturnHistory h WHERE h.ChildReferralId=@ChildReferralId)
    THROW 56925,N'این ارجاع در وضعیت برگشت و قابل اصلاح نیست.',1;
  UPDATE TahghighatV2.ProvinceSummary SET SummaryText=LTRIM(RTRIM(@SummaryText)),LastUpdatedAtUtc=SYSUTCDATETIME()
   WHERE ReferralId=@ChildReferralId;
  IF @@ROWCOUNT=0
   INSERT TahghighatV2.ProvinceSummary(ReferralId,SummaryText,CreatedByUserId)
   VALUES(@ChildReferralId,LTRIM(RTRIM(@SummaryText)),@UserId);
  COMMIT;
  SELECT CONVERT(bit,1) IsSuccess,@ChildReferralId ChildReferralId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
GO

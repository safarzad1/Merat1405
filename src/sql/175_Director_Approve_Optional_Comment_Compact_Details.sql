/* Merat 175 — approving and sending to Setad without an obligatory comment.
   Returning the case to province expert still requires a written reason.
   Only SP_DirectorAction is updated. No stored data is deleted. */
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [TahghighatV2].[SP_DirectorAction]
 @ReferralId bigint,
 @ActionCode varchar(40), -- DIRECTOR_APPROVE | RETURN_PROVINCE
 @Description nvarchar(max),
 @UserId bigint
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 IF @ReferralId IS NULL OR @ReferralId<=0 OR @UserId IS NULL
    OR @ActionCode IS NULL OR @ActionCode NOT IN ('DIRECTOR_APPROVE','RETURN_PROVINCE')
    THROW 52921,N'شناسه ارجاع، کاربر یا اقدام رئیس دفتر نامعتبر است.',1;
 SET @Description = NULLIF(LTRIM(RTRIM(@Description)),N'');
 IF @ActionCode='RETURN_PROVINCE' AND @Description IS NULL
    THROW 52922,N'ثبت دلیل برگشت به کارشناس استان الزامی است.',1;

 DECLARE @Mahal int,@PostId int,@PreviousState varchar(40),@NextState varchar(40),
         @LockResult int,@LastSubmitAction varchar(40);
 SELECT @Mahal=u.Mahal,@PostId=u.PostId
 FROM dbo.Users u WHERE u.UserId=@UserId AND u.IsActive=1;
 IF @PostId IS NULL OR @PostId<>50 OR @Mahal IS NULL OR NOT EXISTS (
    SELECT 1 FROM dbo.Citys c WHERE c.CityId=@Mahal AND c.PCityId=1 AND c.IsActive=1)
    THROW 52923,N'کاربر باید رئیس دفتر فعال استان باشد.',1;
 IF NOT EXISTS (
    SELECT 1 FROM TahghighatV2.PostActionPermission p
    WHERE p.PostId=@PostId AND p.ActionCode=@ActionCode AND p.IsAllowed=1)
    THROW 52924,N'مجوز اقدام رئیس دفتر ثبت نشده است.',1;

 SET @NextState=CASE WHEN @ActionCode='DIRECTOR_APPROVE'
                     THEN 'SETAD_REVIEW' ELSE 'PROVINCE_RETURNED' END;
 BEGIN TRY
   BEGIN TRANSACTION;
   DECLARE @Resource nvarchar(255)=N'MRV2:REF:'+CONVERT(nvarchar(20),@ReferralId);
   EXEC @LockResult=sys.sp_getapplock @Resource=@Resource,
        @LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000;
   IF @LockResult<0 THROW 52925,N'ارجاع هم‌اکنون در حال پردازش است.',1;

   SELECT @PreviousState=r.StateCode
   FROM TahghighatV2.Referral r WITH(UPDLOCK,HOLDLOCK)
   WHERE r.ReferralId=@ReferralId AND r.ToMahal=@Mahal
     AND r.ReceiverLevel='OSTAN' AND r.IsDeleted=0 AND r.IsClosed=0;
   IF @PreviousState IS NULL
      THROW 52926,N'ارجاع در محدوده رئیس دفتر استان یافت نشد.',1;
   IF @PreviousState<>'DIRECTOR_REVIEW' OR NOT EXISTS (
     SELECT 1 FROM TahghighatV2.ActionTransition t
     WHERE t.FromStateCode=@PreviousState AND t.ActionCode=@ActionCode
       AND t.ToStateCode=@NextState)
      THROW 52927,N'این انتقال برای وضعیت فعلی پرونده مجاز نیست.',1;

   SELECT TOP (1) @LastSubmitAction=e.ActionCode
   FROM TahghighatV2.WorkflowEvent e
   WHERE e.ReferralId=@ReferralId
   ORDER BY e.EventId DESC;
   IF @LastSubmitAction NOT IN ('NO_RESEARCH','SUBMIT_DIRECTOR')
      OR @LastSubmitAction IS NULL
      THROW 52928,N'آخرین اقدام ثبت‌شده، ارسال معتبر به رئیس دفتر نیست.',1;

   IF @ActionCode='DIRECTOR_APPROVE'
   BEGIN
       IF @LastSubmitAction='NO_RESEARCH' AND NOT EXISTS (
          SELECT 1 FROM TahghighatV2.NoResearchDecision d
          WHERE d.ReferralId=@ReferralId
            AND NULLIF(LTRIM(RTRIM(d.Reason)),N'') IS NOT NULL)
          THROW 52929,N'علت تصمیم عدم نیاز به تحقیق ثبت نشده است.',1;
       IF @LastSubmitAction='SUBMIT_DIRECTOR' AND NOT EXISTS (
          SELECT 1 FROM TahghighatV2.ProvinceSummary s
          WHERE s.ReferralId=@ReferralId
            AND NULLIF(LTRIM(RTRIM(s.SummaryText)),N'') IS NOT NULL)
          THROW 52930,N'جمع‌بندی معتبر استان ثبت نشده است.',1;

       DECLARE @Tree TABLE(ReferralId bigint NOT NULL PRIMARY KEY,IsClosed bit NOT NULL,IsDeleted bit NOT NULL);
       ;WITH descendants AS (
          SELECT ReferralId,ParentReferralId,IsClosed,IsDeleted
          FROM TahghighatV2.Referral WHERE ReferralId=@ReferralId
          UNION ALL
          SELECT c.ReferralId,c.ParentReferralId,c.IsClosed,c.IsDeleted
          FROM TahghighatV2.Referral c
          INNER JOIN descendants d ON c.ParentReferralId=d.ReferralId
       )
       INSERT INTO @Tree(ReferralId,IsClosed,IsDeleted)
       SELECT ReferralId,IsClosed,IsDeleted FROM descendants OPTION(MAXRECURSION 100);
       IF EXISTS(SELECT 1 FROM @Tree t
          WHERE t.ReferralId<>@ReferralId AND t.IsClosed=0 AND t.IsDeleted=0)
          THROW 52931,N'پیش از تأیید، ارجاعات فرزند باز باید تعیین تکلیف شوند.',1;
       IF EXISTS (
          SELECT 1 FROM TahghighatV2.ResearchAssignment a
          INNER JOIN @Tree t ON t.ReferralId=a.ReferralId
          WHERE t.IsDeleted=0 AND a.StatusCode IN('PENDING','IN_PROGRESS'))
          THROW 52932,N'محققان ناتمام باید پیش از تأیید تعیین تکلیف شوند.',1;
   END;

   UPDATE TahghighatV2.Referral
      SET StateCode=@NextState,UpdatedByUserId=@UserId,UpdatedAtUtc=SYSUTCDATETIME()
   WHERE ReferralId=@ReferralId;

   INSERT TahghighatV2.WorkflowEvent
      (ReferralId,ActionCode,PreviousStateCode,NewStateCode,Description,ActorUserId)
   VALUES (@ReferralId,@ActionCode,@PreviousState,@NextState,@Description,@UserId);
   COMMIT TRANSACTION;
   SELECT CONVERT(bit,1) AS IsSuccess,@ReferralId AS ReferralId,@NextState AS NewStateCode;
 END TRY
 BEGIN CATCH
    IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
    THROW;
 END CATCH;
END;

GO

-- Merat phase 159: finalize province investigator after final summary image.
-- Covers both new confirmations and already-approved images on the current server.
-- Non-destructive: no deletion of referrals, worksheets or attachments.
-- Prerequisite: province summary form + MeratFilesDB.dbo.TahghighatDocument.
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID(N'TahghighatV2.SP_ReplaceInvestigatorSummaryImage',N'P') IS NULL
    THROW 50159,N'پروسیجر ثبت تصویر جمع‌بندی وجود ندارد؛ ابتدا SQLهای پیش‌نیاز را نصب کنید.',1;
IF OBJECT_ID(N'MeratFilesDB.dbo.TahghighatDocument',N'U') IS NULL
    THROW 50160,N'جدول اسناد MeratFilesDB یافت نشد.',1;
IF OBJECT_ID(N'TahghighatV2.InvestigatorSummary',N'U') IS NULL
    THROW 50161,N'جدول جمع‌بندی محقق استان یافت نشد.',1;
GO
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS (SELECT 1 FROM TahghighatV2.WorkflowAction WITH(UPDLOCK,HOLDLOCK)
                WHERE ActionCode='PROVINCE_AUTO_SUMMARY_COMPLETE')
   INSERT TahghighatV2.WorkflowAction(ActionCode,TitleFa)
   VALUES('PROVINCE_AUTO_SUMMARY_COMPLETE',N'تکمیل خودکار محقق استان پس از تأیید جمع‌بندی');
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
CREATE OR ALTER PROCEDURE TahghighatV2.SP_ReplaceInvestigatorSummaryImage
    @AssignmentId bigint,
    @Scope varchar(10),                -- OSTAN | HOZE | COUNTY
    @UserId bigint,
    @ExpectedAttachmentIds nvarchar(1000),
    @OriginalFileName nvarchar(255),
    @MimeType nvarchar(100),
    @FileData varbinary(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @AssignmentId IS NULL OR @AssignmentId<=0 OR @UserId IS NULL OR @UserId<=0
       OR @Scope NOT IN ('OSTAN','HOZE','COUNTY') OR @Scope IS NULL
        THROW 56701,N'شناسه انتساب، کاربر یا محدوده معتبر نیست.',1;
    IF @ExpectedAttachmentIds IS NULL OR LEN(@ExpectedAttachmentIds)>1000
        THROW 56702,N'فهرست اسناد پیشین معتبر نیست.',1;
    IF @OriginalFileName IS NULL OR @OriginalFileName NOT LIKE N'JambandiMohaghegh[_]%.%'
       OR LEN(@OriginalFileName)>255 OR CHARINDEX(N'/',@OriginalFileName)>0
       OR CHARINDEX(N'\',@OriginalFileName)>0
       OR DATALENGTH(@FileData) NOT BETWEEN 1 AND 3145728
       OR NOT ((@MimeType=N'image/png' AND SUBSTRING(@FileData,1,8)=0x89504E470D0A1A0A)
             OR (@MimeType=N'image/jpeg' AND SUBSTRING(@FileData,1,3)=0xFFD8FF))
        THROW 56703,N'تصویر جدید جمع‌بندی معتبر نیست.',1;

    DECLARE @Expected TABLE (AttachmentId uniqueidentifier PRIMARY KEY);
    IF LEN(@ExpectedAttachmentIds)>0
    BEGIN
        IF EXISTS(SELECT 1 FROM STRING_SPLIT(@ExpectedAttachmentIds,N',')
                  WHERE TRY_CONVERT(uniqueidentifier,value) IS NULL OR LTRIM(RTRIM(value))=N'')
            THROW 56704,N'فهرست شناسه پیوست‌ها نامعتبر است.',1;
        IF (SELECT COUNT(*) FROM STRING_SPLIT(@ExpectedAttachmentIds,N','))>20
            THROW 56704,N'تعداد اسناد پیشین نامعتبر است.',1;
        BEGIN TRY
            INSERT @Expected(AttachmentId)
            SELECT CONVERT(uniqueidentifier,value) FROM STRING_SPLIT(@ExpectedAttachmentIds,N',');
        END TRY BEGIN CATCH
            THROW 56704,N'شناسه تکراری یا نامعتبر در فهرست پیوست‌ها وجود دارد.',1;
        END CATCH;
    END;

    DECLARE @CaseId bigint,@Number bigint,@PersonId bigint,@ReferralId bigint,
            @RootId bigint,@CanWrite bit,@InvestigatorKey bigint,@InvestigatorPersonId bigint,
            @InvestigatorLegacyCode bigint,@Lock int,@FileId uniqueidentifier=NEWID();
    DECLARE @Access TABLE (
      CaseId bigint,ShomarehParvandeh bigint,PersonId bigint NULL,
      ReferralId bigint,AssignmentId bigint NULL,RootReferralId bigint,
      CanRead bit,CanWrite bit
    );

    BEGIN TRY
      BEGIN TRANSACTION;
      -- The same access checks used for normal attachment uploads apply here.
      -- A client-provided role or level never grants permissions by itself.
      IF @Scope='OSTAN'
      BEGIN
        SELECT TOP(1) @CaseId=sc.CaseId,@Number=sc.ShomarehParvandeh,
          @PersonId=sc.CasePersonId,@ReferralId=sc.ReferralId,
          @RootId=sc.RootReferralId,@InvestigatorKey=sc.InvestigatorKey,
          @InvestigatorPersonId=sc.InvestigatorPersonId,
          @InvestigatorLegacyCode=sc.InvestigatorLegacyCode
        FROM TahghighatV2.fn_ProvinceInvestigatorDocumentScope
          ('RESEARCH_ASSIGNMENT',@AssignmentId,@UserId) sc
        JOIN TahghighatV2.Referral r ON r.ReferralId=sc.ReferralId
        WHERE sc.CanWrite=1 AND sc.AssignmentId=@AssignmentId AND r.ReceiverLevel='OSTAN';
      END
      ELSE
      BEGIN
        INSERT @Access
        EXEC TahghighatV2.SP_UnifiedAttachmentTargetAccess
             'RESEARCH_ASSIGNMENT',@AssignmentId,@UserId;
        SELECT TOP(1) @CaseId=sc.CaseId,@Number=sc.ShomarehParvandeh,
          @PersonId=sc.PersonId,@ReferralId=sc.ReferralId,@RootId=sc.RootReferralId
        FROM @Access sc
        JOIN TahghighatV2.Referral r ON r.ReferralId=sc.ReferralId
        WHERE sc.AssignmentId=@AssignmentId AND sc.CanWrite=1
          AND r.ReceiverLevel=CASE WHEN @Scope='HOZE' THEN 'HOZE' ELSE 'SHAHR' END;
      END;
      IF @CaseId IS NULL OR @RootId IS NULL OR @ReferralId IS NULL
        THROW 56705,N'مجوز جایگزینی تصویر جمع‌بندی در این انتساب وجود ندارد.',1;
      -- Province persists the text in InvestigatorSummary; HOZE/COUNTY
      -- persist it in ResearchAssignment.Summary. Validate the authoritative
      -- text store for the given scope, without requiring a prior image.
      IF (
           (@Scope='OSTAN' AND NOT EXISTS (
             SELECT 1 FROM TahghighatV2.InvestigatorSummary s WITH (HOLDLOCK)
             WHERE s.AssignmentId=@AssignmentId
               AND NULLIF(LTRIM(RTRIM(s.SummaryText)),N'') IS NOT NULL
           ))
           OR
           (@Scope IN ('HOZE','COUNTY') AND NOT EXISTS (
             SELECT 1 FROM TahghighatV2.ResearchAssignment a WITH (HOLDLOCK)
             WHERE a.AssignmentId=@AssignmentId
               AND LEN(LTRIM(RTRIM(ISNULL(a.Summary,N''))))>=50
           ))
         )
        THROW 56706,N'ابتدا متن جمع‌بندی محقق را ثبت کنید.',1;

      DECLARE @Resource nvarchar(255)=N'MRV2:REF:'+CONVERT(nvarchar(25),@RootId);
      EXEC @Lock=sys.sp_getapplock @Resource=@Resource,
          @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
      IF @Lock<0 THROW 56707,N'پرونده همزمان در حال پردازش است.',1;

      -- Re-check permission after serializing the whole referral tree.
      SET @CanWrite=0;
      IF @Scope='OSTAN'
      BEGIN
        IF EXISTS(SELECT 1 FROM TahghighatV2.fn_ProvinceInvestigatorDocumentScope
                   ('RESEARCH_ASSIGNMENT',@AssignmentId,@UserId) sc
                  WHERE sc.CanWrite=1 AND sc.CaseId=@CaseId AND sc.ReferralId=@ReferralId
                    AND sc.AssignmentId=@AssignmentId)
            SET @CanWrite=1;
      END
      ELSE
      BEGIN
        DELETE FROM @Access;
        INSERT @Access EXEC TahghighatV2.SP_UnifiedAttachmentTargetAccess
            'RESEARCH_ASSIGNMENT',@AssignmentId,@UserId;
        IF EXISTS(SELECT 1 FROM @Access
                  WHERE CanWrite=1 AND CaseId=@CaseId AND ReferralId=@ReferralId
                    AND AssignmentId=@AssignmentId) SET @CanWrite=1;
      END;
      IF @CanWrite<>1 THROW 56708,N'دسترسی ویرایش پیوست دیگر معتبر نیست.',1;

      DECLARE @FileResource nvarchar(255)=N'MRV2:FILE:RESEARCH_ASSIGNMENT:'+CONVERT(nvarchar(25),@AssignmentId);
      EXEC @Lock=sys.sp_getapplock @Resource=@FileResource,
          @LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
      IF @Lock<0 THROW 56709,N'اسناد همزمان در حال تغییر هستند.',1;

      -- Confirm that the user approved exactly the current document set.
      DECLARE @ExistingCount int;
      SELECT @ExistingCount=COUNT(*)
      FROM MeratFilesDB.dbo.TahghighatDocument WITH(UPDLOCK,HOLDLOCK)
      WHERE TargetEntity='RESEARCH_ASSIGNMENT' AND TargetRecordId=@AssignmentId AND IsDeleted=0 AND AttachmentKind='SUMMARY' AND SummaryLevel='INVESTIGATOR';
      IF @ExistingCount<>(SELECT COUNT(*) FROM @Expected)
         OR EXISTS(
           SELECT 1 FROM MeratFilesDB.dbo.TahghighatDocument d
           WHERE d.TargetEntity='RESEARCH_ASSIGNMENT' AND d.TargetRecordId=@AssignmentId
             AND d.IsDeleted=0 AND d.AttachmentKind='SUMMARY' AND d.SummaryLevel='INVESTIGATOR'
             AND NOT EXISTS(SELECT 1 FROM @Expected e WHERE e.AttachmentId=d.AttachmentId)
         )
        THROW 56710,N'فهرست تصاویر جمع‌بندی تغییر کرده است؛ صفحه را تازه‌سازی کرده و مجدد تأیید کنید.',1;

      UPDATE MeratFilesDB.dbo.TahghighatDocument
       SET IsDeleted=1,DeletedByUserId=@UserId,DeletedAtUtc=SYSUTCDATETIME(),
           DeleteReason=N'جایگزینی تصویر جمع‌بندی محقق با تأیید کاربر'
       WHERE TargetEntity='RESEARCH_ASSIGNMENT' AND TargetRecordId=@AssignmentId AND IsDeleted=0 AND AttachmentKind='SUMMARY' AND SummaryLevel='INVESTIGATOR';

      INSERT MeratFilesDB.dbo.TahghighatDocument
       (AttachmentId,CaseId,ShomarehParvandeh,PersonId,ReferralId,AssignmentId,
        AttachmentKind,SummaryLevel,TargetEntity,TargetRecordId,OriginalFileName,
        MimeType,FileSizeBytes,Sha256,FileData,CreatedByUserId,
        InvestigatorKey,InvestigatorPersonId,InvestigatorLegacyCode)
      VALUES
       (@FileId,@CaseId,@Number,@PersonId,@ReferralId,@AssignmentId,
        'SUMMARY','INVESTIGATOR','RESEARCH_ASSIGNMENT',@AssignmentId,
        @OriginalFileName,@MimeType,DATALENGTH(@FileData),
        CONVERT(binary(32),HASHBYTES('SHA2_256',@FileData)),@FileData,@UserId,
        @InvestigatorKey,@InvestigatorPersonId,@InvestigatorLegacyCode);

      -- County only: finishing the official summary image closes the
      -- investigator assignment in the same transaction as the image insert.
      -- Saving a draft text alone does not complete the assignment.
      IF @Scope IN ('COUNTY','HOZE')
      BEGIN
        DECLARE @CountyStatus varchar(20),@CountyState varchar(40);
        SELECT @CountyStatus=a.StatusCode,@CountyState=r.StateCode
        FROM TahghighatV2.ResearchAssignment a WITH (UPDLOCK,HOLDLOCK)
        JOIN TahghighatV2.Referral r ON r.ReferralId=a.ReferralId
        WHERE a.AssignmentId=@AssignmentId AND a.ReferralId=@ReferralId
          AND r.ReceiverLevel=CASE WHEN @Scope='HOZE' THEN 'HOZE' ELSE 'SHAHR' END AND r.IsDeleted=0 AND r.IsClosed=0;
        IF @CountyStatus IS NULL OR @CountyState<>'CHILD_WORKING'
          THROW 56711,N'وضعیت پرونده برای تکمیل محقق مجاز نیست.',1;
        IF @CountyStatus='IN_PROGRESS'
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM TahghighatV2.ResearchWorksheet w
                         WHERE w.AssignmentId=@AssignmentId)
            THROW 56712,N'ثبت حداقل یک کاربرگ پیش از تکمیل جمع‌بندی الزامی است.',1;
          UPDATE TahghighatV2.ResearchAssignment
             SET StatusCode='DONE',FinishedAtUtc=SYSUTCDATETIME()
           WHERE AssignmentId=@AssignmentId AND StatusCode='IN_PROGRESS';
          IF @@ROWCOUNT<>1 THROW 56713,N'وضعیت تحقیق همزمان تغییر کرده است.',1;
          INSERT TahghighatV2.ResearchAssignmentEvent
            (AssignmentId,ActionCode,BeforeStatus,AfterStatus,Description,ActorUserId)
          VALUES (@AssignmentId,CASE WHEN @Scope='HOZE' THEN 'HOZE_OFFICER_COMPLETE_ASSIGNMENT' ELSE 'COUNTY_OFFICER_COMPLETE_ASSIGNMENT' END,
                  'IN_PROGRESS','DONE',N'تکمیل خودکار پس از ثبت تصویر نهایی جمع‌بندی محقق',@UserId);
          INSERT TahghighatV2.WorkflowEvent
            (ReferralId,ActionCode,PreviousStateCode,NewStateCode,Description,ActorUserId)
          VALUES (@ReferralId,CASE WHEN @Scope='HOZE' THEN 'HOZE_OFFICER_COMPLETE_ASSIGNMENT' ELSE 'COUNTY_OFFICER_COMPLETE_ASSIGNMENT' END,
                  'CHILD_WORKING','CHILD_WORKING',N'تکمیل محقق با تصویر جمع‌بندی',@UserId);
        END
        ELSE IF @CountyStatus<>'DONE'
          THROW 56714,N'انتساب محقق در وضعیت قابل جمع‌بندی نهایی نیست.',1;
      END;


      -- Province: approve the assignment together with the final summary image.
      -- A text-only draft is NOT final. All changes share the image transaction.
      IF @Scope='OSTAN'
      BEGIN
        DECLARE @ProvinceBefore varchar(20), @ProvinceSummary nvarchar(max);
        SELECT @ProvinceBefore=a.StatusCode, @ProvinceSummary=s.SummaryText
        FROM TahghighatV2.ResearchAssignment a WITH (UPDLOCK,HOLDLOCK)
        JOIN TahghighatV2.Referral r ON r.ReferralId=a.ReferralId
        JOIN TahghighatV2.InvestigatorSummary s ON s.AssignmentId=a.AssignmentId
        WHERE a.AssignmentId=@AssignmentId AND a.ReferralId=@ReferralId
          AND r.ReceiverLevel='OSTAN' AND r.IsDeleted=0 AND r.IsClosed=0;
        IF @ProvinceBefore IS NULL OR @ProvinceBefore NOT IN ('PENDING','IN_PROGRESS')
          THROW 56715,N'انتساب محقق استان در وضعیت قابل تکمیل نیست.',1;
        IF LEN(LTRIM(RTRIM(ISNULL(@ProvinceSummary,N''))))<50
          THROW 56716,N'ابتدا متن معتبر جمع‌بندی محقق استان را ثبت کنید.',1;
        IF NOT EXISTS (
          SELECT 1 FROM TahghighatV2.ResearchWorksheet w
          WHERE w.AssignmentId=@AssignmentId
            AND NULLIF(LTRIM(RTRIM(w.ReportText)),N'') IS NOT NULL
        ) THROW 56717,N'پیش از ثبت نهایی جمع‌بندی، دست‌کم یک کاربرگ معتبر لازم است.',1;

        UPDATE TahghighatV2.ResearchAssignment
        SET StatusCode='DONE',Summary=@ProvinceSummary,FinishedAtUtc=SYSUTCDATETIME()
        WHERE AssignmentId=@AssignmentId AND StatusCode=@ProvinceBefore;
        IF @@ROWCOUNT<>1 THROW 56718,N'وضعیت انتساب در زمان ذخیره تصویر تغییر کرده است.',1;
        INSERT TahghighatV2.ResearchAssignmentEvent
          (AssignmentId,ActionCode,BeforeStatus,AfterStatus,Description,ActorUserId)
        VALUES (@AssignmentId,'PROVINCE_AUTO_SUMMARY_COMPLETE',@ProvinceBefore,'DONE',
                N'تکمیل خودکار تحقیق استان پس از ثبت متن و تصویر نهایی جمع‌بندی',@UserId);
        INSERT TahghighatV2.WorkflowEvent
          (ReferralId,ActionCode,PreviousStateCode,NewStateCode,Description,ActorUserId)
        SELECT r.ReferralId,'PROVINCE_AUTO_SUMMARY_COMPLETE',r.StateCode,r.StateCode,
               N'ثبت تصویر جمع‌بندی و پایان مأموریت محقق ویژه استان',@UserId
        FROM TahghighatV2.Referral r WHERE r.ReferralId=@ReferralId;
      END;

      COMMIT TRANSACTION;
      SELECT CONVERT(bit,1) AS IsSuccess,@FileId AS AttachmentId,
             @ExistingCount AS ReplacedCount;
    END TRY
    BEGIN CATCH
      IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
      THROW;
    END CATCH;
END;
GO

-- Repair existing finalized provincial summaries that were still counted as pending.
-- Only records with a valid saved text + a substantive worksheet + an active final
-- summary image are updated. Text drafts alone and cancelled assignments are excluded.
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @Done159 TABLE (
      AssignmentId bigint NOT NULL PRIMARY KEY,
      ReferralId bigint NOT NULL,
      BeforeStatus varchar(20) NOT NULL,
      ActorUserId bigint NOT NULL
  );
  UPDATE a
     SET StatusCode='DONE',Summary=s.SummaryText,
         FinishedAtUtc=COALESCE(a.FinishedAtUtc,SYSUTCDATETIME())
  OUTPUT inserted.AssignmentId,inserted.ReferralId,deleted.StatusCode,
         deleted.CreatedByUserId
  INTO @Done159(AssignmentId,ReferralId,BeforeStatus,ActorUserId)
  FROM TahghighatV2.ResearchAssignment a
  JOIN TahghighatV2.Referral r ON r.ReferralId=a.ReferralId
       AND r.ReceiverLevel='OSTAN' AND r.IsDeleted=0 AND r.IsClosed=0
  JOIN TahghighatV2.InvestigatorSummary s ON s.AssignmentId=a.AssignmentId
  WHERE a.StatusCode IN ('PENDING','IN_PROGRESS')
    AND LEN(LTRIM(RTRIM(ISNULL(s.SummaryText,N''))))>=50
    AND EXISTS(SELECT 1 FROM TahghighatV2.ResearchWorksheet w
               WHERE w.AssignmentId=a.AssignmentId
                 AND NULLIF(LTRIM(RTRIM(w.ReportText)),N'') IS NOT NULL)
    AND EXISTS(SELECT 1 FROM MeratFilesDB.dbo.TahghighatDocument d
               WHERE d.TargetEntity='RESEARCH_ASSIGNMENT'
                 AND d.TargetRecordId=a.AssignmentId AND d.CaseId=r.CaseId
                 AND d.ReferralId=r.ReferralId AND d.IsDeleted=0
                 AND d.AttachmentKind='SUMMARY' AND d.SummaryLevel='INVESTIGATOR'
                 AND d.MimeType IN (N'image/png',N'image/jpeg'));

  INSERT TahghighatV2.ResearchAssignmentEvent
    (AssignmentId,ActionCode,BeforeStatus,AfterStatus,Description,ActorUserId)
  SELECT AssignmentId,'PROVINCE_AUTO_SUMMARY_COMPLETE',BeforeStatus,'DONE',
         N'اصلاح وضعیت محقق استان بر اساس متن و تصویر نهایی قبلاً ثبت‌شده',ActorUserId
  FROM @Done159;

  INSERT TahghighatV2.WorkflowEvent
    (ReferralId,ActionCode,PreviousStateCode,NewStateCode,Description,ActorUserId)
  SELECT x.ReferralId,'PROVINCE_AUTO_SUMMARY_COMPLETE',r.StateCode,r.StateCode,
         N'تطبیق مأموریت محقق استان با جمع‌بندی نهایی موجود',x.ActorUserId
  FROM @Done159 x JOIN TahghighatV2.Referral r ON r.ReferralId=x.ReferralId;

  SELECT x.AssignmentId,x.ReferralId,x.BeforeStatus,
         'DONE' AS AfterStatus
  FROM @Done159 x ORDER BY x.AssignmentId;
  SELECT COUNT(*) AS ReconciledAssignments FROM @Done159;
  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO

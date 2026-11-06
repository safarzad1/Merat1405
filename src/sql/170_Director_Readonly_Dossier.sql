/* Merat phase 170 — read-only dossier for provincial office director (post 50).
   Run in MeratDB. No research records, referrals, images or historical data are deleted.
   Requires the MeratFilesDB file table and province V2 tables installed. */
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID(N'TahghighatV2.Referral',N'U') IS NULL
  OR OBJECT_ID(N'TahghighatV2.ResearchAssignment',N'U') IS NULL
  OR OBJECT_ID(N'TahghighatV2.ResearchWorksheet',N'U') IS NULL
  OR OBJECT_ID(N'TahghighatV2.ProvinceSummary',N'U') IS NULL
  OR OBJECT_ID(N'TahghighatV2.CountyReplyReport',N'U') IS NULL
  OR OBJECT_ID(N'MeratFilesDB.dbo.TahghighatDocument',N'U') IS NULL
  THROW 57001,N'ساختار تحقیقات V2 یا پایگاه اسناد MeratFilesDB کامل نیست.',1;
GO
CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetDirectorReviewDossier
  @ReferralId bigint, @UserId bigint
AS
BEGIN
  SET NOCOUNT ON;
  IF ISNULL(@ReferralId,0)<=0 OR ISNULL(@UserId,0)<=0
    THROW 57002,N'شناسه پرونده یا کاربر معتبر نیست.',1;
  IF NOT EXISTS (
    SELECT 1 FROM dbo.Users u
    JOIN TahghighatV2.Referral r ON r.ReferralId=@ReferralId
      AND r.ToMahal=u.Mahal AND r.ReceiverLevel='OSTAN' AND r.ParentReferralId IS NULL
      AND r.IsDeleted=0 AND r.StateCode IN('DIRECTOR_REVIEW','SETAD_REVIEW','PROVINCE_RETURNED')
    WHERE u.UserId=@UserId AND u.IsActive=1 AND u.PostId=50
  ) THROW 57003,N'دسترسی به پرونده برای رئیس دفتر این استان مجاز نیست.',1;

  DECLARE @CaseId bigint=(SELECT CaseId FROM TahghighatV2.Referral WHERE ReferralId=@ReferralId);
  DECLARE @Scope TABLE(ReferralId bigint NOT NULL PRIMARY KEY,ParentReferralId bigint NULL,
    ReceiverLevel varchar(20) NOT NULL,ToMahal int NOT NULL,StateCode varchar(40) NOT NULL,
    IsClosed bit NOT NULL,Depth int NOT NULL);
  ;WITH Tree AS (
    SELECT r.ReferralId,r.ParentReferralId,r.ReceiverLevel,r.ToMahal,r.StateCode,
      r.IsClosed,CAST(0 AS int) AS Depth,r.CaseId
    FROM TahghighatV2.Referral r
    WHERE r.ReferralId=@ReferralId AND r.IsDeleted=0
    UNION ALL
    SELECT r.ReferralId,r.ParentReferralId,r.ReceiverLevel,r.ToMahal,r.StateCode,
      r.IsClosed,t.Depth+1,r.CaseId
    FROM TahghighatV2.Referral r
    JOIN Tree t ON t.ReferralId=r.ParentReferralId AND t.CaseId=r.CaseId
    WHERE r.IsDeleted=0 AND t.Depth<20
  )
  INSERT INTO @Scope(ReferralId,ParentReferralId,ReceiverLevel,ToMahal,StateCode,IsClosed,Depth)
  SELECT ReferralId,ParentReferralId,ReceiverLevel,ToMahal,StateCode,IsClosed,Depth FROM Tree
  OPTION(MAXRECURSION 21);

  SELECT @ReferralId AS ReferralId, @CaseId AS CaseId,
    cf.ShomarehParvandeh, root.StateCode,
    ps.SummaryText AS ProvinceSummaryText,ps.FormDataJson AS ProvinceFormDataJson,
    CONVERT(bit,ISNULL(ps.IsFormFinalized,0)) AS IsFormFinalized,
    (SELECT s.ReferralId,s.ParentReferralId,s.ReceiverLevel,s.Depth,s.StateCode,s.IsClosed,
       city.Name AS DestinationName,r.Description AS ReferralDescription,
       hs.SummaryText AS HozeSummaryText, p2.SummaryText AS ProvinceSummaryText,
       COALESCE(NULLIF(LTRIM(RTRIM(cr.ReportText)),N''),cs.SummaryText) AS CountyReplyText,
       nr.Reason AS NoResearchReason
     FROM @Scope s
     JOIN TahghighatV2.Referral r ON r.ReferralId=s.ReferralId
     LEFT JOIN dbo.Citys city ON city.CityId=s.ToMahal
     LEFT JOIN TahghighatV2.HozeSummary hs ON hs.ReferralId=s.ReferralId
     LEFT JOIN TahghighatV2.ProvinceSummary p2 ON p2.ReferralId=s.ReferralId
     LEFT JOIN TahghighatV2.CountySummary cs ON cs.ReferralId=s.ReferralId
     LEFT JOIN TahghighatV2.CountyReplyReport cr ON cr.CountyReferralId=s.ReferralId
     OUTER APPLY (SELECT TOP(1) d.Reason FROM TahghighatV2.NoResearchDecision d
       WHERE d.ReferralId=s.ReferralId ORDER BY d.DecisionId DESC) nr
     ORDER BY s.Depth,s.ReferralId FOR JSON PATH,INCLUDE_NULL_VALUES) AS ReferralsJson,
    (SELECT a.AssignmentId,a.ReferralId,a.StatusCode,a.Instruction,a.DueDatePersian,a.FinishedAtUtc,
       COALESCE(NULLIF(LTRIM(RTRIM(ins.SummaryText)),N''),a.Summary) AS Summary,
       COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(person.FirstName,N' ',person.LastName))),N''),N'محقق ثبت‌شده') AS FullName,
       (SELECT COUNT_BIG(*) FROM TahghighatV2.ResearchWorksheet w WHERE w.AssignmentId=a.AssignmentId) AS WorksheetCount
     FROM TahghighatV2.ResearchAssignment a
     JOIN @Scope s ON s.ReferralId=a.ReferralId
     LEFT JOIN TahghighatV2.InvestigatorRegistry ir ON ir.InvestigatorKey=a.InvestigatorId
     LEFT JOIN dbo.Person person ON person.PersonId=ir.PersonId
     LEFT JOIN TahghighatV2.InvestigatorSummary ins ON ins.AssignmentId=a.AssignmentId
     WHERE a.StatusCode<>'CANCELLED'
     ORDER BY a.ReferralId,a.AssignmentId FOR JSON PATH,INCLUDE_NULL_VALUES) AS AssignmentsJson,
    (SELECT w.WorksheetId,w.AssignmentId,a.ReferralId,w.ReportText,
       wd.TahghighType,wd.TypeMahalTahghigh,wd.AzSal,wd.TaSal,wd.NahveAshnai,
       wd.NoeParvandeh,wd.NahveBazkhani,wd.NameSazman,wd.NameShahr,wd.PeyvastCount,wd.Description
     FROM TahghighatV2.ResearchWorksheet w
     JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId=w.AssignmentId
     JOIN @Scope s ON s.ReferralId=a.ReferralId
     LEFT JOIN TahghighatV2.ResearchWorksheetDetails wd ON wd.WorksheetId=w.WorksheetId
     WHERE a.StatusCode<>'CANCELLED'
     ORDER BY a.ReferralId,w.WorksheetId FOR JSON PATH,INCLUDE_NULL_VALUES) AS WorksheetsJson,
    (SELECT f.AttachmentId,f.ReferralId,f.TargetEntity,f.TargetRecordId,
       f.AttachmentKind,f.SummaryLevel,f.OriginalFileName,f.MimeType,f.FileSizeBytes,
       f.CreatedAtUtc,CAST(NULL AS nvarchar(1500)) AS AttachmentDescription
     FROM MeratFilesDB.dbo.TahghighatDocument f
     JOIN @Scope s ON s.ReferralId=f.ReferralId
     WHERE f.IsDeleted=0 AND f.CaseId=@CaseId AND
       ((f.TargetEntity='RESEARCH_ASSIGNMENT' AND EXISTS (
           SELECT 1 FROM TahghighatV2.ResearchAssignment a
           WHERE a.AssignmentId=f.TargetRecordId AND a.ReferralId=s.ReferralId AND a.StatusCode<>'CANCELLED'))
        OR (f.TargetEntity='RESEARCH_WORKSHEET' AND EXISTS (
           SELECT 1 FROM TahghighatV2.ResearchWorksheet w
           JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId=w.AssignmentId
           WHERE w.WorksheetId=f.TargetRecordId AND a.ReferralId=s.ReferralId AND a.StatusCode<>'CANCELLED'))
        OR (f.TargetEntity='HOZE_SUMMARY' AND EXISTS (
           SELECT 1 FROM TahghighatV2.HozeSummary h WHERE h.SummaryId=f.TargetRecordId AND h.ReferralId=s.ReferralId))
        OR (f.TargetEntity='PROVINCE_SUMMARY' AND EXISTS (
           SELECT 1 FROM TahghighatV2.ProvinceSummary p WHERE p.SummaryId=f.TargetRecordId AND p.ReferralId=s.ReferralId))
        OR (f.TargetEntity='COUNTY_SUMMARY' AND EXISTS (
           SELECT 1 FROM TahghighatV2.CountySummary c WHERE c.SummaryId=f.TargetRecordId AND c.ReferralId=s.ReferralId))
        OR (f.TargetEntity='COUNTY_REPLY_EVENT' AND s.ReceiverLevel='SHAHR'))
     ORDER BY s.Depth,f.ReferralId,f.CreatedAtUtc,f.OriginalFileName,f.AttachmentId
     FOR JSON PATH,INCLUDE_NULL_VALUES) AS DocumentsJson
  FROM TahghighatV2.Referral root
  JOIN TahghighatV2.CaseFile cf ON cf.CaseId=root.CaseId
  LEFT JOIN TahghighatV2.ProvinceSummary ps ON ps.ReferralId=root.ReferralId
  WHERE root.ReferralId=@ReferralId;
END;
GO
CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetDirectorReviewDossierFile
  @ReferralId bigint,@AttachmentId uniqueidentifier,@UserId bigint
AS
BEGIN
  SET NOCOUNT ON;
  IF ISNULL(@ReferralId,0)<=0 OR @AttachmentId IS NULL OR ISNULL(@UserId,0)<=0
    THROW 57004,N'شناسه سند، ارجاع یا کاربر نامعتبر است.',1;
  IF NOT EXISTS(
    SELECT 1 FROM dbo.Users u
    JOIN TahghighatV2.Referral r ON r.ReferralId=@ReferralId
      AND r.ToMahal=u.Mahal AND r.ReceiverLevel='OSTAN' AND r.ParentReferralId IS NULL
      AND r.IsDeleted=0 AND r.StateCode IN('DIRECTOR_REVIEW','SETAD_REVIEW','PROVINCE_RETURNED')
    WHERE u.UserId=@UserId AND u.IsActive=1 AND u.PostId=50
  ) THROW 57005,N'مجوز مشاهده سند این پرونده وجود ندارد.',1;
  DECLARE @Scope TABLE(ReferralId bigint NOT NULL PRIMARY KEY);
  ;WITH Tree AS (
    SELECT r.ReferralId,r.CaseId,CAST(0 AS int) AS Depth
    FROM TahghighatV2.Referral r WHERE r.ReferralId=@ReferralId AND r.IsDeleted=0
    UNION ALL
    SELECT r.ReferralId,r.CaseId,t.Depth+1
    FROM TahghighatV2.Referral r
    JOIN Tree t ON t.ReferralId=r.ParentReferralId AND t.CaseId=r.CaseId
    WHERE r.IsDeleted=0 AND t.Depth<20
  )
  INSERT INTO @Scope(ReferralId) SELECT ReferralId FROM Tree OPTION(MAXRECURSION 21);
  SELECT f.AttachmentId,f.OriginalFileName,f.MimeType,f.FileSizeBytes,f.FileData
  FROM MeratFilesDB.dbo.TahghighatDocument f
  JOIN @Scope s ON s.ReferralId=f.ReferralId
  JOIN TahghighatV2.Referral r ON r.ReferralId=s.ReferralId AND r.CaseId=f.CaseId
  WHERE f.AttachmentId=@AttachmentId AND f.IsDeleted=0
    AND f.MimeType IN('image/png','image/jpeg','image/webp','application/pdf')
    AND ((f.TargetEntity='RESEARCH_ASSIGNMENT' AND EXISTS (
       SELECT 1 FROM TahghighatV2.ResearchAssignment a
       WHERE a.AssignmentId=f.TargetRecordId AND a.ReferralId=s.ReferralId AND a.StatusCode<>'CANCELLED'))
      OR (f.TargetEntity='RESEARCH_WORKSHEET' AND EXISTS (
       SELECT 1 FROM TahghighatV2.ResearchWorksheet w
       JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId=w.AssignmentId
       WHERE w.WorksheetId=f.TargetRecordId AND a.ReferralId=s.ReferralId AND a.StatusCode<>'CANCELLED'))
      OR (f.TargetEntity='HOZE_SUMMARY' AND EXISTS (
       SELECT 1 FROM TahghighatV2.HozeSummary h WHERE h.SummaryId=f.TargetRecordId AND h.ReferralId=s.ReferralId))
      OR (f.TargetEntity='PROVINCE_SUMMARY' AND EXISTS (
       SELECT 1 FROM TahghighatV2.ProvinceSummary p WHERE p.SummaryId=f.TargetRecordId AND p.ReferralId=s.ReferralId))
      OR (f.TargetEntity='COUNTY_SUMMARY' AND EXISTS (
       SELECT 1 FROM TahghighatV2.CountySummary c WHERE c.SummaryId=f.TargetRecordId AND c.ReferralId=s.ReferralId))
      OR (f.TargetEntity='COUNTY_REPLY_EVENT' AND r.ReceiverLevel='SHAHR'));
END;
GO
-- Keep the phase-169 private profile signature table available in a single SQL delivery.
IF OBJECT_ID(N'dbo.UserSignature',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserSignature(
    UserId bigint NOT NULL CONSTRAINT PK_UserSignature PRIMARY KEY,
    SignaturePng varbinary(max) NOT NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_UserSignature_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_UserSignature_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_UserSignature_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_UserSignature_ImageSize CHECK(DATALENGTH(SignaturePng) BETWEEN 45 AND 524288)
  );
END;
GO
-- Existing director action procedure handles the transition; these grants are idempotent.
IF OBJECT_ID(N'TahghighatV2.PostActionPermission',N'U') IS NOT NULL
BEGIN
  UPDATE TahghighatV2.PostActionPermission SET IsAllowed=1
  WHERE PostId=50 AND ActionCode IN('DIRECTOR_APPROVE','RETURN_PROVINCE') AND IsAllowed=0;
  INSERT INTO TahghighatV2.PostActionPermission(PostId,ActionCode,IsAllowed)
  SELECT v.PostId,v.ActionCode,1 FROM (VALUES (50,'DIRECTOR_APPROVE'),(50,'RETURN_PROVINCE'))v(PostId,ActionCode)
  WHERE NOT EXISTS(SELECT 1 FROM TahghighatV2.PostActionPermission p WHERE p.PostId=v.PostId AND p.ActionCode=v.ActionCode);
END;
GO
IF OBJECT_ID(N'TahghighatV2.ActionTransition',N'U') IS NOT NULL
BEGIN
  INSERT INTO TahghighatV2.ActionTransition(FromStateCode,ActionCode,ToStateCode)
  SELECT v.FromStateCode,v.ActionCode,v.ToStateCode
  FROM (VALUES ('DIRECTOR_REVIEW','DIRECTOR_APPROVE','SETAD_REVIEW'),
               ('DIRECTOR_REVIEW','RETURN_PROVINCE','PROVINCE_RETURNED'))v(FromStateCode,ActionCode,ToStateCode)
  WHERE NOT EXISTS(SELECT 1 FROM TahghighatV2.ActionTransition t
    WHERE t.FromStateCode=v.FromStateCode AND t.ActionCode=v.ActionCode AND t.ToStateCode=v.ToStateCode);
END;
GO
SELECT OBJECT_NAME(OBJECT_ID(N'TahghighatV2.SP_GetDirectorReviewDossier')) AS DossierProcedure,
       OBJECT_NAME(OBJECT_ID(N'TahghighatV2.SP_GetDirectorReviewDossierFile')) AS FileProcedure;
GO

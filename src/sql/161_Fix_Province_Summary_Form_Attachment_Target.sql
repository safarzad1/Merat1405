/* Merat 161 — Province official summary attachment target and file-schema compatibility.
   Based on actual route ProvinceSummaryAttachmentTarget and database scripts.
   No record deletion or changes to the stored summary answers.
   Run in SSMS against the SAME MeratDB used by Next.js. */
USE [MeratDB];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
IF DB_ID(N'MeratFilesDB') IS NULL
    THROW 56160, N'MeratFilesDB database was not found on this SQL Server.', 1;
IF OBJECT_ID(N'TahghighatV2.ProvinceSummary', N'U') IS NULL
    THROW 56161, N'ProvinceSummary table is missing in MeratDB.', 1;
IF OBJECT_ID(N'MeratFilesDB.dbo.TahghighatDocument', N'U') IS NULL
    THROW 56162, N'TahghighatDocument table is missing in MeratFilesDB.', 1;
GO
-- Earlier MeratFilesDB dumps did not contain AttachmentDescription, while
-- the existing attachment listing procedures already select that column.
IF COL_LENGTH(N'MeratFilesDB.dbo.TahghighatDocument', N'AttachmentDescription') IS NULL
BEGIN
    EXEC(N'ALTER TABLE [MeratFilesDB].[dbo].[TahghighatDocument]
                ADD [AttachmentDescription] NVARCHAR(1000) NULL;');
END;
GO
-- Required by GET /Api/TahghighV2/ProvinceSummaryAttachmentTarget.
-- No guessed IDs or client-controlled permissions: derive both on the server.
CREATE OR ALTER PROCEDURE [TahghighatV2].[SP_GetProvinceSummaryAttachmentTarget]
    @ReferralId BIGINT,
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF @ReferralId IS NULL OR @ReferralId <= 0 OR @UserId IS NULL OR @UserId <= 0
        THROW 56163, N'شناسه ارجاع یا کاربر معتبر نیست.', 1;

    DECLARE @UserMahal INT, @PostId INT;
    SELECT @UserMahal = u.Mahal, @PostId = u.PostId
    FROM dbo.Users AS u
    WHERE u.UserId = @UserId AND u.IsActive = 1;

    IF @PostId NOT IN (51, 52) OR @UserMahal IS NULL
        THROW 56164, N'مجوز مشاهده جمع‌بندی استان وجود ندارد.', 1;

    IF NOT EXISTS
    (
        SELECT 1 FROM TahghighatV2.Referral r
        WHERE r.ReferralId = @ReferralId
          AND r.ReceiverLevel = 'OSTAN'
          AND r.ToMahal = @UserMahal
          AND r.IsDeleted = 0
    )
        THROW 56165, N'ارجاع استان در محدوده کاربر یافت نشد.', 1;

    -- Return the exact authorization used by the document upload/listing
    -- procedures, so the UI never claims it can upload when SQL will reject it.
    DECLARE @SummaryId BIGINT;
    SELECT @SummaryId = s.SummaryId
    FROM TahghighatV2.ProvinceSummary s
    JOIN TahghighatV2.Referral r ON r.ReferralId = s.ReferralId
    WHERE r.ReferralId = @ReferralId
      AND r.ReceiverLevel = 'OSTAN'
      AND r.ToMahal = @UserMahal
      AND r.IsDeleted = 0;

    DECLARE @CanWrite BIT = 0;
    IF @SummaryId IS NOT NULL
    BEGIN
        DECLARE @Access TABLE
        (
            CaseId BIGINT, ShomarehParvandeh BIGINT, PersonId BIGINT NULL,
            ReferralId BIGINT, AssignmentId BIGINT NULL, RootReferralId BIGINT,
            CanRead BIT, CanWrite BIT
        );
        INSERT INTO @Access
        EXEC TahghighatV2.SP_UnifiedAttachmentTargetAccess
            'PROVINCE_SUMMARY', @SummaryId, @UserId;
        IF EXISTS (SELECT 1 FROM @Access
                   WHERE ReferralId = @ReferralId AND CanWrite = 1)
            SET @CanWrite = 1;
    END;
    SELECT @SummaryId AS SummaryId, @CanWrite AS CanWrite;
END;
GO
SELECT
  N'TahghighatV2.SP_GetProvinceSummaryAttachmentTarget' AS ObjectName,
  CASE WHEN OBJECT_ID(N'TahghighatV2.SP_GetProvinceSummaryAttachmentTarget', N'P') IS NOT NULL
       THEN N'INSTALLED' ELSE N'MISSING' END AS Result;
SELECT
  N'MeratFilesDB.dbo.TahghighatDocument.AttachmentDescription' AS ObjectName,
  CASE WHEN COL_LENGTH(N'MeratFilesDB.dbo.TahghighatDocument', N'AttachmentDescription') IS NOT NULL
       THEN N'AVAILABLE' ELSE N'MISSING' END AS Result;
GO

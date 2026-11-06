-- Phase 163 — Provinces: allow sending the finalized official summary to the
-- provincial office director after all child referrals/investigator assignments complete.
-- No dossier, existing worksheet, attachment, or summary data is deleted.
USE [MeratDB];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'TahghighatV2.PostActionPermission', N'U') IS NULL
   OR OBJECT_ID(N'TahghighatV2.ActionTransition', N'U') IS NULL
   OR OBJECT_ID(N'TahghighatV2.ProvinceSummary', N'U') IS NULL
   OR OBJECT_ID(N'TahghighatV2.SP_ProvinceAction', N'P') IS NULL
    THROW 56310, N'ساختار گردش کار تحقیقات استان کامل نیست؛ ابتدا نسخه فعلی SQL مرآت را نصب کنید.', 1;

BEGIN TRY
  BEGIN TRANSACTION;

  -- Specialists and the head of document review may submit the official province summary.
  UPDATE p SET IsAllowed = 1
  FROM TahghighatV2.PostActionPermission p
  WHERE p.PostId IN (51,52) AND p.ActionCode = 'SUBMIT_DIRECTOR' AND p.IsAllowed = 0;

  INSERT INTO TahghighatV2.PostActionPermission(PostId, ActionCode, IsAllowed)
  SELECT u.PostId, 'SUBMIT_DIRECTOR', 1
  FROM (VALUES (51),(52)) u(PostId)
  WHERE NOT EXISTS (
    SELECT 1 FROM TahghighatV2.PostActionPermission p
    WHERE p.PostId=u.PostId AND p.ActionCode='SUBMIT_DIRECTOR');

  -- The existing stored procedure still checks open child referrals/assignments.
  -- Add any missing allowed transition; preserve existing transition rows.
  INSERT INTO TahghighatV2.ActionTransition(FromStateCode,ActionCode,ToStateCode)
  SELECT t.FromStateCode,'SUBMIT_DIRECTOR','DIRECTOR_REVIEW'
  FROM (VALUES ('PROVINCE_WORKING'),('PROVINCE_RETURNED'),('PENDING_CHILD_RESULTS')) t(FromStateCode)
  WHERE NOT EXISTS(
    SELECT 1 FROM TahghighatV2.ActionTransition a
    WHERE a.FromStateCode=t.FromStateCode
      AND a.ActionCode='SUBMIT_DIRECTOR' AND a.ToStateCode='DIRECTOR_REVIEW');

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO

SELECT p.PostId, p.ActionCode, p.IsAllowed
FROM TahghighatV2.PostActionPermission p
WHERE p.PostId IN(51,52) AND p.ActionCode='SUBMIT_DIRECTOR'
ORDER BY p.PostId;

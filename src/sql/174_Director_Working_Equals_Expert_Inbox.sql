/* Merat - Phase 174. Director (post 50) read-only province expert inbox list
   and the director's own immutable decision history. Run on MeratDB.
   Does not alter the existing actionable SP_GetDirectorInbox, permissions,
   data, referrals, or workflow transitions. */
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetDirectorOverview
  @UserId bigint,
  @Mode varchar(15),       -- WORKING | DECIDED
  @Page int = 1,
  @PageSize int = 20
AS
BEGIN
  SET NOCOUNT ON;
  IF ISNULL(@UserId,0) <= 0 OR @Mode NOT IN ('WORKING','DECIDED') OR @Mode IS NULL
     OR @Page IS NULL OR @Page < 1 OR @PageSize IS NULL OR @PageSize NOT BETWEEN 1 AND 100
    THROW 57301, N'پارامترهای فهرست رئیس دفتر معتبر نیست.', 1;

  DECLARE @ProvinceCityId int;
  SELECT @ProvinceCityId = CONVERT(int,u.Mahal)
  FROM dbo.Users u
  JOIN dbo.Citys c ON c.CityId=u.Mahal AND c.PCityId=1 AND c.IsActive=1
  WHERE u.UserId=@UserId AND u.IsActive=1 AND u.PostId=50;
  IF @ProvinceCityId IS NULL
    THROW 57302, N'مجوز مشاهده فهرست پرونده‌های استان برای این کاربر وجود ندارد.', 1;

  IF @Mode='WORKING'
  BEGIN
    /* Phase 174: The director's read-only expert list is the *same set of
       referrals as the provincial specialists' INBOX (GetTahghighat,
       ItemValue=2, plus OSTAN child referrals from ChildInbox for posts 51/52).
       A past WorkflowEvent by a specialist is NOT a membership condition.
       All results remain scoped to the director's own active province. */
    SELECT r.ReferralId, cf.CaseId, cf.ShomarehParvandeh,
           cf.CodeEntekhabat, cf.CodeHozeh,
           r.StateCode, ws.TitleFa AS StateTitle,
           specialist.FullName AS ExpertFullName,
           COALESCE(r.UpdatedAtUtc,r.CreatedAtUtc) AS LastUpdatedAtUtc,
           CONVERT(bigint,NULL) AS DecisionEventId,
           CONVERT(varchar(40),NULL) AS DecisionActionCode,
           CONVERT(nvarchar(max),NULL) AS DecisionReason,
           CONVERT(datetime2(3),NULL) AS DecisionAtUtc,
           COUNT_BIG(*) OVER() AS TotalCount
    FROM TahghighatV2.Referral r
    JOIN TahghighatV2.CaseFile cf ON cf.CaseId=r.CaseId
    JOIN TahghighatV2.WorkflowState ws ON ws.StateCode=r.StateCode
    OUTER APPLY (
      SELECT TOP(1)
          NULLIF(LTRIM(RTRIM(CONCAT(p.FirstName,N' ',p.LastName))),N'') AS FullName
      FROM TahghighatV2.WorkflowEvent e
      JOIN dbo.Users su ON su.UserId=e.ActorUserId
        AND su.PostId IN (51,52,53) AND su.Mahal=@ProvinceCityId
      LEFT JOIN dbo.Person p ON p.PersonId=su.PersonId
      WHERE e.ReferralId=r.ReferralId
      ORDER BY e.EventId DESC
    ) specialist
    WHERE r.ReceiverLevel='OSTAN' AND r.ToMahal=@ProvinceCityId
      AND r.IsDeleted=0 AND r.IsClosed=0
      AND (
        /* Identical to the provincial expert's ItemValue=2 main inbox. */
        r.StateCode IN ('PROVINCE_INBOX','CHILD_INBOX')
        OR (r.StateCode IN ('PROVINCE_WORKING','PENDING_CHILD_RESULTS','PROVINCE_RETURNED')
            AND EXISTS (
              SELECT 1 FROM TahghighatV2.Referral reply
              WHERE reply.ParentReferralId=r.ReferralId
                AND reply.CaseId=r.CaseId AND reply.IsDeleted=0
                AND reply.ReceiverLevel IN ('HOZE','OSTAN')
                AND reply.StateCode='CHILD_REPLIED' AND reply.IsClosed=1
            ))
        /* The expert UI also merges open incoming referrals from another
           province via SP_GetChildInbox (posts 51/52 only). */
        OR (r.ParentReferralId IS NOT NULL AND r.StateCode='CHILD_WORKING'
            AND EXISTS (
              SELECT 1 FROM dbo.Users expert
              JOIN TahghighatV2.PostActionPermission perm
                ON perm.PostId=expert.PostId
               AND perm.ActionCode='CHILD_REPLY' AND perm.IsAllowed=1
              WHERE expert.IsActive=1 AND expert.PostId IN (51,52)
                AND expert.Mahal=@ProvinceCityId
            ))
      )
    ORDER BY COALESCE(r.UpdatedAtUtc,r.CreatedAtUtc) DESC,r.ReferralId DESC
    OFFSET (CONVERT(bigint,@Page)-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
    RETURN;
  END;

  /* Each decision is shown as a distinct historical event even if the case
     was later returned/resubmitted. Only actions by THIS director are shown. */
  SELECT r.ReferralId, cf.CaseId, cf.ShomarehParvandeh,
         cf.CodeEntekhabat, cf.CodeHozeh,
         r.StateCode, ws.TitleFa AS StateTitle,
         CONVERT(nvarchar(500),NULL) AS ExpertFullName,
         COALESCE(r.UpdatedAtUtc,r.CreatedAtUtc) AS LastUpdatedAtUtc,
         e.EventId AS DecisionEventId,
         e.ActionCode AS DecisionActionCode,
         e.Description AS DecisionReason,
         e.OccurredAtUtc AS DecisionAtUtc,
         COUNT_BIG(*) OVER() AS TotalCount
  FROM TahghighatV2.WorkflowEvent e
  JOIN TahghighatV2.Referral r ON r.ReferralId=e.ReferralId
    AND r.ParentReferralId IS NULL AND r.ReceiverLevel='OSTAN'
    AND r.ToMahal=@ProvinceCityId AND r.IsDeleted=0
  JOIN TahghighatV2.CaseFile cf ON cf.CaseId=r.CaseId
  LEFT JOIN TahghighatV2.WorkflowState ws ON ws.StateCode=r.StateCode
  WHERE e.ActorUserId=@UserId AND e.ActionCode IN ('DIRECTOR_APPROVE','RETURN_PROVINCE')
  ORDER BY e.EventId DESC
  OFFSET (CONVERT(bigint,@Page)-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
SELECT CASE WHEN OBJECT_ID(N'TahghighatV2.SP_GetDirectorOverview',N'P') IS NOT NULL
  THEN 'INSTALLED' ELSE 'MISSING' END AS DirectorOverviewStatus;
GO

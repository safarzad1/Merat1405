/* Merat 178 | Setad research inbox, audit timeline, read-only dossier and workflow actions.
  Execute in MeratDB AFTER all previous V2/Director scripts.
  Scope: authenticated active headquarters users (Mahal=1) with explicit action permissions.
  Existing research and file data is never changed or deleted by this installation.
*/
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID(N'TahghighatV2.WorkflowEvent',N'U') IS NULL
 OR OBJECT_ID(N'TahghighatV2.PostActionPermission',N'U') IS NULL
 OR OBJECT_ID(N'TahghighatV2.Referral',N'U') IS NULL
 OR OBJECT_ID(N'MeratFilesDB.dbo.TahghighatDocument',N'U') IS NULL
 THROW 57800,N'ساختار تحقیقات V2 یا پایگاه اسناد نصب نیست.',1;
GO
/* Headquarters research chief (post 2) and designated expert (post 5).
   Other headquarters roles may be authorized through the existing permission matrix;
   never grant access merely because a user knows a referral or file ID. */
IF NOT EXISTS (SELECT 1 FROM TahghighatV2.WorkflowAction WHERE ActionCode='SETAD_NOTE')
 INSERT TahghighatV2.WorkflowAction(ActionCode,TitleFa)
 VALUES ('SETAD_NOTE',N'ثبت نظر ستاد بدون تغییر وضعیت');
IF NOT EXISTS (SELECT 1 FROM TahghighatV2.ActionTransition
 WHERE FromStateCode='SETAD_REVIEW' AND ActionCode='SETAD_NOTE' AND ToStateCode='SETAD_REVIEW')
 INSERT TahghighatV2.ActionTransition(FromStateCode,ActionCode,ToStateCode)
 VALUES ('SETAD_REVIEW','SETAD_NOTE','SETAD_REVIEW');
/* Ensure the two existing headquarters decisions can be taken on installations
   where only the director's transition rows were migrated. */
IF NOT EXISTS (SELECT 1 FROM TahghighatV2.ActionTransition
 WHERE FromStateCode='SETAD_REVIEW' AND ActionCode='SETAD_APPROVE' AND ToStateCode='APPROVED')
 INSERT TahghighatV2.ActionTransition(FromStateCode,ActionCode,ToStateCode)
 VALUES ('SETAD_REVIEW','SETAD_APPROVE','APPROVED');
IF NOT EXISTS (SELECT 1 FROM TahghighatV2.ActionTransition
 WHERE FromStateCode='SETAD_REVIEW' AND ActionCode='RETURN_PROVINCE' AND ToStateCode='PROVINCE_RETURNED')
 INSERT TahghighatV2.ActionTransition(FromStateCode,ActionCode,ToStateCode)
 VALUES ('SETAD_REVIEW','RETURN_PROVINCE','PROVINCE_RETURNED');
MERGE TahghighatV2.PostActionPermission AS target
USING (VALUES (2,'SETAD_APPROVE'),(2,'RETURN_PROVINCE'),(2,'SETAD_NOTE'),
             (5,'SETAD_APPROVE'),(5,'RETURN_PROVINCE'),(5,'SETAD_NOTE')) AS source(PostId,ActionCode)
ON target.PostId=source.PostId AND target.ActionCode=source.ActionCode
WHEN MATCHED THEN UPDATE SET target.IsAllowed=1
WHEN NOT MATCHED THEN INSERT(PostId,ActionCode,IsAllowed) VALUES(source.PostId,source.ActionCode,1);
GO

CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetSetadInbox
@UserId bigint,
    @Page int=1,
    @PageSize int=25
AS
BEGIN
    SET NOCOUNT ON;
    IF @UserId IS NULL OR @UserId<=0 OR @Page IS NULL OR @Page<1
       OR @PageSize IS NULL OR @PageSize NOT BETWEEN 1 AND 100
        THROW 53201,N'ورودی کارتابل ستاد نامعتبر است.',1;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users u
        JOIN TahghighatV2.PostActionPermission p ON p.PostId=u.PostId
        WHERE u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1
          AND p.ActionCode IN ('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE') AND p.IsAllowed=1)
        THROW 53202,N'دسترسی به کارتابل بررسی ستاد وجود ندارد.',1;
    SELECT r.ReferralId,r.CaseId,c.ShomarehParvandeh,c.CodeEntekhabat,c.CodeHozeh,
           c.OstanCityId,city.Name AS ProvinceName,r.StateCode,s.TitleFa AS StateTitle,
           r.CreatedAtUtc,r.UpdatedAtUtc,
           COUNT_BIG(*) OVER() AS TotalCount
    FROM TahghighatV2.Referral r
    JOIN TahghighatV2.CaseFile c ON c.CaseId=r.CaseId
    LEFT JOIN dbo.Citys city ON city.CityId=r.ToMahal
    JOIN TahghighatV2.WorkflowState s ON s.StateCode=r.StateCode
    WHERE r.ParentReferralId IS NULL AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN'
      AND r.IsDeleted=0 AND r.IsClosed=0 AND r.StateCode='SETAD_REVIEW'
    ORDER BY ISNULL(r.UpdatedAtUtc,r.CreatedAtUtc) DESC,r.ReferralId DESC
    OFFSET (CONVERT(bigint,@Page)-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetSetadReferralDetail
@ReferralId bigint,
    @UserId bigint
AS
BEGIN
    SET NOCOUNT ON;
    IF @ReferralId IS NULL OR @ReferralId<=0 OR @UserId IS NULL OR @UserId<=0
        THROW 53210,N'شناسه ارجاع یا کاربر نامعتبر است.',1;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users u
        JOIN TahghighatV2.PostActionPermission p ON p.PostId=u.PostId
        WHERE u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1
          AND p.ActionCode IN ('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE') AND p.IsAllowed=1)
        THROW 53211,N'کاربر مجاز ستاد شناسایی نشد.',1;
    IF NOT EXISTS(
        SELECT 1 FROM TahghighatV2.Referral r
        WHERE r.ReferralId=@ReferralId AND r.ParentReferralId IS NULL
          AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN'
          AND r.IsDeleted=0 AND r.IsClosed=0 AND r.StateCode='SETAD_REVIEW')
        THROW 53212,N'ارجاعی در کارتابل ستاد یافت نشد.',1;
    ;WITH DescendantTree AS (
        SELECT ReferralId,ParentReferralId,IsClosed,IsDeleted
        FROM TahghighatV2.Referral WHERE ReferralId=@ReferralId
        UNION ALL
        SELECT c.ReferralId,c.ParentReferralId,c.IsClosed,c.IsDeleted
        FROM TahghighatV2.Referral c JOIN DescendantTree d ON c.ParentReferralId=d.ReferralId
    )
    SELECT r.ReferralId,r.CaseId,c.ShomarehParvandeh,c.CodeEntekhabat,
           c.CodeHozeh,c.OstanCityId,r.StateCode,s.TitleFa AS StateTitle,
           r.Description AS ReferralDescription,r.CreatedAtUtc,r.UpdatedAtUtc,
           n.Reason AS NoResearchReason,ps.SummaryText,
           ev.ActionCode AS LastActionCode,ev.Description AS LastActionDescription,
           ev.OccurredAtUtc AS LastActionAtUtc,
           submit.ActionCode AS ProvinceSubmitAction,
           (SELECT COUNT_BIG(*) FROM DescendantTree t WHERE t.ReferralId<>r.ReferralId
               AND t.IsClosed=0 AND t.IsDeleted=0) AS PendingChildReferrals,
           (SELECT COUNT_BIG(*) FROM TahghighatV2.ResearchAssignment a
              JOIN DescendantTree t ON t.ReferralId=a.ReferralId
              WHERE t.IsDeleted=0 AND a.StatusCode IN('PENDING','IN_PROGRESS')) AS PendingAssignments
    FROM TahghighatV2.Referral r
    JOIN TahghighatV2.CaseFile c ON c.CaseId=r.CaseId
    JOIN TahghighatV2.WorkflowState s ON s.StateCode=r.StateCode
    LEFT JOIN TahghighatV2.ProvinceSummary ps ON ps.ReferralId=r.ReferralId
    OUTER APPLY(SELECT TOP(1) Reason FROM TahghighatV2.NoResearchDecision n
                WHERE n.ReferralId=r.ReferralId ORDER BY n.DecisionId DESC) n
    OUTER APPLY(SELECT TOP(1) EventId,ActionCode,Description,OccurredAtUtc
                FROM TahghighatV2.WorkflowEvent e
                WHERE e.ReferralId=r.ReferralId AND e.ActionCode='DIRECTOR_APPROVE' ORDER BY e.EventId DESC) ev
    OUTER APPLY(SELECT TOP(1) e.ActionCode
                FROM TahghighatV2.WorkflowEvent e
                WHERE e.ReferralId=r.ReferralId AND e.EventId<ev.EventId
                  AND e.ActionCode IN('NO_RESEARCH','SUBMIT_DIRECTOR')
                ORDER BY e.EventId DESC) submit
    WHERE r.ReferralId=@ReferralId AND r.ParentReferralId IS NULL
      AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN'
      AND r.IsDeleted=0 AND r.IsClosed=0 AND r.StateCode='SETAD_REVIEW'
    OPTION(MAXRECURSION 100);
END;
GO

CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetSetadOverview
 @UserId bigint, @Mode varchar(15), @Page int=1, @PageSize int=20
AS
BEGIN
 SET NOCOUNT ON;
 IF ISNULL(@UserId,0)<=0 OR @Mode NOT IN ('WORKING','DECIDED') OR @Page<1
    OR @PageSize<1 OR @PageSize>100 OR @Page IS NULL OR @PageSize IS NULL
    THROW 57801,N'پارامترهای فهرست ستاد نامعتبر است.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users u
   WHERE u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1
   AND EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission p
      WHERE p.PostId=u.PostId AND p.IsAllowed=1
      AND p.ActionCode IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE')))
   THROW 57802,N'مجوز مشاهده تحقیقات ستاد وجود ندارد.',1;
 IF @Mode='WORKING'
 BEGIN
   /* All provincial experts' open main inbox cases; no action button for these rows. */
   SELECT r.ReferralId,
     CASE WHEN parent.ReferralId IS NOT NULL AND parent.ParentReferralId IS NULL AND parent.FromMahal=1
          THEN parent.ReferralId ELSE r.ReferralId END AS RootReferralId,
     cf.CaseId,cf.ShomarehParvandeh,
     cf.CodeEntekhabat,cf.CodeHozeh,
     city.Name AS ProvinceName, r.StateCode,ws.TitleFa AS StateTitle,
     specialist.ExpertFullName,
     COALESCE(r.UpdatedAtUtc,r.CreatedAtUtc) AS LastUpdatedAtUtc,
     CONVERT(varchar(40),NULL) AS DecisionActionCode,
     CONVERT(nvarchar(max),NULL) AS DecisionReason,
     CONVERT(datetime2(3),NULL) AS DecisionAtUtc,
     CONVERT(nvarchar(500),NULL) AS ActorFullName,
     COUNT_BIG(*) OVER() AS TotalCount
   FROM TahghighatV2.Referral r
   JOIN TahghighatV2.CaseFile cf ON cf.CaseId=r.CaseId
   JOIN dbo.Citys city ON city.CityId=r.ToMahal
   LEFT JOIN TahghighatV2.Referral parent ON parent.ReferralId=r.ParentReferralId AND parent.CaseId=r.CaseId
   LEFT JOIN TahghighatV2.WorkflowState ws ON ws.StateCode=r.StateCode
   OUTER APPLY(
     SELECT TOP(1) COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(pr.FirstName,N' ',pr.LastName))),N''),N'کارشناس استان') AS ExpertFullName
     FROM TahghighatV2.WorkflowEvent e
     JOIN dbo.Users expert ON expert.UserId=e.ActorUserId AND expert.PostId IN (51,52,53) AND expert.Mahal=r.ToMahal
     LEFT JOIN dbo.Person pr ON pr.PersonId=expert.PersonId
     WHERE e.ReferralId=r.ReferralId ORDER BY e.EventId DESC
   ) specialist
   WHERE r.ReceiverLevel='OSTAN' AND r.IsDeleted=0 AND r.IsClosed=0
     AND (r.StateCode IN('PROVINCE_INBOX','CHILD_INBOX','PROVINCE_RETURNED')
       OR (r.StateCode IN('PROVINCE_WORKING','PENDING_CHILD_RESULTS') AND EXISTS (
         SELECT 1 FROM TahghighatV2.Referral child
         WHERE child.ParentReferralId=r.ReferralId AND child.IsDeleted=0 AND child.CaseId=r.CaseId
           AND child.StateCode='CHILD_REPLIED' AND child.IsClosed=1))
       OR (r.ParentReferralId IS NOT NULL AND r.StateCode='CHILD_WORKING'
           AND EXISTS (SELECT 1 FROM dbo.Users expert
             JOIN TahghighatV2.PostActionPermission perm ON perm.PostId=expert.PostId
                  AND perm.ActionCode='CHILD_REPLY' AND perm.IsAllowed=1
             WHERE expert.IsActive=1 AND expert.PostId IN (51,52) AND expert.Mahal=r.ToMahal)))
   ORDER BY COALESCE(r.UpdatedAtUtc,r.CreatedAtUtc) DESC,r.ReferralId DESC
   OFFSET (CONVERT(bigint,@Page)-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
   RETURN;
 END;
 /* Every authorized headquarters reviewer sees the same immutable team history. */
 SELECT r.ReferralId,cf.CaseId,cf.ShomarehParvandeh,cf.CodeEntekhabat,cf.CodeHozeh,
   city.Name AS ProvinceName,r.StateCode,ws.TitleFa AS StateTitle,
   CONVERT(nvarchar(500),NULL) AS ExpertFullName,
   COALESCE(r.UpdatedAtUtc,r.CreatedAtUtc) AS LastUpdatedAtUtc,
   e.ActionCode AS DecisionActionCode,e.Description AS DecisionReason,
   e.OccurredAtUtc AS DecisionAtUtc,
   COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(person.FirstName,N' ',person.LastName))),N''),N'کاربر مجاز ستاد') AS ActorFullName,
   COUNT_BIG(*) OVER() AS TotalCount
 FROM TahghighatV2.WorkflowEvent e
 JOIN TahghighatV2.Referral r ON r.ReferralId=e.ReferralId AND r.ParentReferralId IS NULL
   AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN' AND r.IsDeleted=0
 JOIN TahghighatV2.CaseFile cf ON cf.CaseId=r.CaseId
 LEFT JOIN dbo.Citys city ON city.CityId=r.ToMahal
 LEFT JOIN TahghighatV2.WorkflowState ws ON ws.StateCode=r.StateCode
 JOIN dbo.Users actor ON actor.UserId=e.ActorUserId AND actor.Mahal=1
 LEFT JOIN dbo.Person person ON person.PersonId=actor.PersonId
 WHERE e.ActionCode IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE')
 ORDER BY e.EventId DESC
 OFFSET (CONVERT(bigint,@Page)-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetSetadTimeline
 @ReferralId bigint,@UserId bigint
AS
BEGIN
 SET NOCOUNT ON;
 IF ISNULL(@ReferralId,0)<=0 OR ISNULL(@UserId,0)<=0 THROW 57803,N'شناسه پرونده یا کاربر نامعتبر است.',1;
 IF NOT EXISTS(SELECT 1 FROM TahghighatV2.Referral root
   JOIN dbo.Users u ON u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1
   WHERE root.ReferralId=@ReferralId AND root.ParentReferralId IS NULL AND root.FromMahal=1
     AND root.ReceiverLevel='OSTAN' AND root.IsDeleted=0
     AND EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission p
       WHERE p.PostId=u.PostId AND p.IsAllowed=1
         AND p.ActionCode IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE')))
   THROW 57804,N'مجوز مشاهده سوابق این پرونده وجود ندارد.',1;
 DECLARE @Scope TABLE(ReferralId bigint PRIMARY KEY,Depth int);
 ;WITH Tree AS(
   SELECT r.ReferralId,r.CaseId,CAST(0 AS int) Depth
   FROM TahghighatV2.Referral r WHERE r.ReferralId=@ReferralId AND r.IsDeleted=0
   UNION ALL
   SELECT c.ReferralId,c.CaseId,t.Depth+1 FROM TahghighatV2.Referral c
   JOIN Tree t ON c.ParentReferralId=t.ReferralId AND c.CaseId=t.CaseId
   WHERE c.IsDeleted=0 AND t.Depth<30
 )
 INSERT @Scope(ReferralId,Depth) SELECT ReferralId,Depth FROM Tree OPTION(MAXRECURSION 31);
 ;WITH History AS(
   SELECT e.EventId AS LogId,e.ReferralId,e.ActionCode,COALESCE(wa.TitleFa,CONVERT(nvarchar(150),e.ActionCode)) AS ActionTitle,
     e.Description AS ActionDescription,e.ActorUserId AS ActorUserId,e.OccurredAtUtc AS OccurredAtUtc,
     CONVERT(varchar(12),'ACTION') AS LogType
   FROM TahghighatV2.WorkflowEvent e
   JOIN @Scope sc ON sc.ReferralId=e.ReferralId
   LEFT JOIN TahghighatV2.WorkflowAction wa ON wa.ActionCode=e.ActionCode
   UNION ALL
   SELECT a.AssignmentId,a.ReferralId,CONVERT(varchar(40),'ASSIGNMENT_REGISTERED'),
     CONVERT(nvarchar(150),N'ثبت ارجاع به محقق'),LEFT(a.Instruction,600),
     a.CreatedByUserId,a.CreatedAtUtc,CONVERT(varchar(12),'ASSIGNMENT')
   FROM TahghighatV2.ResearchAssignment a JOIN @Scope sc ON sc.ReferralId=a.ReferralId
   UNION ALL
   SELECT ev.AssignmentEventId,a.ReferralId,ev.ActionCode,
     CONVERT(nvarchar(150),CASE WHEN ev.AfterStatus='DONE' THEN N'تکمیل تحقیق محقق'
       WHEN ev.AfterStatus='CANCELLED' THEN N'بازپس‌گیری مأموریت محقق'
       ELSE N'تغییر وضعیت مأموریت محقق' END),LEFT(ev.Description,600),
     ev.ActorUserId,ev.OccurredAtUtc,CONVERT(varchar(12),'INVESTIGATOR')
   FROM TahghighatV2.ResearchAssignmentEvent ev
   JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId=ev.AssignmentId
   JOIN @Scope sc ON sc.ReferralId=a.ReferralId
   UNION ALL
   SELECT w.WorksheetId,a.ReferralId,CONVERT(varchar(40),'WORKSHEET_SAVED'),
     CONVERT(nvarchar(150),N'ثبت کاربرگ تحقیق'),LEFT(w.ReportText,600),
     w.CreatedByUserId,w.CreatedAtUtc,CONVERT(varchar(12),'WORKSHEET')
   FROM TahghighatV2.ResearchWorksheet w
   JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId=w.AssignmentId
   JOIN @Scope sc ON sc.ReferralId=a.ReferralId
   UNION ALL
   SELECT i.AssignmentId,a.ReferralId,CONVERT(varchar(40),'INVESTIGATOR_SUMMARY'),
     CONVERT(nvarchar(150),N'ویرایش جمع‌بندی محقق'),LEFT(i.SummaryText,600),
     i.LastEditedByUserId,i.LastEditedAtUtc,CONVERT(varchar(12),'SUMMARY')
   FROM TahghighatV2.InvestigatorSummary i
   JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId=i.AssignmentId
   JOIN @Scope sc ON sc.ReferralId=a.ReferralId
 )
 SELECT TOP(700) h.LogId,h.LogType,h.ReferralId,h.ActionCode,h.ActionTitle,h.ActionDescription,
   h.OccurredAtUtc,sc.Depth,rc.Name AS DestinationName,
   COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(person.FirstName,N' ',person.LastName))),N''),N'کاربر ثبت‌کننده') AS ActorFullName
 FROM History h
 JOIN @Scope sc ON sc.ReferralId=h.ReferralId
 JOIN TahghighatV2.Referral r ON r.ReferralId=h.ReferralId
 LEFT JOIN dbo.Citys rc ON rc.CityId=r.ToMahal
 LEFT JOIN dbo.Users actor ON actor.UserId=h.ActorUserId
 LEFT JOIN dbo.Person person ON person.PersonId=actor.PersonId
 ORDER BY h.OccurredAtUtc DESC,h.LogId DESC;
END;
GO

CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetSetadReviewDossier
@ReferralId bigint, @UserId bigint
AS
BEGIN
  SET NOCOUNT ON;
  IF ISNULL(@ReferralId,0)<=0 OR ISNULL(@UserId,0)<=0
    THROW 57002,N'شناسه پرونده یا کاربر معتبر نیست.',1;
  IF NOT EXISTS (
    SELECT 1 FROM dbo.Users u
    JOIN TahghighatV2.Referral r ON r.ReferralId=@ReferralId
      AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN' AND r.ParentReferralId IS NULL
      AND r.IsDeleted=0
    WHERE u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1 AND EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission perm WHERE perm.PostId=u.PostId AND perm.IsAllowed=1 AND perm.ActionCode IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE'))
  ) THROW 57003,N'دسترسی مشاهده پرونده برای کاربر ستاد مجاز نیست.',1;

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

CREATE OR ALTER PROCEDURE TahghighatV2.SP_GetSetadReviewDossierFile
@ReferralId bigint,@AttachmentId uniqueidentifier,@UserId bigint
AS
BEGIN
  SET NOCOUNT ON;
  IF ISNULL(@ReferralId,0)<=0 OR @AttachmentId IS NULL OR ISNULL(@UserId,0)<=0
    THROW 57004,N'شناسه سند، ارجاع یا کاربر نامعتبر است.',1;
  IF NOT EXISTS(
    SELECT 1 FROM dbo.Users u
    JOIN TahghighatV2.Referral r ON r.ReferralId=@ReferralId
      AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN' AND r.ParentReferralId IS NULL
      AND r.IsDeleted=0
    WHERE u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1 AND EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission perm WHERE perm.PostId=u.PostId AND perm.IsAllowed=1 AND perm.ActionCode IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE'))
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

CREATE OR ALTER PROCEDURE TahghighatV2.SP_SetadAction
@ReferralId bigint,
    @ActionCode varchar(40), -- SETAD_APPROVE | RETURN_PROVINCE | SETAD_NOTE
    @Description nvarchar(max),
    @UserId bigint
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @ReferralId IS NULL OR @ReferralId<=0 OR @UserId IS NULL OR @UserId<=0
       OR @ActionCode IS NULL OR @ActionCode NOT IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE')
        THROW 53220,N'شناسه یا نوع اقدام ستاد معتبر نیست.',1;
    SET @Description=NULLIF(LTRIM(RTRIM(@Description)),N'');
    IF @ActionCode IN('RETURN_PROVINCE','SETAD_NOTE') AND @Description IS NULL
        THROW 53220,N'ثبت متن نظر یا دلیل برگشت الزامی است.',1;
    IF LEN(ISNULL(@Description,N''))>6000 THROW 53220,N'متن توضیحات طولانی است.',1;
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Users u
        JOIN TahghighatV2.PostActionPermission p ON p.PostId=u.PostId
        WHERE u.UserId=@UserId AND u.IsActive=1 AND u.Mahal=1
          AND p.ActionCode=@ActionCode AND p.IsAllowed=1)
        THROW 53221,N'مجوز این اقدام ستاد وجود ندارد.',1;
    DECLARE @PreviousState varchar(40),@NextState varchar(40),@LockResult int,
            @LatestAction varchar(40),@LatestEventId bigint,@SubmittedAction varchar(40);
    SET @NextState=CASE WHEN @ActionCode='SETAD_APPROVE' THEN 'APPROVED' WHEN @ActionCode='SETAD_NOTE' THEN 'SETAD_REVIEW' ELSE 'PROVINCE_RETURNED' END;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @Resource nvarchar(255)=N'MRV2:REF:'+CONVERT(nvarchar(20),@ReferralId);
        EXEC @LockResult=sys.sp_getapplock @Resource=@Resource,@LockMode=N'Exclusive',
             @LockOwner=N'Transaction',@LockTimeout=10000;
        IF @LockResult<0 THROW 53222,N'پرونده در حال پردازش است.',1;
        SELECT @PreviousState=r.StateCode
        FROM TahghighatV2.Referral r WITH(UPDLOCK,HOLDLOCK)
        WHERE r.ReferralId=@ReferralId AND r.ParentReferralId IS NULL
          AND r.FromMahal=1 AND r.ReceiverLevel='OSTAN'
          AND r.IsDeleted=0 AND r.IsClosed=0;
        IF @PreviousState IS NULL OR @PreviousState<>'SETAD_REVIEW'
            THROW 53223,N'پرونده در مرحله بررسی ستاد نیست.',1;
        IF NOT EXISTS(SELECT 1 FROM TahghighatV2.ActionTransition t
                      WHERE t.FromStateCode=@PreviousState AND t.ActionCode=@ActionCode
                        AND t.ToStateCode=@NextState)
            THROW 53224,N'انتقال وضعیت مجاز نیست.',1;
        SELECT TOP(1) @LatestEventId=e.EventId,@LatestAction=e.ActionCode
        FROM TahghighatV2.WorkflowEvent e
        WHERE e.ReferralId=@ReferralId AND e.ActionCode<>'SETAD_NOTE' ORDER BY e.EventId DESC;
        IF @LatestAction IS NULL OR @LatestAction<>'DIRECTOR_APPROVE'
            THROW 53225,N'پرونده باید ابتدا به تأیید رئیس دفتر برسد.',1;
        IF @ActionCode='SETAD_APPROVE'
        BEGIN
            SELECT TOP(1) @SubmittedAction=e.ActionCode
            FROM TahghighatV2.WorkflowEvent e
            WHERE e.ReferralId=@ReferralId AND e.EventId<@LatestEventId
              AND e.ActionCode IN('NO_RESEARCH','SUBMIT_DIRECTOR')
            ORDER BY e.EventId DESC;
            IF @SubmittedAction IS NULL
                THROW 53226,N'سابقه ارسال معتبر از استان وجود ندارد.',1;
            IF @SubmittedAction='NO_RESEARCH' AND NOT EXISTS(
                SELECT 1 FROM TahghighatV2.NoResearchDecision n
                WHERE n.ReferralId=@ReferralId
                  AND NULLIF(LTRIM(RTRIM(n.Reason)),N'') IS NOT NULL)
                THROW 53227,N'علت عدم نیاز به تحقیق موجود نیست.',1;
            IF @SubmittedAction='SUBMIT_DIRECTOR' AND NOT EXISTS(
                SELECT 1 FROM TahghighatV2.ProvinceSummary ps
                WHERE ps.ReferralId=@ReferralId
                  AND NULLIF(LTRIM(RTRIM(ps.SummaryText)),N'') IS NOT NULL)
                THROW 53228,N'جمع‌بندی استان ثبت نشده است.',1;
            DECLARE @Tree TABLE(ReferralId bigint NOT NULL PRIMARY KEY,IsClosed bit NOT NULL,IsDeleted bit NOT NULL);
            ;WITH DescendantTree AS (
                SELECT r.ReferralId,r.ParentReferralId,r.IsClosed,r.IsDeleted
                FROM TahghighatV2.Referral r WHERE r.ReferralId=@ReferralId
                UNION ALL
                SELECT c.ReferralId,c.ParentReferralId,c.IsClosed,c.IsDeleted
                FROM TahghighatV2.Referral c JOIN DescendantTree d ON c.ParentReferralId=d.ReferralId
            )
            INSERT INTO @Tree(ReferralId,IsClosed,IsDeleted)
            SELECT ReferralId,IsClosed,IsDeleted FROM DescendantTree OPTION(MAXRECURSION 100);
            IF EXISTS(SELECT 1 FROM @Tree t WHERE t.ReferralId<>@ReferralId AND t.IsClosed=0 AND t.IsDeleted=0)
                THROW 53229,N'ارجاعات فرزند باز دارند.',1;
            IF EXISTS(SELECT 1 FROM TahghighatV2.ResearchAssignment a JOIN @Tree t ON t.ReferralId=a.ReferralId
                      WHERE t.IsDeleted=0 AND a.StatusCode IN('PENDING','IN_PROGRESS'))
                THROW 53230,N'محقق ناتمام وجود دارد.',1;
        END;
        UPDATE TahghighatV2.Referral
        SET StateCode=@NextState,
            IsClosed=CASE WHEN @ActionCode='SETAD_APPROVE' THEN 1 ELSE 0 END,
            UpdatedByUserId=@UserId,UpdatedAtUtc=SYSUTCDATETIME()
        WHERE ReferralId=@ReferralId;
        INSERT TahghighatV2.WorkflowEvent
            (ReferralId,ActionCode,PreviousStateCode,NewStateCode,Description,ActorUserId)
        VALUES(@ReferralId,@ActionCode,@PreviousState,@NextState,@Description,@UserId);
        COMMIT TRANSACTION;
        SELECT CONVERT(bit,1) AS IsSuccess,@ReferralId AS ReferralId,@NextState AS NewStateCode;
    END TRY
    BEGIN CATCH
        IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- Post-install verification: active eligible roles and installed procedures.
SELECT u.PostId,p.ActionCode,p.IsAllowed FROM TahghighatV2.PostActionPermission p
JOIN (SELECT DISTINCT PostId FROM dbo.Users WHERE Mahal=1 AND IsActive=1) u ON u.PostId=p.PostId
WHERE p.ActionCode IN('SETAD_APPROVE','RETURN_PROVINCE','SETAD_NOTE') ORDER BY u.PostId,p.ActionCode;
SELECT p.name AS InstalledProcedure FROM sys.procedures p JOIN sys.schemas s ON s.schema_id=p.schema_id
WHERE s.name='TahghighatV2' AND p.name IN
('SP_GetSetadInbox','SP_GetSetadReferralDetail','SP_GetSetadOverview','SP_GetSetadTimeline',
 'SP_GetSetadReviewDossier','SP_GetSetadReviewDossierFile','SP_SetadAction');
GO

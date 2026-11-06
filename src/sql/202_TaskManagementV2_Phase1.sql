/* Merat: Phase 1 of TaskManagementV2. Run on MeratDB; additive/idempotent. */
USE [MeratDB];
GO
IF SCHEMA_ID(N'TaskManagementV2') IS NULL EXEC(N'CREATE SCHEMA [TaskManagementV2]');
GO
IF OBJECT_ID(N'TaskManagementV2.Projects',N'U') IS NULL
CREATE TABLE TaskManagementV2.Projects(
 ProjectId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_Projects PRIMARY KEY,
 Title NVARCHAR(200) NOT NULL, Description NVARCHAR(MAX) NULL,
 StartDatePersian CHAR(10) NULL, EndDatePersian CHAR(10) NULL,
 StatusCode VARCHAR(15) NOT NULL CONSTRAINT DF_TM2_Projects_Status DEFAULT('DRAFT'),
 CreatedByUserId BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_Projects_Created DEFAULT SYSUTCDATETIME(),
 IsDeleted BIT NOT NULL CONSTRAINT DF_TM2_Projects_Deleted DEFAULT(0),
 CONSTRAINT CK_TM2_Projects_Title CHECK (LEN(LTRIM(RTRIM(Title)))>0),
 CONSTRAINT CK_TM2_Projects_Status CHECK (StatusCode IN ('DRAFT','ACTIVE','CLOSED')),
 CONSTRAINT CK_TM2_Projects_Dates CHECK (StartDatePersian IS NULL OR EndDatePersian IS NULL OR StartDatePersian<=EndDatePersian)
);
GO
IF OBJECT_ID(N'TaskManagementV2.Tasks',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.Tasks(
  TaskId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_Tasks PRIMARY KEY,
  ProjectId BIGINT NOT NULL, Title NVARCHAR(200) NOT NULL, Description NVARCHAR(MAX) NULL,
  StartDatePersian CHAR(10) NULL, DueDatePersian CHAR(10) NULL,
  CreatedByUserId BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_Tasks_Created DEFAULT SYSUTCDATETIME(),
  IsDeleted BIT NOT NULL CONSTRAINT DF_TM2_Tasks_Deleted DEFAULT(0),
  CONSTRAINT FK_TM2_Tasks_Project FOREIGN KEY(ProjectId) REFERENCES TaskManagementV2.Projects(ProjectId),
  CONSTRAINT CK_TM2_Tasks_Title CHECK(LEN(LTRIM(RTRIM(Title)))>0),
  CONSTRAINT CK_TM2_Tasks_Dates CHECK(StartDatePersian IS NULL OR DueDatePersian IS NULL OR StartDatePersian<=DueDatePersian)
 );
 CREATE INDEX IX_TM2_Tasks_Project ON TaskManagementV2.Tasks(ProjectId,IsDeleted);
END;
GO
IF OBJECT_ID(N'TaskManagementV2.Targets',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.Targets(
  TargetId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_Targets PRIMARY KEY,
  TaskId BIGINT NOT NULL, ProvinceCityId BIGINT NOT NULL,
  PersianYear SMALLINT NOT NULL, Quarter TINYINT NOT NULL, TargetValue DECIMAL(18,2) NOT NULL,
  CreatedByUserId BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_Targets_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_TM2_Targets_Task FOREIGN KEY(TaskId) REFERENCES TaskManagementV2.Tasks(TaskId),
  CONSTRAINT FK_TM2_Targets_Province FOREIGN KEY(ProvinceCityId) REFERENCES dbo.Citys(CityId),
  CONSTRAINT UQ_TM2_Targets_Period UNIQUE(TaskId,ProvinceCityId,PersianYear,Quarter),
  CONSTRAINT CK_TM2_Targets_Year CHECK(PersianYear BETWEEN 1300 AND 1600),
  CONSTRAINT CK_TM2_Targets_Quarter CHECK(Quarter BETWEEN 1 AND 4),
  CONSTRAINT CK_TM2_Targets_Value CHECK(TargetValue>=0)
 );
 CREATE INDEX IX_TM2_Targets_Province ON TaskManagementV2.Targets(ProvinceCityId,PersianYear,Quarter) INCLUDE(TaskId,TargetValue);
END;
GO
IF OBJECT_ID(N'TaskManagementV2.Assignments',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.Assignments(
  AssignmentId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_Assignments PRIMARY KEY,
  TargetId BIGINT NOT NULL, UserId BIGINT NOT NULL, CreatedByUserId BIGINT NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_Assignments_Created DEFAULT SYSUTCDATETIME(),
  IsActive BIT NOT NULL CONSTRAINT DF_TM2_Assignments_Active DEFAULT(1),
  CONSTRAINT FK_TM2_Assignments_Target FOREIGN KEY(TargetId) REFERENCES TaskManagementV2.Targets(TargetId),
  CONSTRAINT FK_TM2_Assignments_User FOREIGN KEY(UserId) REFERENCES dbo.Users(UserId),
  CONSTRAINT UQ_TM2_Assignments_TargetUser UNIQUE(TargetId,UserId)
 );
 CREATE INDEX IX_TM2_Assignments_User ON TaskManagementV2.Assignments(UserId,IsActive);
END;
GO
IF OBJECT_ID(N'TaskManagementV2.ProgressRecords',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.ProgressRecords(
  RecordId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_Progress PRIMARY KEY,
  AssignmentId BIGINT NOT NULL, ActivityDatePersian CHAR(10) NOT NULL,
  Description NVARCHAR(2000) NOT NULL, ActualValue DECIMAL(18,2) NOT NULL,
  ReviewStatus VARCHAR(15) NOT NULL CONSTRAINT DF_TM2_Progress_Status DEFAULT('PENDING'),
  ReviewReason NVARCHAR(2000) NULL, ReviewedByUserId BIGINT NULL, ReviewedAtUtc DATETIME2(3) NULL,
  CreatedByUserId BIGINT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_Progress_Created DEFAULT SYSUTCDATETIME(),
  IsDeleted BIT NOT NULL CONSTRAINT DF_TM2_Progress_Deleted DEFAULT(0),
  CONSTRAINT FK_TM2_Progress_Assignment FOREIGN KEY(AssignmentId) REFERENCES TaskManagementV2.Assignments(AssignmentId),
  CONSTRAINT CK_TM2_Progress_Value CHECK(ActualValue>=0),
  CONSTRAINT CK_TM2_Progress_Description CHECK(LEN(LTRIM(RTRIM(Description)))>0),
  CONSTRAINT CK_TM2_Progress_Review CHECK(ReviewStatus IN ('PENDING','APPROVED','REJECTED'))
 );
 CREATE INDEX IX_TM2_Progress_Assignment ON TaskManagementV2.ProgressRecords(AssignmentId,ReviewStatus,IsDeleted) INCLUDE(ActualValue);
END;
GO
/* Read only in phase 1. Mutation SPs require separate stage-level permissions. */
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_GetOverview @UserId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Mahal BIGINT,@PostId BIGINT,@RollId BIGINT,@IsSetad BIT=0;
 SELECT @Mahal=U.Mahal,@PostId=U.PostId,@RollId=P.RollId
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1;
 IF @PostId IS NULL THROW 57000,N'نشست کاربر معتبر نیست.',1;
 IF @RollId=1 AND @Mahal=1 AND @PostId BETWEEN 1 AND 5 SET @IsSetad=1;
 ELSE IF NOT (@PostId BETWEEN 50 AND 56 AND @RollId IN(2,5)
 AND EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@Mahal AND C.IsActive=1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3))
 THROW 57003,N'دسترسی مجاز نیست.',1;

 SELECT P.ProjectId INTO #VisibleProjects FROM TaskManagementV2.Projects P
 WHERE P.IsDeleted=0 AND (@IsSetad=1 OR (P.StatusCode='ACTIVE' AND EXISTS(
  SELECT 1 FROM TaskManagementV2.Tasks T JOIN TaskManagementV2.Targets G ON G.TaskId=T.TaskId
  WHERE T.ProjectId=P.ProjectId AND T.IsDeleted=0 AND G.ProvinceCityId=@Mahal)));
 CREATE UNIQUE CLUSTERED INDEX IX_TM2_Visible ON #VisibleProjects(ProjectId);
 SELECT @IsSetad AS IsSetad,
  CASE WHEN @IsSetad=1 THEN N'ستاد' ELSE COALESCE((SELECT TOP(1) Name FROM dbo.Citys WHERE CityId=@Mahal),N'استان') END ScopeName,
  (SELECT COUNT_BIG(*) FROM #VisibleProjects) AS ProjectCount,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.Tasks T JOIN #VisibleProjects V ON V.ProjectId=T.ProjectId
   WHERE T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal))) AS TaskCount,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.Targets G JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
   JOIN #VisibleProjects V ON V.ProjectId=T.ProjectId WHERE T.IsDeleted=0 AND (@IsSetad=1 OR G.ProvinceCityId=@Mahal)) AS TargetCount,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.ProgressRecords R JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
   JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
   JOIN #VisibleProjects V ON V.ProjectId=T.ProjectId
   WHERE T.IsDeleted=0 AND R.IsDeleted=0 AND (@IsSetad=1 OR G.ProvinceCityId=@Mahal)) AS ReportCount;
 SELECT TOP(100) P.ProjectId,P.Title,P.StatusCode,P.StartDatePersian,P.EndDatePersian,
   (SELECT COUNT_BIG(*) FROM TaskManagementV2.Tasks T WHERE T.ProjectId=P.ProjectId AND T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal))) TaskCount
 FROM TaskManagementV2.Projects P JOIN #VisibleProjects V ON V.ProjectId=P.ProjectId ORDER BY P.ProjectId DESC;
 SELECT TOP(100) G.TargetId,P.Title ProjectTitle,T.Title TaskTitle,G.PersianYear,G.Quarter,G.TargetValue,
  G.ProvinceCityId,COALESCE(C.Name,N'') ProvinceName,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.Assignments A WHERE A.TargetId=G.TargetId AND A.IsActive=1) AssigneeCount,
  COALESCE((SELECT SUM(R.ActualValue) FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.ProgressRecords R ON R.AssignmentId=A.AssignmentId
    WHERE A.TargetId=G.TargetId AND R.IsDeleted=0 AND R.ReviewStatus='APPROVED'),0) ApprovedValue
 FROM TaskManagementV2.Targets G JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId JOIN #VisibleProjects V ON V.ProjectId=P.ProjectId
 LEFT JOIN dbo.Citys C ON C.CityId=G.ProvinceCityId
 WHERE @IsSetad=1 OR G.ProvinceCityId=@Mahal
 ORDER BY G.PersianYear DESC,G.Quarter DESC,G.TargetId DESC;
 /* Linked assignees for the read-only delegation trail. Exact same scope as the target list. */
 SELECT A.AssignmentId,A.TargetId,A.UserId,
   COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر ' + CONVERT(NVARCHAR(30),A.UserId)) AS AssigneeName,
   (SELECT COUNT_BIG(*) FROM TaskManagementV2.ProgressRecords R
     WHERE R.AssignmentId=A.AssignmentId AND R.IsDeleted=0) AS ReportCount,
   COALESCE((SELECT SUM(R.ActualValue) FROM TaskManagementV2.ProgressRecords R
     WHERE R.AssignmentId=A.AssignmentId AND R.IsDeleted=0 AND R.ReviewStatus='APPROVED'),0) AS ApprovedValue
 FROM TaskManagementV2.Assignments A
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN #VisibleProjects Vp ON Vp.ProjectId=T.ProjectId
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=A.UserId
 WHERE A.IsActive=1 AND (@IsSetad=1 OR G.ProvinceCityId=@Mahal)
 ORDER BY A.TargetId DESC,A.AssignmentId;
END;
GO

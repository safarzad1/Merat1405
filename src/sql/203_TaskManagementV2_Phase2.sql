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
 SELECT P.ProjectId,P.Title,P.StatusCode,P.StartDatePersian,P.EndDatePersian,
   (SELECT COUNT_BIG(*) FROM TaskManagementV2.Tasks T WHERE T.ProjectId=P.ProjectId AND T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal))) TaskCount
 FROM TaskManagementV2.Projects P JOIN #VisibleProjects V ON V.ProjectId=P.ProjectId ORDER BY P.ProjectId DESC;
 SELECT G.TargetId,P.Title ProjectTitle,T.Title TaskTitle,G.PersianYear,G.Quarter,G.TargetValue,
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

/* PHASE 2: Staff-only project and task management. Preceding phase-1 DDL is deliberately retained
   so one SQL file installs both phases on a fresh or previously migrated MeratDB. */
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'TaskManagementV2.Projects') AND name=N'IX_TM2_Projects_List')
CREATE INDEX IX_TM2_Projects_List ON TaskManagementV2.Projects(IsDeleted,StatusCode,ProjectId DESC)
 INCLUDE(Title,StartDatePersian,EndDatePersian);
GO
IF OBJECT_ID(N'TaskManagementV2.ChangeLog',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.ChangeLog(
  ChangeId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_ChangeLog PRIMARY KEY,
  EntityType VARCHAR(20) NOT NULL,
  EntityId BIGINT NOT NULL,
  ActionCode VARCHAR(25) NOT NULL,
  ActionDetails NVARCHAR(600) NULL,
  ActorUserId BIGINT NOT NULL,
  ChangedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_ChangeLog_Date DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_TM2_ChangeLog_Actor FOREIGN KEY(ActorUserId) REFERENCES dbo.Users(UserId)
 );
 CREATE INDEX IX_TM2_ChangeLog_Entity ON TaskManagementV2.ChangeLog(EntityType,EntityId,ChangedAtUtc DESC);
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SaveProject
 @UserId BIGINT, @ProjectId BIGINT=NULL, @Title NVARCHAR(200), @Description NVARCHAR(MAX)=NULL,
 @StartDatePersian CHAR(10)=NULL,@EndDatePersian CHAR(10)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS (SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
   WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
   THROW 57101,N'مجوز مدیریت پروژه فقط برای ستاد فعال است.',1;
 SET @Title=NULLIF(LTRIM(RTRIM(@Title)),N'');
 IF @Title IS NULL OR LEN(@Title)>200 THROW 57102,N'عنوان پروژه معتبر نیست.',1;
 SET @Description=NULLIF(LTRIM(RTRIM(@Description)),N'');
 IF @StartDatePersian='' SET @StartDatePersian=NULL;
 IF @EndDatePersian='' SET @EndDatePersian=NULL;
 IF (@StartDatePersian IS NOT NULL AND (LEN(@StartDatePersian)<>10 OR @StartDatePersian NOT LIKE '[1][3-5][0-9][0-9]/[0-1][0-9]/[0-3][0-9]' OR SUBSTRING(@StartDatePersian,6,2) NOT BETWEEN '01' AND '12' OR SUBSTRING(@StartDatePersian,9,2) NOT BETWEEN '01' AND '31' OR (SUBSTRING(@StartDatePersian,6,2)>'06' AND SUBSTRING(@StartDatePersian,9,2)>'30')))
 OR (@EndDatePersian IS NOT NULL AND (LEN(@EndDatePersian)<>10 OR @EndDatePersian NOT LIKE '[1][3-5][0-9][0-9]/[0-1][0-9]/[0-3][0-9]' OR SUBSTRING(@EndDatePersian,6,2) NOT BETWEEN '01' AND '12' OR SUBSTRING(@EndDatePersian,9,2) NOT BETWEEN '01' AND '31' OR (SUBSTRING(@EndDatePersian,6,2)>'06' AND SUBSTRING(@EndDatePersian,9,2)>'30')))
 OR (@StartDatePersian IS NOT NULL AND @EndDatePersian IS NOT NULL AND @StartDatePersian>@EndDatePersian)
 THROW 57103,N'تاریخ‌های پروژه معتبر نیستند.',1;
 IF @ProjectId IS NOT NULL AND @ProjectId<=0 THROW 57104,N'شناسه پروژه معتبر نیست.',1;
 BEGIN TRAN;
 IF @ProjectId IS NULL
 BEGIN
  INSERT TaskManagementV2.Projects(Title,Description,StartDatePersian,EndDatePersian,CreatedByUserId)
  VALUES(@Title,@Description,@StartDatePersian,@EndDatePersian,@UserId);
  SET @ProjectId=CONVERT(BIGINT,SCOPE_IDENTITY());
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
  VALUES('PROJECT',@ProjectId,'CREATED',@Title,@UserId);
 END
 ELSE
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Projects WITH(UPDLOCK,HOLDLOCK)
      WHERE ProjectId=@ProjectId AND IsDeleted=0 AND StatusCode<>'CLOSED')
   THROW 57105,N'پروژه پیدا نشد یا بسته شده است.',1;
  IF EXISTS(SELECT 1 FROM TaskManagementV2.Tasks T WHERE T.ProjectId=@ProjectId AND T.IsDeleted=0
   AND ((@StartDatePersian IS NOT NULL AND T.StartDatePersian IS NOT NULL AND T.StartDatePersian<@StartDatePersian)
     OR (@EndDatePersian IS NOT NULL AND T.DueDatePersian IS NOT NULL AND T.DueDatePersian>@EndDatePersian)))
    THROW 57112,N'تاریخ‌های جدید پروژه با وظایف ثبت‌شده سازگار نیستند.',1;
  UPDATE TaskManagementV2.Projects SET Title=@Title,Description=@Description,
   StartDatePersian=@StartDatePersian,EndDatePersian=@EndDatePersian WHERE ProjectId=@ProjectId;
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
  VALUES('PROJECT',@ProjectId,'UPDATED',@Title,@UserId);
 END;
 COMMIT;
 SELECT @ProjectId AS ProjectId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SetProjectStatus
 @UserId BIGINT,@ProjectId BIGINT,@StatusCode VARCHAR(15)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
  WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57101,N'مجوز تغییر وضعیت پروژه ندارید.',1;
 IF @StatusCode NOT IN ('ACTIVE','CLOSED') THROW 57106,N'وضعیت مقصد معتبر نیست.',1;
 BEGIN TRAN;
 DECLARE @OldStatus VARCHAR(15);
 SELECT @OldStatus=StatusCode FROM TaskManagementV2.Projects WITH(UPDLOCK,HOLDLOCK)
  WHERE ProjectId=@ProjectId AND IsDeleted=0;
 IF @OldStatus IS NULL THROW 57107,N'پروژه یافت نشد.',1;
 IF @StatusCode='CLOSED' AND @OldStatus<>'ACTIVE'
  THROW 57108,N'فقط پروژه فعال قابل بستن است.',1;
 IF @StatusCode='ACTIVE' AND @OldStatus NOT IN ('DRAFT','CLOSED')
  THROW 57109,N'پروژه در وضعیت فعال قرار دارد.',1;
 UPDATE TaskManagementV2.Projects SET StatusCode=@StatusCode WHERE ProjectId=@ProjectId;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
 VALUES('PROJECT',@ProjectId,'STATUS',CONCAT(@OldStatus,N' → ',@StatusCode),@UserId);
 COMMIT;
 SELECT @ProjectId AS ProjectId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_DeleteProject
 @UserId BIGINT,@ProjectId BIGINT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
  WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57101,N'مجوز حذف پروژه ندارید.',1;
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Projects WITH(UPDLOCK,HOLDLOCK)
  WHERE ProjectId=@ProjectId AND IsDeleted=0 AND StatusCode='DRAFT')
  THROW 57110,N'فقط پروژه پیش‌نویس قابل حذف است.',1;
 IF EXISTS(SELECT 1 FROM TaskManagementV2.Targets G JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
  WHERE T.ProjectId=@ProjectId)
  THROW 57111,N'پروژه هدف‌گذاری‌شده قابل حذف نیست.',1;
 UPDATE TaskManagementV2.Tasks SET IsDeleted=1 WHERE ProjectId=@ProjectId;
 UPDATE TaskManagementV2.Projects SET IsDeleted=1 WHERE ProjectId=@ProjectId;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
 VALUES('PROJECT',@ProjectId,'DELETED',@UserId);
 COMMIT;
 SELECT @ProjectId AS ProjectId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SaveTask
 @UserId BIGINT,@ProjectId BIGINT,@TaskId BIGINT=NULL,@Title NVARCHAR(200),
 @Description NVARCHAR(MAX)=NULL,@StartDatePersian CHAR(10)=NULL,@DueDatePersian CHAR(10)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
  WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57101,N'مجوز مدیریت وظیفه ندارید.',1;
 SET @Title=NULLIF(LTRIM(RTRIM(@Title)),N'');
 IF @Title IS NULL OR LEN(@Title)>200 THROW 57102,N'عنوان وظیفه معتبر نیست.',1;
 SET @Description=NULLIF(LTRIM(RTRIM(@Description)),N'');
 IF @StartDatePersian='' SET @StartDatePersian=NULL;
 IF @DueDatePersian='' SET @DueDatePersian=NULL;
 IF (@StartDatePersian IS NOT NULL AND (LEN(@StartDatePersian)<>10 OR @StartDatePersian NOT LIKE '[1][3-5][0-9][0-9]/[0-1][0-9]/[0-3][0-9]' OR SUBSTRING(@StartDatePersian,6,2) NOT BETWEEN '01' AND '12' OR SUBSTRING(@StartDatePersian,9,2) NOT BETWEEN '01' AND '31' OR (SUBSTRING(@StartDatePersian,6,2)>'06' AND SUBSTRING(@StartDatePersian,9,2)>'30')))
 OR (@DueDatePersian IS NOT NULL AND (LEN(@DueDatePersian)<>10 OR @DueDatePersian NOT LIKE '[1][3-5][0-9][0-9]/[0-1][0-9]/[0-3][0-9]' OR SUBSTRING(@DueDatePersian,6,2) NOT BETWEEN '01' AND '12' OR SUBSTRING(@DueDatePersian,9,2) NOT BETWEEN '01' AND '31' OR (SUBSTRING(@DueDatePersian,6,2)>'06' AND SUBSTRING(@DueDatePersian,9,2)>'30')))
 OR (@StartDatePersian IS NOT NULL AND @DueDatePersian IS NOT NULL AND @StartDatePersian>@DueDatePersian)
 THROW 57103,N'تاریخ‌های وظیفه معتبر نیستند.',1;
 BEGIN TRAN;
 DECLARE @ProjectStart CHAR(10),@ProjectEnd CHAR(10);
 SELECT @ProjectStart=StartDatePersian,@ProjectEnd=EndDatePersian
 FROM TaskManagementV2.Projects WITH(UPDLOCK,HOLDLOCK)
 WHERE ProjectId=@ProjectId AND IsDeleted=0 AND StatusCode<>'CLOSED';
 IF @@ROWCOUNT=0 THROW 57105,N'پروژه فعال یا پیش‌نویس پیدا نشد.',1;
 IF (@StartDatePersian IS NOT NULL AND @ProjectStart IS NOT NULL AND @StartDatePersian<@ProjectStart)
 OR (@DueDatePersian IS NOT NULL AND @ProjectEnd IS NOT NULL AND @DueDatePersian>@ProjectEnd)
 THROW 57112,N'تاریخ وظیفه باید در محدوده پروژه باشد.',1;
 IF @TaskId IS NULL
 BEGIN
  INSERT TaskManagementV2.Tasks(ProjectId,Title,Description,StartDatePersian,DueDatePersian,CreatedByUserId)
  VALUES(@ProjectId,@Title,@Description,@StartDatePersian,@DueDatePersian,@UserId);
  SET @TaskId=CONVERT(BIGINT,SCOPE_IDENTITY());
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
  VALUES('TASK',@TaskId,'CREATED',@Title,@UserId);
 END
 ELSE
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Tasks WITH(UPDLOCK,HOLDLOCK)
   WHERE TaskId=@TaskId AND ProjectId=@ProjectId AND IsDeleted=0)
   THROW 57113,N'وظیفه مربوط به این پروژه یافت نشد.',1;
  UPDATE TaskManagementV2.Tasks SET Title=@Title,Description=@Description,
   StartDatePersian=@StartDatePersian,DueDatePersian=@DueDatePersian WHERE TaskId=@TaskId;
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
  VALUES('TASK',@TaskId,'UPDATED',@Title,@UserId);
 END;
 COMMIT;
 SELECT @TaskId AS TaskId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_DeleteTask
 @UserId BIGINT,@TaskId BIGINT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
  WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57101,N'مجوز حذف وظیفه ندارید.',1;
 BEGIN TRAN;
 DECLARE @ProjectId BIGINT;
 SELECT @ProjectId=T.ProjectId FROM TaskManagementV2.Tasks T WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
 WHERE T.TaskId=@TaskId AND T.IsDeleted=0 AND P.IsDeleted=0 AND P.StatusCode<>'CLOSED';
 IF @ProjectId IS NULL THROW 57113,N'وظیفه قابل حذف نیست.',1;
 IF EXISTS(SELECT 1 FROM TaskManagementV2.Targets WHERE TaskId=@TaskId)
 THROW 57111,N'وظیفه دارای هدف و سوابق وابسته قابل حذف نیست.',1;
 UPDATE TaskManagementV2.Tasks SET IsDeleted=1 WHERE TaskId=@TaskId;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
 VALUES('TASK',@TaskId,'DELETED',@UserId);
 COMMIT;
 SELECT @TaskId AS TaskId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_GetProjectTasks
 @UserId BIGINT,@ProjectId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Mahal BIGINT,@PostId BIGINT,@RollId BIGINT,@IsSetad BIT=0;
 SELECT @Mahal=U.Mahal,@PostId=U.PostId,@RollId=P.RollId
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1;
 IF @PostId IS NULL THROW 57000,N'نشست کاربر معتبر نیست.',1;
 IF @Mahal=1 AND @PostId BETWEEN 1 AND 5 AND @RollId=1 SET @IsSetad=1;
 ELSE IF NOT (@PostId BETWEEN 50 AND 56 AND @RollId IN(2,5)
 AND EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@Mahal AND C.IsActive=1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3))
 THROW 57003,N'دسترسی مجاز نیست.',1;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Projects P WHERE P.ProjectId=@ProjectId AND P.IsDeleted=0 AND
 (@IsSetad=1 OR (P.StatusCode='ACTIVE' AND EXISTS(SELECT 1 FROM TaskManagementV2.Tasks T
 JOIN TaskManagementV2.Targets G ON G.TaskId=T.TaskId WHERE T.ProjectId=@ProjectId
 AND T.IsDeleted=0 AND G.ProvinceCityId=@Mahal))))
 THROW 57003,N'پروژه خارج از محدوده مجاز است.',1;
 SELECT ProjectId,Title,Description,StartDatePersian,EndDatePersian,StatusCode
 FROM TaskManagementV2.Projects WHERE ProjectId=@ProjectId;
 SELECT T.TaskId,T.ProjectId,T.Title,T.Description,T.StartDatePersian,T.DueDatePersian,
 (SELECT COUNT_BIG(*) FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId) TargetCount
 FROM TaskManagementV2.Tasks T
 WHERE T.ProjectId=@ProjectId AND T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(
 SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal))
 ORDER BY T.TaskId DESC;
END;
GO

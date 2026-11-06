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
/* PHASE 3: Publication of quarterly targets is independent of project activation.
   Existing targets are kept private until explicitly published by headquarters. */
IF COL_LENGTH(N'TaskManagementV2.Targets', N'IsPublished') IS NULL
 ALTER TABLE TaskManagementV2.Targets ADD IsPublished BIT NOT NULL CONSTRAINT DF_TM2_Targets_Published DEFAULT(0) WITH VALUES;
GO
IF COL_LENGTH(N'TaskManagementV2.Targets', N'PublishedAtUtc') IS NULL
 ALTER TABLE TaskManagementV2.Targets ADD PublishedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'TaskManagementV2.Targets', N'PublishedByUserId') IS NULL
 ALTER TABLE TaskManagementV2.Targets ADD PublishedByUserId BIGINT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'TaskManagementV2.Targets') AND name=N'IX_TM2_Targets_Publication')
 CREATE INDEX IX_TM2_Targets_Publication ON TaskManagementV2.Targets(ProvinceCityId,IsPublished,PersianYear,Quarter) INCLUDE(TaskId,TargetValue);
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
 IF @PostId IS NULL THROW 57401,N'نشست کاربر معتبر نیست.',1;
 IF @RollId=1 AND @Mahal=1 AND @PostId BETWEEN 1 AND 5 SET @IsSetad=1;
 ELSE IF NOT (@PostId BETWEEN 50 AND 56 AND @RollId IN(2,5)
 AND EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@Mahal AND C.IsActive=1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3))
 THROW 57003,N'دسترسی مجاز نیست.',1;

 SELECT P.ProjectId INTO #VisibleProjects FROM TaskManagementV2.Projects P
 WHERE P.IsDeleted=0 AND (@IsSetad=1 OR (P.StatusCode='ACTIVE' AND EXISTS(
  SELECT 1 FROM TaskManagementV2.Tasks T JOIN TaskManagementV2.Targets G ON G.TaskId=T.TaskId
  WHERE T.ProjectId=P.ProjectId AND T.IsDeleted=0 AND G.ProvinceCityId=@Mahal AND G.IsPublished=1)));
 CREATE UNIQUE CLUSTERED INDEX IX_TM2_Visible ON #VisibleProjects(ProjectId);
 SELECT @IsSetad AS IsSetad,
  CASE WHEN @IsSetad=1 THEN N'ستاد' ELSE COALESCE((SELECT TOP(1) Name FROM dbo.Citys WHERE CityId=@Mahal),N'استان') END ScopeName,
  (SELECT COUNT_BIG(*) FROM #VisibleProjects) AS ProjectCount,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.Tasks T JOIN #VisibleProjects V ON V.ProjectId=T.ProjectId
   WHERE T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal AND G.IsPublished=1))) AS TaskCount,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.Targets G JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
   JOIN #VisibleProjects V ON V.ProjectId=T.ProjectId WHERE T.IsDeleted=0 AND (@IsSetad=1 OR (G.ProvinceCityId=@Mahal AND G.IsPublished=1))) AS TargetCount,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.ProgressRecords R JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
   JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
   JOIN #VisibleProjects V ON V.ProjectId=T.ProjectId
   WHERE T.IsDeleted=0 AND R.IsDeleted=0 AND (@IsSetad=1 OR (G.ProvinceCityId=@Mahal AND G.IsPublished=1))) AS ReportCount;
 SELECT P.ProjectId,P.Title,P.StatusCode,P.StartDatePersian,P.EndDatePersian,
   (SELECT COUNT_BIG(*) FROM TaskManagementV2.Tasks T WHERE T.ProjectId=P.ProjectId AND T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal AND G.IsPublished=1))) TaskCount
 FROM TaskManagementV2.Projects P JOIN #VisibleProjects V ON V.ProjectId=P.ProjectId ORDER BY P.ProjectId DESC;
 SELECT G.TargetId,P.Title ProjectTitle,T.Title TaskTitle,G.PersianYear,G.Quarter,G.TargetValue,
  G.ProvinceCityId,COALESCE(C.Name,N'') ProvinceName,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.Assignments A WHERE A.TargetId=G.TargetId AND A.IsActive=1) AssigneeCount,
  COALESCE((SELECT SUM(R.ActualValue) FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.ProgressRecords R ON R.AssignmentId=A.AssignmentId
    WHERE A.TargetId=G.TargetId AND R.IsDeleted=0 AND R.ReviewStatus='APPROVED'),0) ApprovedValue
 FROM TaskManagementV2.Targets G JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId JOIN #VisibleProjects V ON V.ProjectId=P.ProjectId
 LEFT JOIN dbo.Citys C ON C.CityId=G.ProvinceCityId
 WHERE @IsSetad=1 OR (G.ProvinceCityId=@Mahal AND G.IsPublished=1)
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
 WHERE A.IsActive=1 AND (@IsSetad=1 OR (G.ProvinceCityId=@Mahal AND G.IsPublished=1))
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
 IF @ProjectId IS NOT NULL AND EXISTS(
    SELECT 1 FROM TaskManagementV2.Targets G
    JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
    JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
    WHERE P.ProjectId=@ProjectId AND G.IsPublished=1
      AND (ISNULL(P.StartDatePersian,'')<>ISNULL(@StartDatePersian,'') OR ISNULL(P.EndDatePersian,'')<>ISNULL(@EndDatePersian,'')))
   THROW 57231,N'برای تغییر بازه پروژه، ابتدا اهداف منتشرشده را لغو انتشار کنید.',1;
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
 IF @TaskId IS NOT NULL AND EXISTS(
   SELECT 1 FROM TaskManagementV2.Tasks T JOIN TaskManagementV2.Targets G ON G.TaskId=T.TaskId
   WHERE T.TaskId=@TaskId AND G.IsPublished=1
    AND (ISNULL(T.StartDatePersian,'')<>ISNULL(@StartDatePersian,'') OR ISNULL(T.DueDatePersian,'')<>ISNULL(@DueDatePersian,'')))
 THROW 57232,N'برای تغییر بازه وظیفه، ابتدا اهداف منتشرشده را لغو انتشار کنید.',1;
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
 AND T.IsDeleted=0 AND G.ProvinceCityId=@Mahal AND G.IsPublished=1))))
 THROW 57003,N'پروژه خارج از محدوده مجاز است.',1;
 SELECT ProjectId,Title,Description,StartDatePersian,EndDatePersian,StatusCode
 FROM TaskManagementV2.Projects WHERE ProjectId=@ProjectId;
 SELECT T.TaskId,T.ProjectId,T.Title,T.Description,T.StartDatePersian,T.DueDatePersian,
 (SELECT COUNT_BIG(*) FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId
   AND (@IsSetad=1 OR (G.ProvinceCityId=@Mahal AND G.IsPublished=1))) TargetCount
 FROM TaskManagementV2.Tasks T
 WHERE T.ProjectId=@ProjectId AND T.IsDeleted=0 AND (@IsSetad=1 OR EXISTS(
 SELECT 1 FROM TaskManagementV2.Targets G WHERE G.TaskId=T.TaskId AND G.ProvinceCityId=@Mahal AND G.IsPublished=1))
 ORDER BY T.TaskId DESC;
END;
GO

/* PHASE 3: annual and quarterly targets, provincial delegation, explicit publication. */
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_GetTaskPlanning
 @UserId BIGINT,@TaskId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
   WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57301,N'دسترسی به برنامه‌ریزی فقط برای ستاد مجاز است.',1;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Tasks T
   JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
   WHERE T.TaskId=@TaskId AND T.IsDeleted=0 AND P.IsDeleted=0)
  THROW 57302,N'وظیفه معتبر پیدا نشد.',1;
 SELECT C.CityId ProvinceCityId,COALESCE(NULLIF(C.Name,N''),C.FullName) ProvinceName
 FROM dbo.Citys C WHERE C.IsActive=1 AND C.CityId<>1
 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3
 ORDER BY C.Name,C.CityId;
 SELECT G.TargetId,G.TaskId,G.ProvinceCityId,COALESCE(C.Name,C.FullName,N'') ProvinceName,
   G.PersianYear,G.Quarter,G.TargetValue,G.IsPublished,
   (SELECT COUNT_BIG(*) FROM TaskManagementV2.Assignments A WHERE A.TargetId=G.TargetId AND A.IsActive=1) AS AssigneeCount,
   (SELECT COUNT_BIG(*) FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.ProgressRecords R
    ON R.AssignmentId=A.AssignmentId WHERE A.TargetId=G.TargetId) AS RecordCount
 FROM TaskManagementV2.Targets G JOIN dbo.Citys C ON C.CityId=G.ProvinceCityId
 WHERE G.TaskId=@TaskId
 ORDER BY G.PersianYear DESC,G.Quarter,G.ProvinceCityId;
 SELECT A.AssignmentId,A.TargetId,A.UserId,
    COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر '+CONVERT(NVARCHAR(30),A.UserId)) AssigneeName,
    U.PostId
 FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN dbo.Users U ON U.UserId=A.UserId LEFT JOIN dbo.Vbl_Users V ON V.UserId=U.UserId
 WHERE G.TaskId=@TaskId AND A.IsActive=1 ORDER BY A.TargetId,A.AssignmentId;
END;
GO

CREATE OR ALTER PROCEDURE TaskManagementV2.SP_GetProvinceUsers
 @UserId BIGINT,@ProvinceCityId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
  WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57301,N'دسترسی به کاربران استان فقط برای ستاد مجاز است.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@ProvinceCityId AND C.IsActive=1
  AND C.CityId<>1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3)
  THROW 57303,N'استان انتخابی معتبر نیست.',1;
 SELECT U.UserId,U.PostId,
  COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر '+CONVERT(NVARCHAR(30),U.UserId)) FullName,
  COALESCE(P.OnvanPost,N'') PostName
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=U.UserId
 WHERE U.IsActive=1 AND U.Mahal=@ProvinceCityId AND U.PostId BETWEEN 50 AND 56
 AND P.RollId IN (2,5)
 ORDER BY U.PostId,U.UserId;
END;
GO

CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SaveTarget
 @UserId BIGINT,@TaskId BIGINT,@TargetId BIGINT=NULL,@ProvinceCityId BIGINT,
 @PersianYear SMALLINT,@Quarter TINYINT,@TargetValue DECIMAL(18,2)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
   WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
 THROW 57301,N'مجوز هدف‌گذاری فقط برای ستاد است.',1;
 IF @PersianYear NOT BETWEEN 1300 AND 1600 OR @Quarter NOT BETWEEN 1 AND 4
  OR @TargetValue IS NULL OR @TargetValue<0 OR @TargetValue>9999999999999999
  THROW 57304,N'سال، فصل یا مقدار هدف معتبر نیست.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@ProvinceCityId AND C.IsActive=1
  AND C.CityId<>1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3)
  THROW 57303,N'استان انتخابی معتبر نیست.',1;
 DECLARE @PeriodStart CHAR(10)=CONCAT(CONVERT(CHAR(4),@PersianYear),
  CASE @Quarter WHEN 1 THEN '/01/01' WHEN 2 THEN '/04/01' WHEN 3 THEN '/07/01' ELSE '/10/01' END),
  @PeriodEnd CHAR(10)=CONCAT(CONVERT(CHAR(4),@PersianYear),
  CASE @Quarter WHEN 1 THEN '/03/31' WHEN 2 THEN '/06/31' WHEN 3 THEN '/09/30' ELSE '/12/30' END);
 BEGIN TRAN;
 DECLARE @ProjectStart CHAR(10),@ProjectEnd CHAR(10),@TaskStart CHAR(10),@TaskEnd CHAR(10);
 SELECT @ProjectStart=P.StartDatePersian,@ProjectEnd=P.EndDatePersian,
        @TaskStart=T.StartDatePersian,@TaskEnd=T.DueDatePersian
 FROM TaskManagementV2.Tasks T JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
 WHERE T.TaskId=@TaskId AND T.IsDeleted=0 AND P.IsDeleted=0 AND P.StatusCode<>'CLOSED';
 IF @@ROWCOUNT=0 THROW 57302,N'وظیفه یا پروژه قابل هدف‌گذاری نیست.',1;
 IF (@ProjectStart IS NOT NULL AND @ProjectStart>@PeriodEnd) OR (@ProjectEnd IS NOT NULL AND @ProjectEnd<@PeriodStart)
 OR (@TaskStart IS NOT NULL AND @TaskStart>@PeriodEnd) OR (@TaskEnd IS NOT NULL AND @TaskEnd<@PeriodStart)
 THROW 57305,N'فصل انتخابی خارج از بازه زمانی وظیفه یا پروژه است.',1;
 IF EXISTS(SELECT 1 FROM TaskManagementV2.Targets WITH(UPDLOCK,HOLDLOCK)
  WHERE TaskId=@TaskId AND ProvinceCityId=@ProvinceCityId AND PersianYear=@PersianYear
  AND Quarter=@Quarter AND (@TargetId IS NULL OR TargetId<>@TargetId))
 THROW 57306,N'برای این استان و فصل قبلاً هدف ثبت شده است.',1;
 IF @TargetId IS NULL
 BEGIN
  INSERT TaskManagementV2.Targets(TaskId,ProvinceCityId,PersianYear,Quarter,TargetValue,CreatedByUserId)
  VALUES(@TaskId,@ProvinceCityId,@PersianYear,@Quarter,@TargetValue,@UserId);
  SET @TargetId=CONVERT(BIGINT,SCOPE_IDENTITY());
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
  VALUES('TARGET',@TargetId,'CREATED',CONCAT(@ProvinceCityId,N' / ',@PersianYear,N' / ',@Quarter,N' / ',@TargetValue),@UserId);
 END
 ELSE
 BEGIN
  DECLARE @OriginalProvince BIGINT;
  SELECT @OriginalProvince=ProvinceCityId FROM TaskManagementV2.Targets WITH(UPDLOCK,HOLDLOCK)
  WHERE TargetId=@TargetId AND TaskId=@TaskId AND IsPublished=0;
  IF @OriginalProvince IS NULL THROW 57307,N'هدف منتشرشده یا نامعتبر قابل ویرایش نیست.',1;
  IF @OriginalProvince<>@ProvinceCityId AND EXISTS(SELECT 1 FROM TaskManagementV2.Assignments WHERE TargetId=@TargetId)
   THROW 57308,N'برای تغییر استان باید ابتدا انتساب‌های هدف قبلی حذف شوند.',1;
  IF EXISTS(SELECT 1 FROM TaskManagementV2.Assignments A
   JOIN TaskManagementV2.ProgressRecords R ON R.AssignmentId=A.AssignmentId WHERE A.TargetId=@TargetId)
   THROW 57309,N'هدف دارای عملکرد ثبت‌شده قابل ویرایش نیست.',1;
  UPDATE TaskManagementV2.Targets SET ProvinceCityId=@ProvinceCityId,PersianYear=@PersianYear,
    Quarter=@Quarter,TargetValue=@TargetValue WHERE TargetId=@TargetId;
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
  VALUES('TARGET',@TargetId,'UPDATED',CONCAT(@ProvinceCityId,N' / ',@PersianYear,N' / ',@Quarter,N' / ',@TargetValue),@UserId);
 END;
 COMMIT;
 SELECT @TargetId AS TargetId;
END;
GO

CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SetTargetAssignee
 @UserId BIGINT,@TargetId BIGINT,@AssigneeUserId BIGINT,@IsActive BIT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
 THROW 57301,N'مجوز تخصیص مسئول فقط برای ستاد است.',1;
 IF @IsActive IS NULL THROW 57310,N'عملیات انتساب معتبر نیست.',1;
 BEGIN TRAN;
 DECLARE @Province BIGINT,@ProjectStatus VARCHAR(15);
 SELECT @Province=G.ProvinceCityId,@ProjectStatus=P.StatusCode
 FROM TaskManagementV2.Targets G WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
 WHERE G.TargetId=@TargetId AND G.IsPublished=0 AND T.IsDeleted=0 AND P.IsDeleted=0;
 IF @Province IS NULL OR @ProjectStatus='CLOSED'
 THROW 57307,N'هدف منتشرشده یا بسته‌شده قابل تغییر انتساب نیست.',1;
 IF @IsActive=1
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
    WHERE U.UserId=@AssigneeUserId AND U.IsActive=1 AND U.Mahal=@Province
     AND U.PostId BETWEEN 50 AND 56 AND P.RollId IN (2,5))
   THROW 57311,N'مسئول انتخابی کاربر فعال همین استان نیست.',1;
  IF EXISTS(SELECT 1 FROM TaskManagementV2.Assignments WHERE TargetId=@TargetId AND UserId=@AssigneeUserId)
    UPDATE TaskManagementV2.Assignments SET IsActive=1 WHERE TargetId=@TargetId AND UserId=@AssigneeUserId;
  ELSE INSERT TaskManagementV2.Assignments(TargetId,UserId,CreatedByUserId)
    VALUES(@TargetId,@AssigneeUserId,@UserId);
 END
 ELSE
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Assignments WHERE TargetId=@TargetId AND UserId=@AssigneeUserId AND IsActive=1)
   THROW 57312,N'این کاربر در فهرست مسئولان فعال هدف وجود ندارد.',1;
  IF EXISTS(SELECT 1 FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.ProgressRecords R ON R.AssignmentId=A.AssignmentId
     WHERE A.TargetId=@TargetId AND A.UserId=@AssigneeUserId)
   THROW 57309,N'مسئول دارای سابقه عملکرد قابل حذف نیست.',1;
  UPDATE TaskManagementV2.Assignments SET IsActive=0 WHERE TargetId=@TargetId AND UserId=@AssigneeUserId;
 END;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
 VALUES('TARGET',@TargetId,CASE WHEN @IsActive=1 THEN 'ASSIGNED' ELSE 'UNASSIGNED' END,
    CONVERT(NVARCHAR(30),@AssigneeUserId),@UserId);
 COMMIT;
 SELECT @TargetId TargetId;
END;
GO

CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SetTargetPublication
 @UserId BIGINT,@TargetId BIGINT,@Publish BIT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
 THROW 57301,N'مجوز انتشار هدف فقط برای ستاد است.',1;
 IF @Publish IS NULL THROW 57310,N'نوع عملیات انتشار معتبر نیست.',1;
 BEGIN TRAN;
 DECLARE @OldPublished BIT,@ProjectStatus VARCHAR(15),@Province BIGINT;
 SELECT @OldPublished=G.IsPublished,@ProjectStatus=P.StatusCode,@Province=G.ProvinceCityId
 FROM TaskManagementV2.Targets G WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
 WHERE G.TargetId=@TargetId AND T.IsDeleted=0 AND P.IsDeleted=0;
 IF @OldPublished IS NULL THROW 57302,N'هدف معتبر یافت نشد.',1;
 IF @OldPublished=@Publish THROW 57313,N'هدف از قبل در همین وضعیت قرار دارد.',1;
 IF @Publish=1
 BEGIN
  IF @ProjectStatus<>'ACTIVE' THROW 57314,N'پیش از انتشار هدف، پروژه باید فعال باشد.',1;
  IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Assignments A JOIN dbo.Users U ON U.UserId=A.UserId
    JOIN dbo.Posts P ON P.PostId=U.PostId
    WHERE A.TargetId=@TargetId AND A.IsActive=1 AND U.IsActive=1 AND U.Mahal=@Province
      AND U.PostId BETWEEN 50 AND 56 AND P.RollId IN(2,5))
  THROW 57315,N'برای انتشار، حداقل یک مسئول فعال استان تعیین کنید.',1;
  UPDATE TaskManagementV2.Targets SET IsPublished=1,PublishedAtUtc=SYSUTCDATETIME(),PublishedByUserId=@UserId
  WHERE TargetId=@TargetId;
 END
 ELSE
 BEGIN
  IF EXISTS(SELECT 1 FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.ProgressRecords R
    ON R.AssignmentId=A.AssignmentId WHERE A.TargetId=@TargetId)
   THROW 57316,N'هدف دارای گزارش عملکرد است و نمی‌توان انتشار آن را لغو کرد.',1;
  UPDATE TaskManagementV2.Targets SET IsPublished=0,PublishedAtUtc=NULL,PublishedByUserId=NULL
  WHERE TargetId=@TargetId;
 END;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
 VALUES('TARGET',@TargetId,CASE WHEN @Publish=1 THEN 'PUBLISHED' ELSE 'UNPUBLISHED' END,@UserId);
 COMMIT;
 SELECT @TargetId TargetId;
END;
GO

CREATE OR ALTER PROCEDURE TaskManagementV2.SP_RemoveTarget
 @UserId BIGINT,@TargetId BIGINT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
 THROW 57301,N'مجوز حذف هدف فقط برای ستاد است.',1;
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Targets G WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
 WHERE G.TargetId=@TargetId AND G.IsPublished=0 AND T.IsDeleted=0 AND P.IsDeleted=0 AND P.StatusCode<>'CLOSED')
 THROW 57307,N'هدف منتشرشده یا بسته‌شده قابل حذف نیست.',1;
 IF EXISTS(SELECT 1 FROM TaskManagementV2.Assignments A JOIN TaskManagementV2.ProgressRecords R
 ON R.AssignmentId=A.AssignmentId WHERE A.TargetId=@TargetId)
 THROW 57309,N'هدف دارای سابقه عملکرد قابل حذف نیست.',1;
 DELETE FROM TaskManagementV2.Assignments WHERE TargetId=@TargetId;
 DELETE FROM TaskManagementV2.Targets WHERE TargetId=@TargetId;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
 VALUES('TARGET',@TargetId,'DELETED',@UserId);
 COMMIT;
 SELECT @TargetId TargetId;
END;
GO
/* Merat TaskManagementV2 - Phase 4: province execution and secure evidence. */
IF COL_LENGTH(N'TaskManagementV2.ProgressRecords',N'UpdatedAtUtc') IS NULL
 ALTER TABLE TaskManagementV2.ProgressRecords ADD UpdatedAtUtc DATETIME2(3) NULL;
GO
IF COL_LENGTH(N'TaskManagementV2.ProgressRecords',N'UpdatedByUserId') IS NULL
 ALTER TABLE TaskManagementV2.ProgressRecords ADD UpdatedByUserId BIGINT NULL;
GO
IF COL_LENGTH(N'TaskManagementV2.ProgressRecords',N'DeletedAtUtc') IS NULL
 ALTER TABLE TaskManagementV2.ProgressRecords ADD DeletedAtUtc DATETIME2(3) NULL;
GO
IF OBJECT_ID(N'TaskManagementV2.ProgressFiles',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.ProgressFiles(
  FileId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_ProgressFiles PRIMARY KEY,
  RecordId BIGINT NOT NULL,
  OriginalFileName NVARCHAR(180) NOT NULL,
  MimeType VARCHAR(50) NOT NULL,
  FileData VARBINARY(MAX) NOT NULL,
  CreatedByUserId BIGINT NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_ProgressFiles_Created DEFAULT SYSUTCDATETIME(),
  IsDeleted BIT NOT NULL CONSTRAINT DF_TM2_ProgressFiles_IsDeleted DEFAULT(0),
  CONSTRAINT FK_TM2_ProgressFiles_Record FOREIGN KEY(RecordId) REFERENCES TaskManagementV2.ProgressRecords(RecordId),
  CONSTRAINT FK_TM2_ProgressFiles_Uploader FOREIGN KEY(CreatedByUserId) REFERENCES dbo.Users(UserId),
  CONSTRAINT CK_TM2_ProgressFiles_Mime CHECK (MimeType IN ('image/png','image/jpeg','image/webp','application/pdf')),
  CONSTRAINT CK_TM2_ProgressFiles_Size CHECK (DATALENGTH(FileData) BETWEEN 1 AND 8388608)
 );
 CREATE INDEX IX_TM2_ProgressFiles_Record ON TaskManagementV2.ProgressFiles(RecordId,IsDeleted) INCLUDE(OriginalFileName,MimeType,CreatedAtUtc);
END;
GO
/* PHASE 5: exact review decisions and re-submissions, retained independently of current status. */
IF OBJECT_ID(N'TaskManagementV2.ProgressReviewHistory',N'U') IS NULL
BEGIN
 CREATE TABLE TaskManagementV2.ProgressReviewHistory(
  ReviewEventId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TM2_ProgressReviewHistory PRIMARY KEY,
  RecordId BIGINT NOT NULL,
  ActionCode VARCHAR(20) NOT NULL,
  FromStatus VARCHAR(15) NOT NULL,
  ToStatus VARCHAR(15) NOT NULL,
  Reason NVARCHAR(2000) NULL,
  ActorUserId BIGINT NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TM2_ProgressReviewHistory_Date DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_TM2_ProgressReviewHistory_Record FOREIGN KEY(RecordId) REFERENCES TaskManagementV2.ProgressRecords(RecordId),
  CONSTRAINT FK_TM2_ProgressReviewHistory_User FOREIGN KEY(ActorUserId) REFERENCES dbo.Users(UserId),
  CONSTRAINT CK_TM2_ProgressReviewHistory_Action CHECK(ActionCode IN('APPROVED','REJECTED','RESUBMITTED','EDITED'))
 );
 CREATE INDEX IX_TM2_ProgressReviewHistory_Record ON TaskManagementV2.ProgressReviewHistory(RecordId,ReviewEventId DESC);
END;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'TaskManagementV2.ProgressRecords') AND name=N'IX_TM2_Progress_PendingReview')
 CREATE INDEX IX_TM2_Progress_PendingReview ON TaskManagementV2.ProgressRecords(RecordId DESC)
 INCLUDE(AssignmentId,ActualValue,CreatedAtUtc) WHERE ReviewStatus='PENDING' AND IsDeleted=0;
GO
/* Six result sets: target, assignees, reports, attachments, change log, review decisions.
   Provincial users see ONLY published targets in their own active province;
   headquarters may audit goals nationally but may not enter performance. */
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_GetTargetExecution
 @UserId BIGINT,@TargetId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Mahal BIGINT,@PostId BIGINT,@RollId BIGINT,@IsSetad BIT=0,@MyAssignmentId BIGINT=NULL;
 SELECT @Mahal=U.Mahal,@PostId=U.PostId,@RollId=P.RollId
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
 WHERE U.UserId=@UserId AND U.IsActive=1;
 IF @PostId IS NULL THROW 57401,N'نشست کاربر معتبر نیست.',1;
 IF @RollId=1 AND @Mahal=1 AND @PostId BETWEEN 1 AND 5 SET @IsSetad=1;
 ELSE IF NOT (@PostId BETWEEN 50 AND 56 AND @RollId IN (2,5)
 AND EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@Mahal AND C.IsActive=1
 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3))
 THROW 57402,N'دسترسی به مأموریت مجاز نیست.',1;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.Targets G
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 WHERE G.TargetId=@TargetId AND (@IsSetad=1 OR
 (G.ProvinceCityId=@Mahal AND G.IsPublished=1 AND P.StatusCode='ACTIVE')))
 THROW 57403,N'مأموریت در محدوده مجاز شما نیست.',1;
 SELECT @MyAssignmentId=A.AssignmentId FROM TaskManagementV2.Assignments A
 WHERE A.TargetId=@TargetId AND A.UserId=@UserId AND A.IsActive=1;
 SELECT G.TargetId,G.PersianYear,G.Quarter,G.TargetValue,G.ProvinceCityId,
  C.Name ProvinceName,T.Title TaskTitle,P.Title ProjectTitle,G.IsPublished,P.StatusCode ProjectStatus,
  @IsSetad IsSetad,@MyAssignmentId MyAssignmentId,
  COALESCE(SUM(CASE WHEN R.ReviewStatus='APPROVED' THEN R.ActualValue ELSE 0 END),0) ApprovedValue,
  COALESCE(SUM(CASE WHEN R.ReviewStatus='PENDING' THEN R.ActualValue ELSE 0 END),0) PendingValue,
  COALESCE(SUM(CASE WHEN R.ReviewStatus='REJECTED' THEN R.ActualValue ELSE 0 END),0) RejectedValue,
  COUNT(R.RecordId) ReportCount
 FROM TaskManagementV2.Targets G
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId
 JOIN dbo.Citys C ON C.CityId=G.ProvinceCityId
 LEFT JOIN TaskManagementV2.Assignments A ON A.TargetId=G.TargetId
 LEFT JOIN TaskManagementV2.ProgressRecords R ON R.AssignmentId=A.AssignmentId AND R.IsDeleted=0
 WHERE G.TargetId=@TargetId
 GROUP BY G.TargetId,G.PersianYear,G.Quarter,G.TargetValue,G.ProvinceCityId,C.Name,T.Title,P.Title,G.IsPublished,P.StatusCode;
 SELECT A.AssignmentId,A.UserId,A.IsActive,
  COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر ' + CONVERT(NVARCHAR(30),A.UserId)) AssigneeName
 FROM TaskManagementV2.Assignments A LEFT JOIN dbo.Vbl_Users V ON V.UserId=A.UserId
 WHERE A.TargetId=@TargetId AND A.IsActive=1 ORDER BY A.AssignmentId;
 SELECT R.RecordId,R.AssignmentId,R.CreatedByUserId,R.ActivityDatePersian,R.Description,R.ActualValue,
  R.ReviewStatus,R.ReviewReason,R.CreatedAtUtc,R.UpdatedAtUtc,R.ReviewedAtUtc,
  COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر ' + CONVERT(NVARCHAR(30),R.CreatedByUserId)) ReporterName,
  (SELECT COUNT_BIG(*) FROM TaskManagementV2.ProgressFiles F WHERE F.RecordId=R.RecordId AND F.IsDeleted=0) FileCount
 FROM TaskManagementV2.ProgressRecords R
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=R.CreatedByUserId
 WHERE A.TargetId=@TargetId AND R.IsDeleted=0 ORDER BY R.CreatedAtUtc DESC,R.RecordId DESC;
 SELECT F.FileId,F.RecordId,F.OriginalFileName,F.MimeType,DATALENGTH(F.FileData) FileSize,F.CreatedAtUtc
 FROM TaskManagementV2.ProgressFiles F
 JOIN TaskManagementV2.ProgressRecords R ON R.RecordId=F.RecordId AND R.IsDeleted=0
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 WHERE A.TargetId=@TargetId AND F.IsDeleted=0 ORDER BY F.FileId DESC;
 SELECT L.ChangeId,L.EntityId RecordId,L.ActionCode,L.ActionDetails,L.ChangedAtUtc,
  COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر ' + CONVERT(NVARCHAR(30),L.ActorUserId)) ActorName
 FROM TaskManagementV2.ChangeLog L
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=L.ActorUserId
 WHERE L.EntityType='PROGRESS' AND EXISTS(
   SELECT 1 FROM TaskManagementV2.ProgressRecords R JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
   WHERE R.RecordId=L.EntityId AND A.TargetId=@TargetId)
 ORDER BY L.ChangeId DESC;
 /* Independent review trail: reasons remain after a rejected report is revised. */
 SELECT E.ReviewEventId,E.RecordId,E.ActionCode,E.FromStatus,E.ToStatus,E.Reason,
   E.ActorUserId,E.CreatedAtUtc,
   COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر ' + CONVERT(NVARCHAR(30),E.ActorUserId)) ActorName
 FROM TaskManagementV2.ProgressReviewHistory E
 JOIN TaskManagementV2.ProgressRecords R ON R.RecordId=E.RecordId
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=E.ActorUserId
 WHERE A.TargetId=@TargetId
 ORDER BY E.ReviewEventId DESC;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_SaveProgress
 @UserId BIGINT,@AssignmentId BIGINT,@RecordId BIGINT=NULL,
 @ActivityDatePersian CHAR(10),@Description NVARCHAR(2000),@ActualValue DECIMAL(18,2)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF @ActualValue IS NULL OR @ActualValue<=0 OR @ActualValue>9999999999999999
 THROW 57410,N'مقدار عملکرد باید بزرگ‌تر از صفر باشد.',1;
 IF NULLIF(LTRIM(RTRIM(@Description)),N'') IS NULL OR LEN(@Description)>2000
 THROW 57411,N'شرح فعالیت ضروری است و نباید بیش از ۲۰۰۰ نویسه باشد.',1;
 DECLARE @Year INT,@Month INT,@Day INT;
 IF @ActivityDatePersian IS NULL OR @ActivityDatePersian NOT LIKE '[1][3-5][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
 THROW 57412,N'تاریخ فعالیت باید شمسی و معتبر باشد.',1;
 SET @Year=TRY_CONVERT(INT,SUBSTRING(@ActivityDatePersian,1,4));
 SET @Month=TRY_CONVERT(INT,SUBSTRING(@ActivityDatePersian,6,2));
 SET @Day=TRY_CONVERT(INT,SUBSTRING(@ActivityDatePersian,9,2));
 IF @Month NOT BETWEEN 1 AND 12 OR @Day<1 OR @Day>CASE WHEN @Month<=6 THEN 31 ELSE 30 END
 THROW 57412,N'روز یا ماه تاریخ فعالیت معتبر نیست.',1;
 BEGIN TRAN;
 DECLARE @Mahal BIGINT,@PostId BIGINT,@RollId BIGINT,@TargetYear INT,@TargetQuarter INT;
 SELECT @Mahal=U.Mahal,@PostId=U.PostId,@RollId=P.RollId
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId WHERE U.UserId=@UserId AND U.IsActive=1;
 IF @PostId IS NULL OR @PostId NOT BETWEEN 50 AND 56 OR @RollId NOT IN(2,5) OR
 NOT EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@Mahal AND C.IsActive=1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3)
 THROW 57402,N'ثبت عملکرد فقط برای مسئول فعال استان مجاز است.',1;
 SELECT @TargetYear=G.PersianYear,@TargetQuarter=G.Quarter
 FROM TaskManagementV2.Assignments A WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 WHERE A.AssignmentId=@AssignmentId AND A.UserId=@UserId AND A.IsActive=1
 AND G.ProvinceCityId=@Mahal AND G.IsPublished=1 AND P.StatusCode='ACTIVE';
 IF @TargetYear IS NULL THROW 57413,N'مأموریت فعال و واگذارشده به شما یافت نشد.',1;
 IF @Year<>@TargetYear OR ((@Month-1)/3+1)<>@TargetQuarter
 THROW 57414,N'تاریخ ثبت فعالیت باید در سال و فصل هدف انتخاب‌شده باشد.',1;
 IF @RecordId IS NULL
 BEGIN
  INSERT TaskManagementV2.ProgressRecords(AssignmentId,ActivityDatePersian,Description,ActualValue,CreatedByUserId)
  VALUES(@AssignmentId,@ActivityDatePersian,LTRIM(RTRIM(@Description)),@ActualValue,@UserId);
  SET @RecordId=SCOPE_IDENTITY();
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
  VALUES('PROGRESS',@RecordId,'CREATED',@UserId);
 END
 ELSE
 BEGIN
  DECLARE @BeforeReviewStatus VARCHAR(15);
  SELECT @BeforeReviewStatus=R.ReviewStatus FROM TaskManagementV2.ProgressRecords R WITH(UPDLOCK,HOLDLOCK)
   WHERE R.RecordId=@RecordId AND R.AssignmentId=@AssignmentId AND R.CreatedByUserId=@UserId
    AND R.IsDeleted=0 AND R.ReviewStatus IN ('PENDING','REJECTED');
  IF @BeforeReviewStatus IS NULL
  THROW 57415,N'گزارش تأییدشده یا متعلق به دیگران قابل ویرایش نیست.',1;
  UPDATE TaskManagementV2.ProgressRecords SET ActivityDatePersian=@ActivityDatePersian,
   Description=LTRIM(RTRIM(@Description)),ActualValue=@ActualValue,
   ReviewStatus='PENDING',ReviewReason=NULL,ReviewedByUserId=NULL,ReviewedAtUtc=NULL,
   UpdatedAtUtc=SYSUTCDATETIME(),UpdatedByUserId=@UserId
  WHERE RecordId=@RecordId;
  INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
  VALUES('PROGRESS',@RecordId,CASE WHEN @BeforeReviewStatus='REJECTED' THEN 'RESUBMITTED' ELSE 'UPDATED' END,@UserId);
  INSERT TaskManagementV2.ProgressReviewHistory(RecordId,ActionCode,FromStatus,ToStatus,ActorUserId)
  VALUES(@RecordId,CASE WHEN @BeforeReviewStatus='REJECTED' THEN 'RESUBMITTED' ELSE 'EDITED' END,
    @BeforeReviewStatus,'PENDING',@UserId);
 END;
 COMMIT;
 SELECT @RecordId RecordId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_DeleteProgress
 @UserId BIGINT,@RecordId BIGINT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.ProgressRecords R WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 JOIN dbo.Users U ON U.UserId=@UserId AND U.IsActive=1 AND U.UserId=A.UserId
 JOIN dbo.Posts X ON X.PostId=U.PostId
 WHERE R.RecordId=@RecordId AND R.CreatedByUserId=@UserId AND R.IsDeleted=0
 AND R.ReviewStatus IN ('PENDING','REJECTED') AND A.IsActive=1
 AND U.PostId BETWEEN 50 AND 56 AND X.RollId IN (2,5) AND U.Mahal=G.ProvinceCityId
 AND G.IsPublished=1 AND P.StatusCode='ACTIVE')
 THROW 57416,N'حذف گزارش در وضعیت فعلی یا خارج از مأموریت شما مجاز نیست.',1;
 UPDATE TaskManagementV2.ProgressRecords SET IsDeleted=1,DeletedAtUtc=SYSUTCDATETIME(),UpdatedByUserId=@UserId WHERE RecordId=@RecordId;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActorUserId)
 VALUES('PROGRESS',@RecordId,'DELETED',@UserId);
 COMMIT;
 SELECT @RecordId RecordId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_AddProgressFile
 @UserId BIGINT,@RecordId BIGINT,@OriginalFileName NVARCHAR(180),@MimeType VARCHAR(50),@FileData VARBINARY(MAX)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF @MimeType NOT IN ('image/png','image/jpeg','image/webp','application/pdf') OR
 @FileData IS NULL OR DATALENGTH(@FileData) NOT BETWEEN 1 AND 8388608 OR
 NULLIF(LTRIM(RTRIM(@OriginalFileName)),N'') IS NULL
 THROW 57420,N'فایل یا نوع پیوست مجاز نیست.',1;
 BEGIN TRAN;
 IF NOT EXISTS(SELECT 1 FROM TaskManagementV2.ProgressRecords R WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 JOIN dbo.Users U ON U.UserId=@UserId AND U.IsActive=1 AND U.UserId=A.UserId
 JOIN dbo.Posts X ON X.PostId=U.PostId
 WHERE R.RecordId=@RecordId AND R.CreatedByUserId=@UserId AND R.IsDeleted=0 AND R.ReviewStatus='PENDING'
 AND A.IsActive=1 AND G.IsPublished=1 AND P.StatusCode='ACTIVE' AND U.Mahal=G.ProvinceCityId
 AND U.PostId BETWEEN 50 AND 56 AND X.RollId IN(2,5))
 THROW 57421,N'بارگذاری فایل فقط برای گزارش در انتظار بررسی خودتان مجاز است.',1;
 IF (SELECT COUNT_BIG(*) FROM TaskManagementV2.ProgressFiles WHERE RecordId=@RecordId AND IsDeleted=0)>=8
 THROW 57422,N'حداکثر هشت پیوست برای هر گزارش مجاز است.',1;
 INSERT TaskManagementV2.ProgressFiles(RecordId,OriginalFileName,MimeType,FileData,CreatedByUserId)
 VALUES(@RecordId,@OriginalFileName,@MimeType,@FileData,@UserId);
 DECLARE @FileId BIGINT=SCOPE_IDENTITY();
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
 VALUES('PROGRESS',@RecordId,'FILE_ADDED',N'پیوست ' + CONVERT(NVARCHAR(30),@FileId),@UserId);
 COMMIT;
 SELECT @FileId FileId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_RemoveProgressFile
 @UserId BIGINT,@FileId BIGINT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRAN;
 DECLARE @RecordId BIGINT;
 SELECT @RecordId=R.RecordId FROM TaskManagementV2.ProgressFiles F WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.ProgressRecords R ON R.RecordId=F.RecordId
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 JOIN dbo.Users U ON U.UserId=@UserId AND U.IsActive=1 AND U.UserId=A.UserId
 JOIN dbo.Posts X ON X.PostId=U.PostId
 WHERE F.FileId=@FileId AND F.IsDeleted=0 AND R.IsDeleted=0 AND R.CreatedByUserId=@UserId
 AND R.ReviewStatus='PENDING' AND A.IsActive=1 AND G.IsPublished=1 AND P.StatusCode='ACTIVE'
 AND U.Mahal=G.ProvinceCityId AND U.PostId BETWEEN 50 AND 56 AND X.RollId IN(2,5);
 IF @RecordId IS NULL THROW 57423,N'حذف این پیوست مجاز نیست.',1;
 UPDATE TaskManagementV2.ProgressFiles SET IsDeleted=1 WHERE FileId=@FileId;
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
 VALUES('PROGRESS',@RecordId,'FILE_REMOVED',N'پیوست ' + CONVERT(NVARCHAR(30),@FileId),@UserId);
 COMMIT;
 SELECT @FileId FileId;
END;
GO
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_ReadProgressFile
 @UserId BIGINT,@FileId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Mahal BIGINT,@PostId BIGINT,@RollId BIGINT,@IsSetad BIT=0;
 SELECT @Mahal=U.Mahal,@PostId=U.PostId,@RollId=P.RollId
 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId WHERE U.UserId=@UserId AND U.IsActive=1;
 IF @PostId IS NULL THROW 57401,N'نشست کاربر معتبر نیست.',1;
 IF @RollId=1 AND @Mahal=1 AND @PostId BETWEEN 1 AND 5 SET @IsSetad=1;
 ELSE IF NOT (@PostId BETWEEN 50 AND 56 AND @RollId IN(2,5)
 AND EXISTS(SELECT 1 FROM dbo.Citys C WHERE C.CityId=@Mahal AND C.IsActive=1 AND LEN(CONVERT(VARCHAR(20),C.CityId))=3))
 THROW 57402,N'دسترسی به پیوست مجاز نیست.',1;
 SELECT F.FileData,F.MimeType,F.OriginalFileName
 FROM TaskManagementV2.ProgressFiles F
 JOIN TaskManagementV2.ProgressRecords R ON R.RecordId=F.RecordId AND R.IsDeleted=0
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 WHERE F.FileId=@FileId AND F.IsDeleted=0
 AND (@IsSetad=1 OR (G.ProvinceCityId=@Mahal AND G.IsPublished=1 AND P.StatusCode='ACTIVE'));
END;
GO

/* PHASE 5: only authorized central headquarters can make a final decision. */
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_ReviewProgress
 @UserId BIGINT,@RecordId BIGINT,@Decision VARCHAR(12),@Reason NVARCHAR(2000)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF @Decision NOT IN('APPROVED','REJECTED') OR @Decision IS NULL
  THROW 57510,N'نوع تصمیم معتبر نیست.',1;
 SET @Reason=NULLIF(LTRIM(RTRIM(@Reason)),N'');
 IF @Decision='REJECTED' AND (@Reason IS NULL OR LEN(@Reason)<5 OR LEN(@Reason)>2000)
  THROW 57511,N'برای برگشت گزارش، دلیل متنی حداقل پنج نویسه الزامی است.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
   WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
  THROW 57501,N'مجوز بررسی گزارش فقط برای کاربران مجاز ستاد است.',1;
 BEGIN TRAN;
 DECLARE @Current VARCHAR(15),@Reporter BIGINT;
 SELECT @Current=R.ReviewStatus,@Reporter=R.CreatedByUserId
 FROM TaskManagementV2.ProgressRecords R WITH(UPDLOCK,HOLDLOCK)
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 WHERE R.RecordId=@RecordId AND R.IsDeleted=0 AND R.ReviewStatus='PENDING'
  AND A.IsActive=1 AND G.IsPublished=1;
 IF @Current IS NULL THROW 57512,N'این گزارش در انتظار بررسی نیست یا مأموریت آن فعال نیست.',1;
 IF @Reporter=@UserId THROW 57513,N'تأیید گزارش ثبت‌شده توسط خودتان مجاز نیست.',1;
 UPDATE TaskManagementV2.ProgressRecords
 SET ReviewStatus=@Decision,
  ReviewReason=CASE WHEN @Decision='REJECTED' THEN @Reason ELSE NULL END,
  ReviewedByUserId=@UserId,ReviewedAtUtc=SYSUTCDATETIME(),
  UpdatedAtUtc=SYSUTCDATETIME(),UpdatedByUserId=@UserId
 WHERE RecordId=@RecordId AND IsDeleted=0 AND ReviewStatus='PENDING';
 IF @@ROWCOUNT<>1 THROW 57514,N'وضعیت گزارش هم‌زمان تغییر کرده است؛ اطلاعات را تازه‌سازی کنید.',1;
 INSERT TaskManagementV2.ProgressReviewHistory(RecordId,ActionCode,FromStatus,ToStatus,Reason,ActorUserId)
 VALUES(@RecordId,@Decision,@Current,@Decision,CASE WHEN @Decision='REJECTED' THEN @Reason ELSE NULL END,@UserId);
 INSERT TaskManagementV2.ChangeLog(EntityType,EntityId,ActionCode,ActionDetails,ActorUserId)
 VALUES('PROGRESS',@RecordId,@Decision,
 CASE WHEN @Decision='REJECTED' THEN LEFT(@Reason,600) ELSE N'تأیید عملکرد استان' END,@UserId);
 COMMIT;
 SELECT @RecordId RecordId,@Decision ReviewStatus;
END;
GO
/* Scoped review inbox for central staff. Counts use unique live progress records. */
CREATE OR ALTER PROCEDURE TaskManagementV2.SP_GetProgressReviewInbox @UserId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
  WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND U.PostId BETWEEN 1 AND 5 AND P.RollId=1)
 THROW 57501,N'دسترسی به پیشخوان بررسی فقط برای ستاد است.',1;
 SELECT COUNT_BIG(1) PendingCount,COALESCE(SUM(R.ActualValue),0) PendingValue
 FROM TaskManagementV2.ProgressRecords R
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId AND A.IsActive=1
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId AND G.IsPublished=1
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 WHERE R.IsDeleted=0 AND R.ReviewStatus='PENDING';
 SELECT TOP(100) R.RecordId,G.TargetId,R.CreatedByUserId,R.ActivityDatePersian,R.ActualValue,R.CreatedAtUtc,
  COALESCE(C.Name,C.FullName,N'') ProvinceName,P.Title ProjectTitle,T.Title TaskTitle,
  COALESCE(NULLIF(LTRIM(RTRIM(V.FullName)),N''),N'کاربر ' + CONVERT(NVARCHAR(30),R.CreatedByUserId)) ReporterName
 FROM TaskManagementV2.ProgressRecords R
 JOIN TaskManagementV2.Assignments A ON A.AssignmentId=R.AssignmentId AND A.IsActive=1
 JOIN TaskManagementV2.Targets G ON G.TargetId=A.TargetId AND G.IsPublished=1
 JOIN TaskManagementV2.Tasks T ON T.TaskId=G.TaskId AND T.IsDeleted=0
 JOIN TaskManagementV2.Projects P ON P.ProjectId=T.ProjectId AND P.IsDeleted=0
 JOIN dbo.Citys C ON C.CityId=G.ProvinceCityId
 LEFT JOIN dbo.Vbl_Users V ON V.UserId=R.CreatedByUserId
 WHERE R.IsDeleted=0 AND R.ReviewStatus='PENDING'
 ORDER BY R.CreatedAtUtc ASC,R.RecordId ASC;
END;
GO

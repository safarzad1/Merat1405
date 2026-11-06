/*
  MeratDB - اخبار / جستجوی افراد وابسته (اصلاح نهایی)
  Executable on existing database (not a full DB creation script).
  1) FullNameSearchCompact: Arabic/Persian yeh & kaf normalized, no whitespace
  2) one-time data fill + automatic maintenance + targeted indexes
  3) replaces the actual procedure used by /Api/Akhbar/SearchPersons
  Preserves news edit permissions and excludes persons already attached to news.
*/
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER FUNCTION [Davtalab].[FN_MeratCompactPersonName](@Text NVARCHAR(400))
RETURNS NVARCHAR(400)
AS
BEGIN
    DECLARE @R NVARCHAR(400) = ISNULL(@Text, N'');
    SET @R = [dbo].[NormalizePersianText](@R);
    SET @R = REPLACE(@R,N' ',N'');
    SET @R = REPLACE(@R,NCHAR(8204),N''); -- نیم فاصله
    SET @R = REPLACE(@R,NCHAR(8205),N''); -- اتصال نامرئی
    SET @R = REPLACE(@R,NCHAR(160),N'');  -- فاصله نشکن
    SET @R = REPLACE(@R,NCHAR(8239),N''); -- فاصله نشکن باریک
    SET @R = REPLACE(@R,NCHAR(9),N'');
    SET @R = REPLACE(@R,NCHAR(10),N'');
    SET @R = REPLACE(@R,NCHAR(13),N'');
    SET @R = REPLACE(@R,N'ـ',N'');
    RETURN @R;
END;
GO

/* Compatible with a previous run of the search-column migration. */
IF COL_LENGTH(N'Davtalab.Ashkhas',N'FullNameSearchCompact') IS NULL
    ALTER TABLE [Davtalab].[Ashkhas]
    ADD [FullNameSearchCompact] NVARCHAR(400) NULL;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'Davtalab.Ashkhas')
    AND name=N'FullNameSearchCompact' AND is_computed=1)
    THROW 51012,N'ستون جستجو قبلاً به‌صورت محاسباتی ساخته شده است؛ ساختار آن را بررسی کنید.',1;
GO

/* Refill only changed/missing names, including updates made since prior migrations. */
UPDATE A SET [FullNameSearchCompact]=[Davtalab].[FN_MeratCompactPersonName](CONCAT(A.[FirstName],A.[LastName]))
FROM [Davtalab].[Ashkhas] A
WHERE A.[FullNameSearchCompact] IS NULL
   OR A.[FullNameSearchCompact] <> [Davtalab].[FN_MeratCompactPersonName](CONCAT(A.[FirstName],A.[LastName]));
GO

CREATE OR ALTER TRIGGER [Davtalab].[TR_Merat_AshkhasCompactName]
ON [Davtalab].[Ashkhas]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT (UPDATE([FirstName]) OR UPDATE([LastName])) RETURN;
    UPDATE A
      SET A.[FullNameSearchCompact] = [Davtalab].[FN_MeratCompactPersonName](CONCAT(I.[FirstName],I.[LastName]))
    FROM [Davtalab].[Ashkhas] A
    INNER JOIN inserted I ON I.[ShomarehParvandeh]=A.[ShomarehParvandeh]
    WHERE A.[FullNameSearchCompact] IS NULL
       OR A.[FullNameSearchCompact] <> [Davtalab].[FN_MeratCompactPersonName](CONCAT(I.[FirstName],I.[LastName]));
END;
GO

/* NVARCHAR(400) is indexable; DO NOT index NameKamel_Code (NVARCHAR(2500)) as an index key. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
   WHERE object_id=OBJECT_ID(N'Davtalab.Ashkhas') AND name=N'IX_Merat_Ashkhas_NameCompact')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Merat_Ashkhas_NameCompact]
    ON [Davtalab].[Ashkhas]([FullNameSearchCompact],[IsDelete])
    INCLUDE ([CodeMelli],[FirstName],[LastName],[NamePedar]);
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes
   WHERE object_id=OBJECT_ID(N'Davtalab.Ashkhas') AND name=N'IX_Merat_Ashkhas_LastName')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Merat_Ashkhas_LastName]
    ON [Davtalab].[Ashkhas]([LastName],[IsDelete])
    INCLUDE ([CodeMelli],[FirstName],[NamePedar]);
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes
   WHERE object_id=OBJECT_ID(N'Davtalab.Ashkhas') AND name=N'IX_Merat_Ashkhas_CodeMelli')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Merat_Ashkhas_CodeMelli]
    ON [Davtalab].[Ashkhas]([CodeMelli],[IsDelete])
    INCLUDE ([FirstName],[LastName],[NamePedar]);
END;
GO

/* Important: the existing news API executes Akhbar.SP_SearchAshkhas, not Davtalab.SP_SearchAshkhasPicker. */
CREATE OR ALTER PROCEDURE [Akhbar].[SP_SearchAshkhas]
    @ShomareKhabar BIGINT,
    @UserId BIGINT,
    @Search NVARCHAR(150),
    @Page INT = 1,
    @SizePage INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanEditKhabar](@ShomareKhabar,@UserId)=0
        THROW 51000,N'خبر در کارتابل شما نیست و امکان اصلاح اشخاص وابسته را ندارید.',1;

    SET @Page=CASE WHEN ISNULL(@Page,0)<1 THEN 1 WHEN @Page>100 THEN 100 ELSE @Page END;
    SET @SizePage=CASE WHEN ISNULL(@SizePage,0)<1 THEN 10 WHEN @SizePage>50 THEN 50 ELSE @SizePage END;
    DECLARE @Q NVARCHAR(150)=LTRIM(RTRIM([dbo].[NormalizePersianText](ISNULL(@Search,N''))));
    DECLARE @Compact NVARCHAR(400)=[Davtalab].[FN_MeratCompactPersonName](@Q);
    DECLARE @Take INT=@Page*@SizePage;

    IF LEN(@Compact)<2
    BEGIN
        SELECT TOP(0)
          CAST(NULL AS BIGINT) AS ShomarehParvandeh,
          CAST(NULL AS NVARCHAR(10)) AS CodeMelli,
          CAST(NULL AS NVARCHAR(50)) AS FirstName,
          CAST(NULL AS NVARCHAR(150)) AS LastName,
          CAST(NULL AS NVARCHAR(50)) AS NamePedar,
          CAST(0 AS BIGINT) AS TotalCount;
        RETURN;
    END;

    DECLARE @Digits NVARCHAR(150)=TRANSLATE(@Q,N'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',N'01234567890123456789');
    DECLARE @IsDigits BIT=CASE WHEN @Digits<>N'' AND @Digits COLLATE Latin1_General_BIN2 NOT LIKE N'%[^0-9]%' THEN 1 ELSE 0 END;
    DECLARE @FileNo BIGINT=CASE WHEN @IsDigits=1 THEN TRY_CONVERT(BIGINT,@Digits) ELSE NULL END;

    IF @IsDigits=1
    BEGIN
        ;WITH NumericMatches AS
        (
           SELECT A.[ShomarehParvandeh],A.[CodeMelli],A.[FirstName],A.[LastName],A.[NamePedar],
                  COUNT_BIG(1) OVER() AS [TotalCount]
           FROM [Davtalab].[Ashkhas] A
           WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
             AND (A.[CodeMelli] LIKE @Digits+N'%' OR A.[ShomarehParvandeh]=@FileNo)
             AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
               WHERE K.[ShomareKhabar]=@ShomareKhabar
                 AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        )
        SELECT [ShomarehParvandeh],[CodeMelli],[FirstName],[LastName],[NamePedar],[TotalCount]
        FROM NumericMatches ORDER BY [CodeMelli],[ShomarehParvandeh]
        OFFSET (@Page-1)*@SizePage ROWS FETCH NEXT @SizePage ROWS ONLY
        OPTION (RECOMPILE);
        RETURN;
    END;

    /* Literal LIKE search: '%' and '_' in input are treated as normal text. */
    DECLARE @EscapedCompact NVARCHAR(400)=REPLACE(REPLACE(REPLACE(REPLACE(@Compact,N'~',N'~~'),N'%',N'~%'),N'_',N'~_'),N'[',N'~[');
    DECLARE @EscapedQ NVARCHAR(400)=REPLACE(REPLACE(REPLACE(REPLACE(@Q,N'~',N'~~'),N'%',N'~%'),N'_',N'~_'),N'[',N'~[');
    DECLARE @NamePrefix NVARCHAR(400)=@EscapedCompact+N'%';
    DECLARE @NameContains NVARCHAR(400)=N'%'+@EscapedCompact+N'%';
    DECLARE @RawPrefix NVARCHAR(400)=@EscapedQ+N'%';
    DECLARE @RawContains NVARCHAR(400)=N'%'+@EscapedQ+N'%';

    /* Legacy name-to-code function is evaluated ONCE on the user input. */
    DECLARE @CodeSearch NVARCHAR(2000)=[dbo].[CreateString2String](@Q);

    CREATE TABLE #Matches(ShomarehParvandeh BIGINT NOT NULL PRIMARY KEY, RankValue TINYINT NOT NULL);

    /* Fast indexed search: first + last, with no spaces / ZWNJ and normalized Arabic letters. */
    INSERT INTO #Matches(ShomarehParvandeh,RankValue)
    SELECT TOP (@Take) A.[ShomarehParvandeh],10
    FROM [Davtalab].[Ashkhas] A
    WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
      AND A.[FullNameSearchCompact] LIKE @NamePrefix ESCAPE N'~'
      AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
          WHERE K.[ShomareKhabar]=@ShomareKhabar
            AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
    ORDER BY A.[FullNameSearchCompact],A.[ShomarehParvandeh];

    IF (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],20
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND A.[LastName] LIKE @RawPrefix ESCAPE N'~'
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[LastName],A.[ShomarehParvandeh];
    END;

    IF (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],30
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND A.[NamePedar] LIKE @RawPrefix ESCAPE N'~'
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[ShomarehParvandeh];
    END;

    /* Existing legacy NameKamel_Code remains usable, but is not created as an index key. */
    IF NULLIF(@CodeSearch,N'') IS NOT NULL AND (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],40
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND A.[NameKamel_Code] LIKE @CodeSearch+N'%'
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[ShomarehParvandeh];
    END;

    /* Wider fallback for surname or inner-word fragments, only if prefix searches are insufficient. */
    IF (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],50
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND (A.[FullNameSearchCompact] LIKE @NameContains ESCAPE N'~'
               OR A.[NamePedar] LIKE @RawContains ESCAPE N'~')
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[ShomarehParvandeh];
    END;

    ;WITH Ranked AS
    (
       SELECT A.[ShomarehParvandeh],A.[CodeMelli],A.[FirstName],A.[LastName],A.[NamePedar],
              COUNT_BIG(1) OVER() AS [TotalCount],M.[RankValue]
       FROM #Matches M JOIN [Davtalab].[Ashkhas] A
         ON A.[ShomarehParvandeh]=M.[ShomarehParvandeh]
    )
    SELECT [ShomarehParvandeh],[CodeMelli],[FirstName],[LastName],[NamePedar],[TotalCount]
    FROM Ranked ORDER BY [RankValue],[LastName],[FirstName],[ShomarehParvandeh]
    OFFSET (@Page-1)*@SizePage ROWS FETCH NEXT @SizePage ROWS ONLY;
END;
GO

/* Quick smoke check after deployment (use an editable news and its real user):
EXEC [Akhbar].[SP_SearchAshkhas] @ShomareKhabar=16,@UserId=123,@Search=N'علی رضا',@Page=1,@SizePage=12;
EXEC [Akhbar].[SP_SearchAshkhas] @ShomareKhabar=16,@UserId=123,@Search=N'علیرضا', @Page=1,@SizePage=12;
EXEC [Akhbar].[SP_SearchAshkhas] @ShomareKhabar=16,@UserId=123,@Search=N'كاظمی',  @Page=1,@SizePage=12;
*/



/* News PostId 70: manual names are not identities in Davtalab.Ashkhas. */
IF OBJECT_ID(N'Akhbar.KhabarManualPersons',N'U') IS NULL
BEGIN
 CREATE TABLE Akhbar.KhabarManualPersons
 (
    ManualPersonId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Akhbar_KhabarManualPersons PRIMARY KEY,
    ShomareKhabar BIGINT NOT NULL,
    FullName NVARCHAR(200) NOT NULL,
    FatherName NVARCHAR(100) NULL,
    IsDelete BIT NOT NULL CONSTRAINT DF_KhabarManualPersons_IsDelete DEFAULT(0),
    CreateUserId BIGINT NOT NULL,
    CreateDateTime NVARCHAR(20) NOT NULL,
    LastEditUserId BIGINT NULL,
    LastEditDateTime NVARCHAR(20) NULL,
    CONSTRAINT FK_KhabarManualPersons_Khabar FOREIGN KEY (ShomareKhabar) REFERENCES Akhbar.Khabar(ShomareKhabar)
 );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'Akhbar.KhabarManualPersons') AND name=N'IX_KhabarManualPersons_Active')
 CREATE INDEX IX_KhabarManualPersons_Active ON Akhbar.KhabarManualPersons(ShomareKhabar,IsDelete) INCLUDE(FullName,FatherName);
GO
CREATE OR ALTER PROCEDURE Akhbar.SP_GetManualKhabarPersons
 @ShomareKhabar BIGINT,@UserId BIGINT
AS
BEGIN
 SET NOCOUNT ON;
 IF Akhbar.FN_CanViewKhabar(@ShomareKhabar,@UserId)=0
   THROW 51970,N'اجازه مشاهده اشخاص وابسته این خبر را ندارید.',1;
 SELECT -ManualPersonId AS KhabarShakhsId, CAST(0 AS BIGINT) AS ShomarehParvandeh,
        FullName AS FirstName, CAST(N'' AS NVARCHAR(100)) AS LastName,
        FatherName AS NamePedar, CAST(1 AS BIT) AS IsManual, CreateDateTime
 FROM Akhbar.KhabarManualPersons
 WHERE ShomareKhabar=@ShomareKhabar AND IsDelete=0
 ORDER BY ManualPersonId DESC;
END
GO
CREATE OR ALTER PROCEDURE Akhbar.SP_ManageManualKhabarPerson
 @ShomareKhabar BIGINT,@UserId BIGINT,@PersonId BIGINT=NULL,
 @Action VARCHAR(10),@FullName NVARCHAR(200)=NULL,@FatherName NVARCHAR(100)=NULL
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserId=@UserId AND PostId=70 AND IsActive=1)
    THROW 51971,N'ثبت دستی اشخاص فقط برای نماینده شهرستان مجاز است.',1;
 IF Akhbar.FN_CanEditKhabar(@ShomareKhabar,@UserId)=0
    THROW 51972,N'اجازه تغییر افراد این خبر را ندارید.',1;
 IF @Action NOT IN('add','edit','delete') THROW 51973,N'عملیات نامعتبر است.',1;
 SET @FullName=NULLIF(LTRIM(RTRIM(@FullName)),N'');
 SET @FatherName=NULLIF(LTRIM(RTRIM(@FatherName)),N'');
 IF @Action<>'delete' AND (@FullName IS NULL OR LEN(@FullName)<2 OR LEN(@FullName)>200 OR LEN(ISNULL(@FatherName,N''))>100)
    THROW 51974,N'نام کامل نامعتبر است.',1;
 IF @Action='add'
 BEGIN
    INSERT INTO Akhbar.KhabarManualPersons(ShomareKhabar,FullName,FatherName,CreateUserId,CreateDateTime)
    VALUES(@ShomareKhabar,@FullName,@FatherName,@UserId,dbo.FarsiDateTimeNow());
    SELECT SCOPE_IDENTITY() AS PersonId;
    RETURN;
 END
 IF @PersonId IS NULL OR @PersonId<=0 THROW 51975,N'شناسه شخص نامعتبر است.',1;
 IF @Action='edit'
    UPDATE Akhbar.KhabarManualPersons SET FullName=@FullName,FatherName=@FatherName,
    LastEditUserId=@UserId,LastEditDateTime=dbo.FarsiDateTimeNow()
    WHERE ManualPersonId=@PersonId AND ShomareKhabar=@ShomareKhabar AND IsDelete=0;
 ELSE
    UPDATE Akhbar.KhabarManualPersons SET IsDelete=1,LastEditUserId=@UserId,
    LastEditDateTime=dbo.FarsiDateTimeNow()
    WHERE ManualPersonId=@PersonId AND ShomareKhabar=@ShomareKhabar AND IsDelete=0;
 IF @@ROWCOUNT<>1 THROW 51976,N'شخص پیدا نشد یا قبلاً حذف شده است.',1;
 SELECT @PersonId AS PersonId;
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarNextDestination]
    @ShomareKhabar BIGINT,
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE
      @FromMahal BIGINT,@FromPostId BIGINT,@FromRollId INT,
      @CreateUserId BIGINT,@CurrentUserId BIGINT,
      @ToUserId BIGINT,@ToPostId BIGINT,@ToMahal BIGINT,@ToRollId INT,
      @HozeMahal BIGINT,@OstanMahal BIGINT,
      @ToFullName NVARCHAR(500),@ToOnvanPost NVARCHAR(500),@ToNameMahal NVARCHAR(1000),
      @NoeEghdam NVARCHAR(50),@IsFinal BIT=0,
      @CurrentStatusCode NVARCHAR(60),@CurrentStatusUser BIGINT,
      @CurrentStatusPost BIGINT,@CurrentStatusMahal BIGINT;

    SELECT @FromMahal=U.[Mahal],@FromPostId=U.[PostId],@FromRollId=P.[RollId]
    FROM [dbo].[Users] U
    INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
    WHERE U.[UserId]=@UserId AND U.[IsActive]=1 AND P.[RollId] IN(1,2,3,4);

    IF @FromMahal IS NULL OR @FromPostId IS NULL
      THROW 51000,N'کاربر فعال در ساختار اخبار یافت نشد.',1;

    SELECT @CreateUserId=K.[CreateUserId],@CurrentStatusCode=K.[CurrentStatusCode],
           @CurrentStatusUser=K.[CurrentUserId],@CurrentStatusPost=K.[CurrentPostId],
           @CurrentStatusMahal=K.[CurrentMahal]
    FROM [Akhbar].[Khabar] K
    WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[IsDelete]=0;

    IF @CreateUserId IS NULL THROW 51000,N'خبر یافت نشد.',1;
    IF @CurrentStatusCode=N'PISHNEVIS'
       AND EXISTS(SELECT 1 FROM Akhbar.KhabarKartabl WHERE ShomareKhabar=@ShomareKhabar AND IsActive=1)
       THROW 51701,N'پیش‌نویس دارای کارتابل فعال نامعتبر است.',1;
    IF @CurrentStatusCode<>N'PISHNEVIS'
       AND (SELECT COUNT_BIG(*) FROM Akhbar.KhabarKartabl WHERE ShomareKhabar=@ShomareKhabar AND IsActive=1)<>1
       THROW 51702,N'تعداد کارتابل‌های فعال خبر باید دقیقاً یک باشد.',1;
    IF @CurrentStatusCode<>N'PISHNEVIS'
       AND @CurrentStatusCode NOT LIKE N'KARTABL_%'
       AND @CurrentStatusCode NOT LIKE N'BARGASHT_%'
      THROW 51507,N'این خبر قبلاً ارسال یا نهایی شده است.',1;
    IF @CurrentStatusCode<>N'PISHNEVIS'
       AND (@CurrentStatusUser<>@UserId OR @CurrentStatusPost<>@FromPostId OR @CurrentStatusMahal<>@FromMahal)
      THROW 51508,N'این خبر در کارتابل شما نیست.',1;
    IF @FromRollId=1 AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,@UserId)=0
      THROW 51000,N'این خبر خارج از محدوده استان‌های مجاز شماست.',1;

    SELECT @CurrentUserId=KT.[CurrentUserId]
    FROM [Akhbar].[KhabarKartabl] KT
    WHERE KT.[ShomareKhabar]=@ShomareKhabar AND KT.[IsActive]=1;

    IF @CurrentUserId IS NULL
    BEGIN
      IF @CreateUserId<>@UserId OR NOT EXISTS
      (
        SELECT 1 FROM [Akhbar].[Khabar] K
        WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[CurrentStatusCode]=N'PISHNEVIS'
      ) THROW 51000,N'اجازه ارسال این خبر را ندارید.',1;
      SET @NoeEghdam=N'ارسال خبر';
    END
    ELSE
    BEGIN
      IF @CurrentUserId<>@UserId THROW 51000,N'این خبر در کارتابل شما قرار ندارد.',1;
      SET @NoeEghdam=N'تأیید و ارسال';
    END

    /* ستاد: کارشناس اخبار PostId=5 مقصد است. خود کارشناس، خبر را نهایی می‌کند. */
    IF @FromRollId=1
    BEGIN
      IF @CurrentUserId=@UserId AND [Akhbar].[FN_SetadNewsEnabled](@UserId)=1
      BEGIN
        SET @ToUserId=@UserId; SET @ToPostId=@FromPostId; SET @ToMahal=@FromMahal; SET @ToRollId=1; SET @IsFinal=1;
      END
      ELSE
      BEGIN
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U
        INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
        AND [Akhbar].[FN_SetadNewsEnabled](U.[UserId])=1
        AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,U.[UserId])=1
        ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Akhbar.SetadNewsPermission A WHERE A.UserId=U.UserId AND A.AllProvinces=0) THEN 0 WHEN U.[PostId]=5 THEN 1 WHEN U.[PostId]=2 THEN 2 ELSE 3 END,U.[UserId];
      END
    END
    ELSE
    BEGIN
      /* ابتدا نزدیک‌ترین سمت بالاتر فعال در همان محل */
      SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
      FROM [dbo].[Users] U
      INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
      WHERE U.[IsActive]=1
        AND U.[Mahal]=@FromMahal
        AND P.[RollId]=@FromRollId
        AND U.[PostId]<@FromPostId
      ORDER BY U.[PostId] DESC,U.[UserId];

      IF @ToUserId IS NULL AND @FromRollId=4
      BEGIN
        SELECT @HozeMahal=CASE WHEN ISNULL(C.[IsHoze],0)=1 THEN C.[CityId] ELSE C.[CityIdHozeh] END
        FROM [dbo].[Citys] C WHERE C.[CityId]=@FromMahal;
        IF @HozeMahal IS NULL THROW 51000,N'حوزه انتخابیه بالادست شهرستان مشخص نشد.',1;

        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U
        INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=@HozeMahal AND P.[RollId]=3
        ORDER BY U.[PostId] DESC,U.[UserId];
      END

      /* County representative news terminates at the main electoral constituency. */
      IF @ToUserId IS NULL AND @FromRollId=3 AND EXISTS (SELECT 1 FROM [Akhbar].[Khabar] KC
 JOIN dbo.Users UC ON UC.UserId=KC.CreateUserId
 WHERE KC.ShomareKhabar=@ShomareKhabar AND UC.PostId=70)
      BEGIN
         SET @ToUserId=@UserId;
         SET @ToPostId=@FromPostId;
         SET @ToMahal=@FromMahal;
         SET @ToRollId=3;
         SET @IsFinal=1;
      END

      IF @ToUserId IS NULL AND @IsFinal=0 AND @FromRollId IN(3,4)
      BEGIN
        IF @HozeMahal IS NULL
          SELECT @HozeMahal=CASE WHEN ISNULL(C.[IsHoze],0)=1 THEN C.[CityId] ELSE C.[CityIdHozeh] END
          FROM [dbo].[Citys] C WHERE C.[CityId]=@FromMahal;

        SELECT @OstanMahal=C.[PCityId] FROM [dbo].[Citys] C WHERE C.[CityId]=@HozeMahal;
        IF @OstanMahal IS NULL THROW 51000,N'استان بالادست حوزه انتخابیه مشخص نشد.',1;

        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U
        INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=@OstanMahal AND P.[RollId]=2
        ORDER BY U.[PostId] DESC,U.[UserId];
      END

      IF @ToUserId IS NULL AND @FromRollId=2
      BEGIN
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U
        INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
        AND [Akhbar].[FN_SetadNewsEnabled](U.[UserId])=1
        AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,U.[UserId])=1
        ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Akhbar.SetadNewsPermission A WHERE A.UserId=U.UserId AND A.AllProvinces=0) THEN 0 WHEN U.[PostId]=5 THEN 1 WHEN U.[PostId]=2 THEN 2 ELSE 3 END,U.[UserId];
      END
    END

    /* در نبود PostId=5، موقتاً پایین‌ترین پست فعال ستاد به عنوان کارشناس اخبار در نظر گرفته می‌شود. */
    IF @ToUserId IS NULL AND @FromRollId IN(1,2)
    BEGIN
      SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
      FROM [dbo].[Users] U
      INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
      WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
        AND [Akhbar].[FN_SetadNewsEnabled](U.[UserId])=1
        AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,U.[UserId])=1
      ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Akhbar.SetadNewsPermission A WHERE A.UserId=U.UserId AND A.AllProvinces=0) THEN 0 WHEN U.[PostId]=5 THEN 1 WHEN U.[PostId]=2 THEN 2 ELSE 3 END,U.[UserId];
    END

    IF @ToUserId IS NULL THROW 51000,N'گیرنده فعال بعدی در مسیر خبر یافت نشد.',1;

    SELECT @ToFullName=ISNULL(V.[FullName],N'') FROM [dbo].[Vbl_Users] V WHERE V.[UserId]=@ToUserId;
    SELECT @ToOnvanPost=ISNULL(P.[OnvanPost],N'') FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;

    SET @ToNameMahal=
      CASE @ToRollId
        WHEN 1 THEN N'ستاد'
        WHEN 3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=@ToMahal),N'حوزه انتخابیه')
        ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=@ToMahal),N'')
      END;

    SELECT @ShomareKhabar [ShomareKhabar],@ToUserId [ToUserId],@ToPostId [ToPostId],@ToMahal [ToMahal],
           @ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@NoeEghdam [NoeEghdam],@IsFinal [IsFinal];
END

GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_SendKhabar]
    @ShomareKhabar BIGINT,
    @UserId BIGINT,
    @Tozihat NVARCHAR(MAX)=NULL,
    @ExpectedToUserId BIGINT=NULL,
    @RequestKey UNIQUEIDENTIFIER=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
      @FromMahal BIGINT,@FromPostId BIGINT,@FromRollId INT,@CreateUserId BIGINT,@CurrentUserId BIGINT,
      @ToUserId BIGINT,@ToPostId BIGINT,@ToMahal BIGINT,@ToRollId INT,@HozeMahal BIGINT,@OstanMahal BIGINT,
      @ToFullName NVARCHAR(500),@ToOnvanPost NVARCHAR(500),@ToNameMahal NVARCHAR(1000),@NoeEghdam NVARCHAR(50),
      @StatusCode NVARCHAR(60),@ActionCode NVARCHAR(60),@Now NVARCHAR(20),@IsFinal BIT=0,
      @LockedStatus NVARCHAR(60),@LockedUserId BIGINT,@LockedPostId BIGINT,@LockedMahal BIGINT,
      @LockResult INT,@LockResource NVARCHAR(255);

    -- Protect against double clicks, retries and concurrent requests on any server instance.
    BEGIN TRAN;
    SET @LockResource=CONCAT(N'MERAT_NEWS_FLOW_',CONVERT(NVARCHAR(30),@ShomareKhabar));
    EXEC @LockResult=sys.sp_getapplock
      @Resource=@LockResource,
      @LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000;
    IF @LockResult<0 THROW 51501,N'خبر در حال پردازش است؛ پس از به‌روزرسانی دوباره بررسی کنید.',1;
    IF @RequestKey IS NULL THROW 51516,N'شناسه یکتای درخواست ارسال ارائه نشده است.',1;
    IF EXISTS(SELECT 1 FROM Akhbar.KhabarSendRequest WHERE RequestKey=@RequestKey)
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM Akhbar.KhabarSendRequest
                    WHERE RequestKey=@RequestKey AND ShomareKhabar=@ShomareKhabar AND UserId=@UserId)
        THROW 51517,N'شناسه درخواست برای خبر دیگری ثبت شده است.',1;
      SELECT ShomareKhabar,ToUserId,CurrentStatusCode,StateName,IsFinal,
             CAST(1 AS BIT) AS AlreadyApplied
      FROM Akhbar.KhabarSendRequest WHERE RequestKey=@RequestKey;
      COMMIT;
      RETURN;
    END;

    SET @Tozihat=NULLIF(LTRIM(RTRIM(@Tozihat)),N'');
    IF NOT EXISTS(SELECT 1 FROM Akhbar.KhabarAshkhas WHERE ShomareKhabar=@ShomareKhabar AND IsDelete=0) AND NOT EXISTS(SELECT 1 FROM Akhbar.KhabarManualPersons WHERE ShomareKhabar=@ShomareKhabar AND IsDelete=0)
      THROW 51000,N'ارسال خبر بدون ثبت حداقل یک شخص وابسته مجاز نیست.',1;

    SELECT @FromMahal=U.[Mahal],@FromPostId=U.[PostId],@FromRollId=P.[RollId]
    FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
    WHERE U.[UserId]=@UserId AND U.[IsActive]=1 AND P.[RollId] IN(1,2,3,4);
    IF @FromMahal IS NULL THROW 51000,N'کاربر فعال در ساختار اخبار یافت نشد.',1;

    SELECT @CreateUserId=K.[CreateUserId],@LockedStatus=K.[CurrentStatusCode],
           @LockedUserId=K.[CurrentUserId],@LockedPostId=K.[CurrentPostId],@LockedMahal=K.[CurrentMahal]
    FROM [Akhbar].[Khabar] K WITH (UPDLOCK,HOLDLOCK)
    WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[IsDelete]=0;
    IF @CreateUserId IS NULL THROW 51000,N'خبر یافت نشد.',1;
    IF @LockedStatus=N'PISHNEVIS'
       AND EXISTS(SELECT 1 FROM Akhbar.KhabarKartabl WHERE ShomareKhabar=@ShomareKhabar AND IsActive=1)
       THROW 51703,N'پیش‌نویس دارای کارتابل فعال است و قابل ارسال نیست.',1;
    IF @LockedStatus<>N'PISHNEVIS'
       AND (SELECT COUNT_BIG(*) FROM Akhbar.KhabarKartabl WHERE ShomareKhabar=@ShomareKhabar AND IsActive=1)<>1
       THROW 51704,N'خبر دارای مغایرت در کارتابل فعال است؛ بررسی مدیر لازم است.',1;
    IF @LockedStatus<>N'PISHNEVIS'
       AND @LockedStatus NOT LIKE N'KARTABL_%'
       AND @LockedStatus NOT LIKE N'BARGASHT_%'
      THROW 51502,N'این خبر قبلاً ارسال یا نهایی شده است. کارتابل را به‌روزرسانی کنید.',1;
    IF @LockedStatus=N'PISHNEVIS' AND @CreateUserId<>@UserId
      THROW 51503,N'فقط ایجادکننده پیش‌نویس مجاز به ارسال است.',1;
    IF @LockedStatus<>N'PISHNEVIS'
      AND (@LockedUserId<>@UserId OR @LockedPostId<>@FromPostId OR @LockedMahal<>@FromMahal)
      THROW 51504,N'خبر دیگر در کارتابل شما نیست. صفحه را به‌روزرسانی کنید.',1;
    IF @FromRollId=1 AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,@UserId)=0
      THROW 51000,N'این خبر خارج از محدوده استان‌های مجاز شماست.',1;

    SELECT @CurrentUserId=KT.[CurrentUserId] FROM [Akhbar].[KhabarKartabl] KT WITH (UPDLOCK,HOLDLOCK)
    WHERE KT.[ShomareKhabar]=@ShomareKhabar AND KT.[IsActive]=1
      AND KT.[CurrentPostId]=@FromPostId AND KT.[CurrentMahal]=@FromMahal;
    IF @LockedStatus<>N'PISHNEVIS' AND ISNULL(@CurrentUserId,0)<>@UserId
      THROW 51505,N'کارتابل فعال خبر تغییر کرده است.',1;
    IF @LockedStatus=N'PISHNEVIS' AND @CurrentUserId IS NOT NULL
      THROW 51506,N'خبر پیش‌نویس دارای گردش فعال است؛ نیاز به بررسی دارد.',1;
    IF @CurrentUserId IS NULL
    BEGIN
      IF @CreateUserId<>@UserId OR NOT EXISTS(SELECT 1 FROM [Akhbar].[Khabar] WHERE [ShomareKhabar]=@ShomareKhabar AND [CurrentStatusCode]=N'PISHNEVIS')
        THROW 51000,N'اجازه ارسال این خبر را ندارید.',1;
      SET @NoeEghdam=N'ارسال خبر';
    END
    ELSE
    BEGIN
      IF @CurrentUserId<>@UserId THROW 51000,N'این خبر در کارتابل شما قرار ندارد.',1;
      SET @NoeEghdam=N'تأیید و ارسال';
    END

    IF @FromRollId=1
    BEGIN
      IF @CurrentUserId=@UserId AND [Akhbar].[FN_SetadNewsEnabled](@UserId)=1
      BEGIN SET @ToUserId=@UserId;SET @ToPostId=@FromPostId;SET @ToMahal=@FromMahal;SET @ToRollId=1;SET @IsFinal=1;END
      ELSE
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
        AND [Akhbar].[FN_SetadNewsEnabled](U.[UserId])=1
        AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,U.[UserId])=1 ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Akhbar.SetadNewsPermission A WHERE A.UserId=U.UserId AND A.AllProvinces=0) THEN 0 WHEN U.[PostId]=5 THEN 1 WHEN U.[PostId]=2 THEN 2 ELSE 3 END,U.[UserId];
    END
    ELSE
    BEGIN
      SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
      FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
      WHERE U.[IsActive]=1 AND U.[Mahal]=@FromMahal AND P.[RollId]=@FromRollId AND U.[PostId]<@FromPostId
      ORDER BY U.[PostId] DESC,U.[UserId];

      IF @ToUserId IS NULL AND @FromRollId=4
      BEGIN
        SELECT @HozeMahal=CASE WHEN ISNULL(C.[IsHoze],0)=1 THEN C.[CityId] ELSE C.[CityIdHozeh] END FROM [dbo].[Citys] C WHERE C.[CityId]=@FromMahal;
        IF @HozeMahal IS NULL THROW 51000,N'حوزه انتخابیه بالادست شهرستان مشخص نشد.',1;
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=@HozeMahal AND P.[RollId]=3 ORDER BY U.[PostId] DESC,U.[UserId];
      END

      /* County representative news terminates at the main electoral constituency. */
      IF @ToUserId IS NULL AND @FromRollId=3 AND EXISTS (SELECT 1 FROM [Akhbar].[Khabar] KC
 JOIN dbo.Users UC ON UC.UserId=KC.CreateUserId
 WHERE KC.ShomareKhabar=@ShomareKhabar AND UC.PostId=70)
      BEGIN
         SET @ToUserId=@UserId;
         SET @ToPostId=@FromPostId;
         SET @ToMahal=@FromMahal;
         SET @ToRollId=3;
         SET @IsFinal=1;
      END

      IF @ToUserId IS NULL AND @IsFinal=0 AND @FromRollId IN(3,4)
      BEGIN
        IF @HozeMahal IS NULL SELECT @HozeMahal=CASE WHEN ISNULL(C.[IsHoze],0)=1 THEN C.[CityId] ELSE C.[CityIdHozeh] END FROM [dbo].[Citys] C WHERE C.[CityId]=@FromMahal;
        SELECT @OstanMahal=C.[PCityId] FROM [dbo].[Citys] C WHERE C.[CityId]=@HozeMahal;
        IF @OstanMahal IS NULL THROW 51000,N'استان بالادست حوزه انتخابیه مشخص نشد.',1;
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=@OstanMahal AND P.[RollId]=2 ORDER BY U.[PostId] DESC,U.[UserId];
      END

      IF @ToUserId IS NULL AND @FromRollId=2
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
        AND [Akhbar].[FN_SetadNewsEnabled](U.[UserId])=1
        AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,U.[UserId])=1 ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Akhbar.SetadNewsPermission A WHERE A.UserId=U.UserId AND A.AllProvinces=0) THEN 0 WHEN U.[PostId]=5 THEN 1 WHEN U.[PostId]=2 THEN 2 ELSE 3 END,U.[UserId];
    END

    IF @ToUserId IS NULL AND @FromRollId IN(1,2)
      SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
      FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
      WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
        AND [Akhbar].[FN_SetadNewsEnabled](U.[UserId])=1
        AND [Akhbar].[FN_SetadNewsProvinceAllowed](@ShomareKhabar,U.[UserId])=1
      ORDER BY CASE WHEN EXISTS (SELECT 1 FROM Akhbar.SetadNewsPermission A WHERE A.UserId=U.UserId AND A.AllProvinces=0) THEN 0 WHEN U.[PostId]=5 THEN 1 WHEN U.[PostId]=2 THEN 2 ELSE 3 END,U.[UserId];

    IF @ToUserId IS NULL THROW 51000,N'گیرنده فعال بعدی در مسیر خبر یافت نشد.',1;
    IF @ExpectedToUserId IS NOT NULL AND @ExpectedToUserId<>@ToUserId THROW 51000,N'گیرنده خبر تغییر کرده است. مقصد را دوباره بررسی کنید.',1;

    SELECT @ToFullName=ISNULL(V.[FullName],N'') FROM [dbo].[Vbl_Users] V WHERE V.[UserId]=@ToUserId;
    SELECT @ToOnvanPost=ISNULL(P.[OnvanPost],N'') FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;
    SET @ToNameMahal=CASE @ToRollId WHEN 1 THEN N'ستاد' WHEN 3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=@ToMahal),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=@ToMahal),N'') END;
    SET @Now=[dbo].[FarsiDateTimeNow]();

    IF @IsFinal=1
    BEGIN
      SET @StatusCode=CASE WHEN @ToRollId=3 THEN N'TAEED_NAHAEI_HOZE' ELSE N'TAEED_NAHAEI_SETAD' END; SET @ActionCode=@StatusCode; SET @NoeEghdam=N'تأیید نهایی';
      -- Transaction started before validations and routing.
        UPDATE [Akhbar].[KhabarKartabl] SET [IsActive]=0 WHERE [ShomareKhabar]=@ShomareKhabar AND [IsActive]=1;
        INSERT INTO [Akhbar].[KhabarGardeshLog]
        ([ShomareKhabar],[FromUserId],[FromPostId],[FromMahal],[ToUserId],[ToPostId],[ToMahal],[NoeEghdam],[Tozihat],[CreateUserId],[CreateDateTime],[ActionCode],[EshkalatIds])
        VALUES(@ShomareKhabar,@UserId,@FromPostId,@FromMahal,@UserId,@FromPostId,@FromMahal,@NoeEghdam,@Tozihat,@UserId,@Now,@ActionCode,NULL);
        UPDATE [Akhbar].[Khabar] SET [CurrentStatusCode]=@StatusCode,[LastActionCode]=@ActionCode,[CurrentUserId]=@UserId,[CurrentPostId]=@FromPostId,[CurrentMahal]=@FromMahal,[StatusDateTime]=@Now WHERE [ShomareKhabar]=@ShomareKhabar;
      INSERT INTO Akhbar.KhabarSendRequest
        (RequestKey,ShomareKhabar,UserId,ToUserId,CurrentStatusCode,StateName,IsFinal)
      VALUES(@RequestKey,@ShomareKhabar,@UserId,@UserId,@StatusCode,N'تأیید نهایی',1);
      COMMIT;
      SELECT @ShomareKhabar [ShomareKhabar],@UserId [ToUserId],@FromPostId [ToPostId],@FromMahal [ToMahal],@ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@StatusCode [CurrentStatusCode],@Tozihat [Tozihat],N'تأیید نهایی' [StateName],CAST(1 AS BIT) [IsFinal];
      RETURN;
    END

    SET @StatusCode=CASE @ToRollId WHEN 1 THEN N'KARTABL_SETAD_KARSHENAS' WHEN 2 THEN CASE @ToPostId WHEN 53 THEN N'KARTABL_OSTAN_KARDAN' WHEN 52 THEN N'KARTABL_OSTAN_KARSHENAS' WHEN 51 THEN N'KARTABL_OSTAN_MASOOL' WHEN 50 THEN N'KARTABL_OSTAN_RAEIS' ELSE N'KARTABL_OSTAN' END WHEN 3 THEN CASE @ToPostId WHEN 61 THEN N'KARTABL_HOZE_TAHGHIGH' WHEN 60 THEN N'KARTABL_HOZE_RAEIS' ELSE N'KARTABL_HOZE' END WHEN 4 THEN N'KARTABL_NAMAYANDE_SH' ELSE N'KARTABL_OTHER' END;
    SET @ActionCode=N'TAEED_ERSAL_KHABAR';

    -- Transaction started before validations and routing.
      UPDATE [Akhbar].[KhabarKartabl] SET [IsActive]=0 WHERE [ShomareKhabar]=@ShomareKhabar AND [IsActive]=1;
      INSERT INTO [Akhbar].[KhabarKartabl]([ShomareKhabar],[CurrentUserId],[CurrentPostId],[CurrentMahal],[FromUserId],[FromPostId],[FromMahal],[ErsalDateTime],[IsActive]) VALUES(@ShomareKhabar,@ToUserId,@ToPostId,@ToMahal,@UserId,@FromPostId,@FromMahal,@Now,1);
      INSERT INTO [Akhbar].[KhabarGardeshLog]([ShomareKhabar],[FromUserId],[FromPostId],[FromMahal],[ToUserId],[ToPostId],[ToMahal],[NoeEghdam],[Tozihat],[CreateUserId],[CreateDateTime],[ActionCode],[EshkalatIds]) VALUES(@ShomareKhabar,@UserId,@FromPostId,@FromMahal,@ToUserId,@ToPostId,@ToMahal,@NoeEghdam,@Tozihat,@UserId,@Now,@ActionCode,NULL);
      UPDATE [Akhbar].[Khabar] SET [CurrentStatusCode]=@StatusCode,[LastActionCode]=@ActionCode,[CurrentUserId]=@ToUserId,[CurrentPostId]=@ToPostId,[CurrentMahal]=@ToMahal,[StatusDateTime]=@Now WHERE [ShomareKhabar]=@ShomareKhabar;
      INSERT INTO Akhbar.KhabarSendRequest
        (RequestKey,ShomareKhabar,UserId,ToUserId,CurrentStatusCode,StateName,IsFinal)
      VALUES(@RequestKey,@ShomareKhabar,@UserId,@ToUserId,@StatusCode,N'ارسال شد',0);
    COMMIT;

    SELECT @ShomareKhabar [ShomareKhabar],@ToUserId [ToUserId],@ToPostId [ToPostId],@ToMahal [ToMahal],@ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@StatusCode [CurrentStatusCode],@Tozihat [Tozihat],N'ارسال شد' [StateName],CAST(0 AS BIT) [IsFinal];
END

GO


/* Only the current main constituency recipient of a county-origin news item.
   This is an additional person-only permission; it does NOT enable news content edits. */
CREATE OR ALTER FUNCTION [Akhbar].[FN_CanResolveCountyKhabarPersons]
(
    @ShomareKhabar BIGINT, @UserId BIGINT
)
RETURNS BIT
AS
BEGIN
    DECLARE @Allowed BIT=0;
    IF EXISTS
    (
        SELECT 1
        FROM [Akhbar].[Khabar] K
        JOIN [dbo].[Users] U ON U.[UserId]=@UserId AND U.[IsActive]=1
        JOIN [dbo].[Citys] C ON C.[CityId]=K.[CreateMahal] AND C.[IsActive]=1
        WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[IsDelete]=0
          AND K.[CreatePostId]=70
          AND U.[PostId] IN (60,61)
          AND K.[CurrentUserId]=U.[UserId]
          AND K.[CurrentPostId]=U.[PostId]
          AND K.[CurrentMahal]=U.[Mahal]
          AND K.[CurrentStatusCode] LIKE N'KARTABL_%'
          AND C.[CityIdHozeh]=U.[Mahal] AND C.[CityId]<>U.[Mahal]
          AND EXISTS
          (
              SELECT 1 FROM [Akhbar].[KhabarKartabl] KT
              WHERE KT.[ShomareKhabar]=K.[ShomareKhabar] AND KT.[IsActive]=1
                AND KT.[CurrentUserId]=U.[UserId]
                AND KT.[CurrentPostId]=U.[PostId]
                AND KT.[CurrentMahal]=U.[Mahal]
          )
    ) SET @Allowed=1;
    RETURN @Allowed;
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_SearchAshkhas]
    @ShomareKhabar BIGINT,
    @UserId BIGINT,
    @Search NVARCHAR(150),
    @Page INT = 1,
    @SizePage INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanEditKhabar](@ShomareKhabar,@UserId)=0
       AND [Akhbar].[FN_CanResolveCountyKhabarPersons](@ShomareKhabar,@UserId)=0
        THROW 51000,N'خبر در کارتابل شما نیست و امکان اصلاح اشخاص وابسته را ندارید.',1;

    SET @Page=CASE WHEN ISNULL(@Page,0)<1 THEN 1 WHEN @Page>100 THEN 100 ELSE @Page END;
    SET @SizePage=CASE WHEN ISNULL(@SizePage,0)<1 THEN 10 WHEN @SizePage>50 THEN 50 ELSE @SizePage END;
    DECLARE @Q NVARCHAR(150)=LTRIM(RTRIM([dbo].[NormalizePersianText](ISNULL(@Search,N''))));
    DECLARE @Compact NVARCHAR(400)=[Davtalab].[FN_MeratCompactPersonName](@Q);
    DECLARE @Take INT=@Page*@SizePage;

    IF LEN(@Compact)<2
    BEGIN
        SELECT TOP(0)
          CAST(NULL AS BIGINT) AS ShomarehParvandeh,
          CAST(NULL AS NVARCHAR(10)) AS CodeMelli,
          CAST(NULL AS NVARCHAR(50)) AS FirstName,
          CAST(NULL AS NVARCHAR(150)) AS LastName,
          CAST(NULL AS NVARCHAR(50)) AS NamePedar,
          CAST(0 AS BIGINT) AS TotalCount;
        RETURN;
    END;

    DECLARE @Digits NVARCHAR(150)=TRANSLATE(@Q,N'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',N'01234567890123456789');
    DECLARE @IsDigits BIT=CASE WHEN @Digits<>N'' AND @Digits COLLATE Latin1_General_BIN2 NOT LIKE N'%[^0-9]%' THEN 1 ELSE 0 END;
    DECLARE @FileNo BIGINT=CASE WHEN @IsDigits=1 THEN TRY_CONVERT(BIGINT,@Digits) ELSE NULL END;

    IF @IsDigits=1
    BEGIN
        ;WITH NumericMatches AS
        (
           SELECT A.[ShomarehParvandeh],A.[CodeMelli],A.[FirstName],A.[LastName],A.[NamePedar],
                  COUNT_BIG(1) OVER() AS [TotalCount]
           FROM [Davtalab].[Ashkhas] A
           WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
             AND (A.[CodeMelli] LIKE @Digits+N'%' OR A.[ShomarehParvandeh]=@FileNo)
             AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
               WHERE K.[ShomareKhabar]=@ShomareKhabar
                 AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        )
        SELECT [ShomarehParvandeh],[CodeMelli],[FirstName],[LastName],[NamePedar],[TotalCount]
        FROM NumericMatches ORDER BY [CodeMelli],[ShomarehParvandeh]
        OFFSET (@Page-1)*@SizePage ROWS FETCH NEXT @SizePage ROWS ONLY
        OPTION (RECOMPILE);
        RETURN;
    END;

    /* Literal LIKE search: '%' and '_' in input are treated as normal text. */
    DECLARE @EscapedCompact NVARCHAR(400)=REPLACE(REPLACE(REPLACE(REPLACE(@Compact,N'~',N'~~'),N'%',N'~%'),N'_',N'~_'),N'[',N'~[');
    DECLARE @EscapedQ NVARCHAR(400)=REPLACE(REPLACE(REPLACE(REPLACE(@Q,N'~',N'~~'),N'%',N'~%'),N'_',N'~_'),N'[',N'~[');
    DECLARE @NamePrefix NVARCHAR(400)=@EscapedCompact+N'%';
    DECLARE @NameContains NVARCHAR(400)=N'%'+@EscapedCompact+N'%';
    DECLARE @RawPrefix NVARCHAR(400)=@EscapedQ+N'%';
    DECLARE @RawContains NVARCHAR(400)=N'%'+@EscapedQ+N'%';

    /* Legacy name-to-code function is evaluated ONCE on the user input. */
    DECLARE @CodeSearch NVARCHAR(2000)=[dbo].[CreateString2String](@Q);

    CREATE TABLE #Matches(ShomarehParvandeh BIGINT NOT NULL PRIMARY KEY, RankValue TINYINT NOT NULL);

    /* Fast indexed search: first + last, with no spaces / ZWNJ and normalized Arabic letters. */
    INSERT INTO #Matches(ShomarehParvandeh,RankValue)
    SELECT TOP (@Take) A.[ShomarehParvandeh],10
    FROM [Davtalab].[Ashkhas] A
    WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
      AND A.[FullNameSearchCompact] LIKE @NamePrefix ESCAPE N'~'
      AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
          WHERE K.[ShomareKhabar]=@ShomareKhabar
            AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
    ORDER BY A.[FullNameSearchCompact],A.[ShomarehParvandeh];

    IF (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],20
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND A.[LastName] LIKE @RawPrefix ESCAPE N'~'
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[LastName],A.[ShomarehParvandeh];
    END;

    IF (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],30
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND A.[NamePedar] LIKE @RawPrefix ESCAPE N'~'
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[ShomarehParvandeh];
    END;

    /* Existing legacy NameKamel_Code remains usable, but is not created as an index key. */
    IF NULLIF(@CodeSearch,N'') IS NOT NULL AND (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],40
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND A.[NameKamel_Code] LIKE @CodeSearch+N'%'
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[ShomarehParvandeh];
    END;

    /* Wider fallback for surname or inner-word fragments, only if prefix searches are insufficient. */
    IF (SELECT COUNT(*) FROM #Matches)<@Take
    BEGIN
        INSERT INTO #Matches(ShomarehParvandeh,RankValue)
        SELECT TOP (@Take) A.[ShomarehParvandeh],50
        FROM [Davtalab].[Ashkhas] A
        WHERE (A.[IsDelete]=0 OR A.[IsDelete] IS NULL)
          AND (A.[FullNameSearchCompact] LIKE @NameContains ESCAPE N'~'
               OR A.[NamePedar] LIKE @RawContains ESCAPE N'~')
          AND NOT EXISTS(SELECT 1 FROM #Matches M WHERE M.[ShomarehParvandeh]=A.[ShomarehParvandeh])
          AND NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] K
              WHERE K.[ShomareKhabar]=@ShomareKhabar
                AND K.[ShomarehParvandeh]=A.[ShomarehParvandeh] AND K.[IsDelete]=0)
        ORDER BY A.[ShomarehParvandeh];
    END;

    ;WITH Ranked AS
    (
       SELECT A.[ShomarehParvandeh],A.[CodeMelli],A.[FirstName],A.[LastName],A.[NamePedar],
              COUNT_BIG(1) OVER() AS [TotalCount],M.[RankValue]
       FROM #Matches M JOIN [Davtalab].[Ashkhas] A
         ON A.[ShomarehParvandeh]=M.[ShomarehParvandeh]
    )
    SELECT [ShomarehParvandeh],[CodeMelli],[FirstName],[LastName],[NamePedar],[TotalCount]
    FROM Ranked ORDER BY [RankValue],[LastName],[FirstName],[ShomarehParvandeh]
    OFFSET (@Page-1)*@SizePage ROWS FETCH NEXT @SizePage ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_InsertKhabarShakhs]
    @ShomareKhabar BIGINT,
    @ShomarehParvandeh BIGINT,
    @CreateUserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF [Akhbar].[FN_CanEditKhabar](@ShomareKhabar, @CreateUserId) = 0
       AND [Akhbar].[FN_CanResolveCountyKhabarPersons](@ShomareKhabar,@CreateUserId)=0
        THROW 51000, N'خبر در کارتابل شما نیست و امکان اصلاح اشخاص وابسته را ندارید.', 1;

    IF NOT EXISTS
    (
        SELECT 1 FROM [Davtalab].[Ashkhas]
        WHERE [ShomarehParvandeh]=@ShomarehParvandeh
          AND ISNULL([IsDelete],0)=0
    )
        THROW 51000, N'شخص مورد نظر یافت نشد.', 1;

    BEGIN TRAN;

    IF EXISTS
    (
        SELECT 1 FROM [Akhbar].[KhabarAshkhas]
        WHERE [ShomareKhabar]=@ShomareKhabar
          AND [ShomarehParvandeh]=@ShomarehParvandeh
          AND [IsDelete]=1
    )
    BEGIN
        UPDATE [Akhbar].[KhabarAshkhas]
        SET [IsDelete]=0,
            [LastEditUserId]=@CreateUserId,
            [LastEditDateTime]=[dbo].[FarsiDateTimeNow]()
        WHERE [ShomareKhabar]=@ShomareKhabar
          AND [ShomarehParvandeh]=@ShomarehParvandeh
          AND [IsDelete]=1;
    END
    ELSE IF NOT EXISTS
    (
        SELECT 1 FROM [Akhbar].[KhabarAshkhas]
        WHERE [ShomareKhabar]=@ShomareKhabar
          AND [ShomarehParvandeh]=@ShomarehParvandeh
          AND [IsDelete]=0
    )
    BEGIN
        INSERT INTO [Akhbar].[KhabarAshkhas]
            ([ShomareKhabar],[ShomarehParvandeh],[IsDelete],[CreateUserId],[CreateDateTime])
        VALUES
            (@ShomareKhabar,@ShomarehParvandeh,0,@CreateUserId,[dbo].[FarsiDateTimeNow]());
    END;

    COMMIT;

    SELECT TOP (1)
        KA.[KhabarShakhsId],KA.[ShomarehParvandeh],A.[FirstName],A.[LastName],A.[NamePedar]
    FROM [Akhbar].[KhabarAshkhas] KA
    INNER JOIN [Davtalab].[Ashkhas] A ON A.[ShomarehParvandeh]=KA.[ShomarehParvandeh]
    WHERE KA.[ShomareKhabar]=@ShomareKhabar
      AND KA.[ShomarehParvandeh]=@ShomarehParvandeh
      AND KA.[IsDelete]=0;
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_DeleteKhabarShakhs]
    @KhabarShakhsId BIGINT,
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ShomareKhabar BIGINT;
    SELECT @ShomareKhabar=[ShomareKhabar]
    FROM [Akhbar].[KhabarAshkhas]
    WHERE [KhabarShakhsId]=@KhabarShakhsId AND [IsDelete]=0;

    IF @ShomareKhabar IS NULL
       OR ([Akhbar].[FN_CanEditKhabar](@ShomareKhabar,@UserId)=0
           AND NOT ([Akhbar].[FN_CanResolveCountyKhabarPersons](@ShomareKhabar,@UserId)=1
             AND EXISTS(SELECT 1 FROM [Akhbar].[KhabarAshkhas] KA
                        WHERE KA.[KhabarShakhsId]=@KhabarShakhsId
                          AND KA.[CreateUserId]=@UserId AND KA.[IsDelete]=0)))
        THROW 51000, N'امکان حذف این شخص از خبر را ندارید.', 1;

    UPDATE [Akhbar].[KhabarAshkhas]
    SET [IsDelete]=1,
        [LastEditUserId]=@UserId,
        [LastEditDateTime]=[dbo].[FarsiDateTimeNow]()
    WHERE [KhabarShakhsId]=@KhabarShakhsId AND [IsDelete]=0;

    SELECT CAST(1 AS BIT) AS [IsDeleted];
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarAshkhas]
    @ShomareKhabar BIGINT,@UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanViewKhabar](@ShomareKhabar,@UserId)=0 THROW 51000,N'اجازه مشاهده اشخاص وابسته این خبر را ندارید.',1;
    SELECT KA.[KhabarShakhsId],KA.[ShomarehParvandeh],A.[FirstName],A.[LastName],A.[NamePedar],KA.[CreateDateTime], KA.[CreateUserId] AS [PersonCreatorUserId]
    FROM [Akhbar].[KhabarAshkhas] KA INNER JOIN [Davtalab].[Ashkhas] A ON A.[ShomarehParvandeh]=KA.[ShomarehParvandeh]
    WHERE KA.[ShomareKhabar]=@ShomareKhabar AND KA.[IsDelete]=0 ORDER BY KA.[KhabarShakhsId] DESC;
END

GO

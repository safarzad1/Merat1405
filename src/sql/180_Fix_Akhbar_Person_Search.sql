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

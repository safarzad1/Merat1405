USE [MeratDB];
GO

/* ============================================================
   MERAT - اخبار
   منطق قطعی گردش:
   شهرستان فرعی (RollId=4) -> حوزه انتخابیه (RollId=3)
   -> استان (RollId=2) -> کارشناس اخبار ستاد (RollId=1 / PostId=5)

   در هر محل، خبر به نزدیک‌ترین سمت بالاتر فعال می‌رود.
   هنگام ورود به محل بعدی، پایین‌ترین PostId فعال آن سطح از نظر سازمانی
   یعنی بزرگ‌ترین PostId دارای کاربر فعال انتخاب می‌شود.
   RollId=5 در اخبار نقشی ندارد.
   ============================================================ */

CREATE OR ALTER FUNCTION [Akhbar].[FN_CanViewKhabar]
(
    @ShomareKhabar BIGINT,
    @UserId BIGINT
)
RETURNS BIT
AS
BEGIN
    DECLARE @Result BIT = 0;

    IF EXISTS
    (
        SELECT 1
        FROM [Akhbar].[Khabar] K
        WHERE K.[ShomareKhabar]=@ShomareKhabar
          AND K.[IsDelete]=0
          AND
          (
              K.[CreateUserId]=@UserId
              OR K.[CurrentUserId]=@UserId
              OR EXISTS
              (
                  SELECT 1
                  FROM [Akhbar].[KhabarGardeshLog] L
                  WHERE L.[ShomareKhabar]=K.[ShomareKhabar]
                    AND (L.[FromUserId]=@UserId OR L.[ToUserId]=@UserId)
              )
          )
    ) SET @Result=1;

    RETURN @Result;
END
GO

CREATE OR ALTER FUNCTION [Akhbar].[FN_CanEditKhabar]
(
    @ShomareKhabar BIGINT,
    @UserId BIGINT
)
RETURNS BIT
AS
BEGIN
    DECLARE @Result BIT = 0;

    IF EXISTS
    (
        SELECT 1
        FROM [Akhbar].[Khabar] K
        INNER JOIN [dbo].[Users] U
            ON U.[UserId]=@UserId
           AND U.[IsActive]=1
        WHERE K.[ShomareKhabar]=@ShomareKhabar
          AND K.[IsDelete]=0
          AND K.[CurrentUserId]=@UserId
          AND K.[CurrentPostId]=U.[PostId]
          AND K.[CurrentMahal]=U.[Mahal]
          AND
          (
             (K.[CurrentStatusCode]=N'PISHNEVIS' AND K.[CreateUserId]=@UserId)
             OR K.[CurrentStatusCode] LIKE N'BARGASHT_%'
          )
    ) SET @Result=1;

    RETURN @Result;
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_DeleteKhabar]
    @ShomareKhabar BIGINT,
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [Akhbar].[Khabar]
    SET [IsDelete]=1,
        [DeleteUserId]=@UserId,
        [DeleteDateTime]=[dbo].[FarsiDateTimeNow]()
    WHERE [ShomareKhabar]=@ShomareKhabar
      AND [CreateUserId]=@UserId
      AND [CurrentUserId]=@UserId
      AND [CurrentStatusCode]=N'PISHNEVIS'
      AND [IsDelete]=0;

    IF @@ROWCOUNT=0
        THROW 51000,N'فقط پیش‌نویس خود کاربر قابل حذف است.',1;

    SELECT @ShomareKhabar AS [ShomareKhabar];
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
      @NoeEghdam NVARCHAR(50),@IsFinal BIT=0;

    SELECT @FromMahal=U.[Mahal],@FromPostId=U.[PostId],@FromRollId=P.[RollId]
    FROM [dbo].[Users] U
    INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
    WHERE U.[UserId]=@UserId AND U.[IsActive]=1 AND P.[RollId] IN(1,2,3,4);

    IF @FromMahal IS NULL OR @FromPostId IS NULL
      THROW 51000,N'کاربر فعال در ساختار اخبار یافت نشد.',1;

    SELECT @CreateUserId=K.[CreateUserId]
    FROM [Akhbar].[Khabar] K
    WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[IsDelete]=0;

    IF @CreateUserId IS NULL THROW 51000,N'خبر یافت نشد.',1;

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
      IF @FromPostId=5
      BEGIN
        SET @ToUserId=@UserId; SET @ToPostId=@FromPostId; SET @ToMahal=@FromMahal; SET @ToRollId=1; SET @IsFinal=1;
      END
      ELSE
      BEGIN
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U
        INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND U.[PostId]=5 AND P.[RollId]=1
        ORDER BY U.[UserId];
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

      IF @ToUserId IS NULL AND @FromRollId IN(3,4)
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
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND U.[PostId]=5 AND P.[RollId]=1
        ORDER BY U.[UserId];
      END
    END

    /* در نبود PostId=5، موقتاً پایین‌ترین پست فعال ستاد به عنوان کارشناس اخبار در نظر گرفته می‌شود. */
    IF @ToUserId IS NULL AND @FromRollId IN(1,2)
    BEGIN
      SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
      FROM [dbo].[Users] U
      INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
      WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1
      ORDER BY U.[PostId] DESC,U.[UserId];
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
    @Tozihat NVARCHAR(2000)=NULL,
    @ExpectedToUserId BIGINT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
      @FromMahal BIGINT,@FromPostId BIGINT,@FromRollId INT,@CreateUserId BIGINT,@CurrentUserId BIGINT,
      @ToUserId BIGINT,@ToPostId BIGINT,@ToMahal BIGINT,@ToRollId INT,@HozeMahal BIGINT,@OstanMahal BIGINT,
      @ToFullName NVARCHAR(500),@ToOnvanPost NVARCHAR(500),@ToNameMahal NVARCHAR(1000),@NoeEghdam NVARCHAR(50),
      @StatusCode NVARCHAR(60),@ActionCode NVARCHAR(60),@Now NVARCHAR(20),@IsFinal BIT=0;

    SET @Tozihat=NULLIF(LTRIM(RTRIM(@Tozihat)),N'');

    SELECT @FromMahal=U.[Mahal],@FromPostId=U.[PostId],@FromRollId=P.[RollId]
    FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
    WHERE U.[UserId]=@UserId AND U.[IsActive]=1 AND P.[RollId] IN(1,2,3,4);
    IF @FromMahal IS NULL THROW 51000,N'کاربر فعال در ساختار اخبار یافت نشد.',1;

    SELECT @CreateUserId=K.[CreateUserId] FROM [Akhbar].[Khabar] K WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[IsDelete]=0;
    IF @CreateUserId IS NULL THROW 51000,N'خبر یافت نشد.',1;

    SELECT @CurrentUserId=KT.[CurrentUserId] FROM [Akhbar].[KhabarKartabl] KT WHERE KT.[ShomareKhabar]=@ShomareKhabar AND KT.[IsActive]=1;
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
      IF @FromPostId=5
      BEGIN SET @ToUserId=@UserId;SET @ToPostId=@FromPostId;SET @ToMahal=@FromMahal;SET @ToRollId=1;SET @IsFinal=1;END
      ELSE
        SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
        FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND U.[PostId]=5 AND P.[RollId]=1 ORDER BY U.[UserId];
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

      IF @ToUserId IS NULL AND @FromRollId IN(3,4)
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
        WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND U.[PostId]=5 AND P.[RollId]=1 ORDER BY U.[UserId];
    END

    IF @ToUserId IS NULL AND @FromRollId IN(1,2)
      SELECT TOP(1) @ToUserId=U.[UserId],@ToPostId=U.[PostId],@ToMahal=U.[Mahal],@ToRollId=P.[RollId]
      FROM [dbo].[Users] U INNER JOIN [dbo].[Posts] P ON P.[PostId]=U.[PostId]
      WHERE U.[IsActive]=1 AND U.[Mahal]=1 AND P.[RollId]=1 ORDER BY U.[PostId] DESC,U.[UserId];

    IF @ToUserId IS NULL THROW 51000,N'گیرنده فعال بعدی در مسیر خبر یافت نشد.',1;
    IF @ExpectedToUserId IS NOT NULL AND @ExpectedToUserId<>@ToUserId THROW 51000,N'گیرنده خبر تغییر کرده است. مقصد را دوباره بررسی کنید.',1;

    SELECT @ToFullName=ISNULL(V.[FullName],N'') FROM [dbo].[Vbl_Users] V WHERE V.[UserId]=@ToUserId;
    SELECT @ToOnvanPost=ISNULL(P.[OnvanPost],N'') FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;
    SET @ToNameMahal=CASE @ToRollId WHEN 1 THEN N'ستاد' WHEN 3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=@ToMahal),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=@ToMahal),N'') END;
    SET @Now=[dbo].[FarsiDateTimeNow]();

    IF @IsFinal=1
    BEGIN
      SET @StatusCode=N'TAEED_NAHAEI_SETAD'; SET @ActionCode=N'TAEED_NAHAEI_SETAD'; SET @NoeEghdam=N'تأیید نهایی';
      BEGIN TRAN;
        UPDATE [Akhbar].[KhabarKartabl] SET [IsActive]=0 WHERE [ShomareKhabar]=@ShomareKhabar AND [IsActive]=1;
        INSERT INTO [Akhbar].[KhabarGardeshLog]
        ([ShomareKhabar],[FromUserId],[FromPostId],[FromMahal],[ToUserId],[ToPostId],[ToMahal],[NoeEghdam],[Tozihat],[CreateUserId],[CreateDateTime],[ActionCode],[EshkalatIds])
        VALUES(@ShomareKhabar,@UserId,@FromPostId,@FromMahal,@UserId,@FromPostId,@FromMahal,@NoeEghdam,@Tozihat,@UserId,@Now,@ActionCode,NULL);
        UPDATE [Akhbar].[Khabar] SET [CurrentStatusCode]=@StatusCode,[LastActionCode]=@ActionCode,[CurrentUserId]=@UserId,[CurrentPostId]=@FromPostId,[CurrentMahal]=@FromMahal,[StatusDateTime]=@Now WHERE [ShomareKhabar]=@ShomareKhabar;
      COMMIT;
      SELECT @ShomareKhabar [ShomareKhabar],@UserId [ToUserId],@FromPostId [ToPostId],@FromMahal [ToMahal],@ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@StatusCode [CurrentStatusCode],@Tozihat [Tozihat],N'تأیید نهایی' [StateName],CAST(1 AS BIT) [IsFinal];
      RETURN;
    END

    SET @StatusCode=CASE @ToRollId WHEN 1 THEN N'KARTABL_SETAD_KARSHENAS' WHEN 2 THEN CASE @ToPostId WHEN 53 THEN N'KARTABL_OSTAN_KARDAN' WHEN 52 THEN N'KARTABL_OSTAN_KARSHENAS' WHEN 51 THEN N'KARTABL_OSTAN_MASOOL' WHEN 50 THEN N'KARTABL_OSTAN_RAEIS' ELSE N'KARTABL_OSTAN' END WHEN 3 THEN CASE @ToPostId WHEN 61 THEN N'KARTABL_HOZE_TAHGHIGH' WHEN 60 THEN N'KARTABL_HOZE_RAEIS' ELSE N'KARTABL_HOZE' END WHEN 4 THEN N'KARTABL_NAMAYANDE_SH' ELSE N'KARTABL_OTHER' END;
    SET @ActionCode=N'TAEED_ERSAL_KHABAR';

    BEGIN TRAN;
      UPDATE [Akhbar].[KhabarKartabl] SET [IsActive]=0 WHERE [ShomareKhabar]=@ShomareKhabar AND [IsActive]=1;
      INSERT INTO [Akhbar].[KhabarKartabl]([ShomareKhabar],[CurrentUserId],[CurrentPostId],[CurrentMahal],[FromUserId],[FromPostId],[FromMahal],[ErsalDateTime],[IsActive]) VALUES(@ShomareKhabar,@ToUserId,@ToPostId,@ToMahal,@UserId,@FromPostId,@FromMahal,@Now,1);
      INSERT INTO [Akhbar].[KhabarGardeshLog]([ShomareKhabar],[FromUserId],[FromPostId],[FromMahal],[ToUserId],[ToPostId],[ToMahal],[NoeEghdam],[Tozihat],[CreateUserId],[CreateDateTime],[ActionCode],[EshkalatIds]) VALUES(@ShomareKhabar,@UserId,@FromPostId,@FromMahal,@ToUserId,@ToPostId,@ToMahal,@NoeEghdam,@Tozihat,@UserId,@Now,@ActionCode,NULL);
      UPDATE [Akhbar].[Khabar] SET [CurrentStatusCode]=@StatusCode,[LastActionCode]=@ActionCode,[CurrentUserId]=@ToUserId,[CurrentPostId]=@ToPostId,[CurrentMahal]=@ToMahal,[StatusDateTime]=@Now WHERE [ShomareKhabar]=@ShomareKhabar;
    COMMIT;

    SELECT @ShomareKhabar [ShomareKhabar],@ToUserId [ToUserId],@ToPostId [ToPostId],@ToMahal [ToMahal],@ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@StatusCode [CurrentStatusCode],@Tozihat [Tozihat],N'ارسال شد' [StateName],CAST(0 AS BIT) [IsFinal];
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_ReturnKhabar]
    @ShomareKhabar BIGINT,
    @UserId BIGINT,
    @Tozihat NVARCHAR(2000),
    @EshkalatIds NVARCHAR(500)=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NULLIF(LTRIM(RTRIM(@EshkalatIds)),N'') IS NULL
      THROW 51000,N'انتخاب حداقل یک علت برگشت اجباری است.',1;
    IF NULLIF(LTRIM(RTRIM(@Tozihat)),N'') IS NULL
      THROW 51000,N'علت برگشت اجباری است.',1;

    IF EXISTS
    (
      SELECT 1 FROM STRING_SPLIT(@EshkalatIds,N',') S
      WHERE TRY_CAST(LTRIM(RTRIM(S.[value])) AS BIGINT) IS NULL
         OR NOT EXISTS(SELECT 1 FROM [dbo].[DFN] D WHERE D.[ID]=TRY_CAST(LTRIM(RTRIM(S.[value])) AS BIGINT) AND D.[PID]=71104)
    ) THROW 51000,N'یکی از تگ‌های علت برگشت معتبر نیست.',1;

    DECLARE @FromPostId BIGINT,@FromMahal BIGINT,@ToUserId BIGINT,@ToPostId BIGINT,@ToMahal BIGINT,
            @ToFullName NVARCHAR(500),@ToOnvanPost NVARCHAR(500),@ToNameMahal NVARCHAR(1000),@ToRollId INT,
            @StatusCode NVARCHAR(60),@Now NVARCHAR(20);

    SELECT @FromPostId=U.[PostId],@FromMahal=U.[Mahal] FROM [dbo].[Users] U WHERE U.[UserId]=@UserId AND U.[IsActive]=1;
    IF @FromPostId IS NULL THROW 51000,N'کاربر فعال یافت نشد.',1;

    IF NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarKartabl] KT WHERE KT.[ShomareKhabar]=@ShomareKhabar AND KT.[IsActive]=1 AND KT.[CurrentUserId]=@UserId)
      THROW 51000,N'این خبر در کارتابل جاری شما نیست.',1;

    SELECT TOP(1) @ToUserId=L.[FromUserId],@ToPostId=L.[FromPostId],@ToMahal=L.[FromMahal]
    FROM [Akhbar].[KhabarGardeshLog] L
    WHERE L.[ShomareKhabar]=@ShomareKhabar AND L.[ToUserId]=@UserId
      AND L.[NoeEghdam] IN(N'ارسال خبر',N'تأیید و ارسال')
      AND ISNULL(L.[ActionCode],N'') NOT LIKE N'BARGASHT_%'
    ORDER BY L.[LogId] DESC;

    IF @ToUserId IS NULL THROW 51000,N'فرستنده قبلی خبر برای برگشت یافت نشد.',1;
    SELECT @ToRollId=P.[RollId] FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;
    SET @StatusCode=CASE @ToRollId WHEN 1 THEN N'BARGASHT_SETAD' WHEN 2 THEN N'BARGASHT_OSTAN' WHEN 3 THEN N'BARGASHT_HOZE' WHEN 4 THEN N'BARGASHT_NAMAYANDE_SH' ELSE N'BARGASHT_OTHER' END;

    SELECT @ToFullName=ISNULL(V.[FullName],N'') FROM [dbo].[Vbl_Users] V WHERE V.[UserId]=@ToUserId;
    SELECT @ToOnvanPost=ISNULL(P.[OnvanPost],N'') FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;
    SET @ToNameMahal=CASE @ToRollId WHEN 1 THEN N'ستاد' WHEN 3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=@ToMahal),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=@ToMahal),N'') END;
    SET @Now=[dbo].[FarsiDateTimeNow]();

    BEGIN TRAN;
      UPDATE [Akhbar].[KhabarKartabl] SET [IsActive]=0 WHERE [ShomareKhabar]=@ShomareKhabar AND [IsActive]=1;
      INSERT INTO [Akhbar].[KhabarKartabl]([ShomareKhabar],[CurrentUserId],[CurrentPostId],[CurrentMahal],[FromUserId],[FromPostId],[FromMahal],[ErsalDateTime],[IsActive]) VALUES(@ShomareKhabar,@ToUserId,@ToPostId,@ToMahal,@UserId,@FromPostId,@FromMahal,@Now,1);
      INSERT INTO [Akhbar].[KhabarGardeshLog]([ShomareKhabar],[FromUserId],[FromPostId],[FromMahal],[ToUserId],[ToPostId],[ToMahal],[NoeEghdam],[Tozihat],[CreateUserId],[CreateDateTime],[ActionCode],[EshkalatIds]) VALUES(@ShomareKhabar,@UserId,@FromPostId,@FromMahal,@ToUserId,@ToPostId,@ToMahal,N'برگشت خبر',LTRIM(RTRIM(@Tozihat)),@UserId,@Now,N'BARGASHT_KHABAR',LTRIM(RTRIM(@EshkalatIds)));
      UPDATE [Akhbar].[Khabar] SET [CurrentStatusCode]=@StatusCode,[LastActionCode]=N'BARGASHT_KHABAR',[CurrentUserId]=@ToUserId,[CurrentPostId]=@ToPostId,[CurrentMahal]=@ToMahal,[StatusDateTime]=@Now WHERE [ShomareKhabar]=@ShomareKhabar;
    COMMIT;

    SELECT @ShomareKhabar [ShomareKhabar],@ToUserId [ToUserId],@ToPostId [ToPostId],@ToMahal [ToMahal],@ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@StatusCode [CurrentStatusCode],N'برگشت شد' [StateName];
END
GO

/* دسترسی نمایش: فقط سازنده، دارنده فعلی کارتابل، یا کاربری که در گردش این خبر حضور داشته است. */
CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarById]
    @ShomareKhabar BIGINT,@UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanViewKhabar](@ShomareKhabar,@UserId)=0 THROW 51000,N'اجازه مشاهده این خبر را ندارید.',1;

    SELECT K.[ShomareKhabar],K.[TabaqehBandi],TB.[NameFarsi] [TabaqehBandiName],K.[ManbaKhabarId],M.[NameFarsi] [ManbaKhabarName],
           K.[NoeKhabar],NK.[NameFarsi] [NoeKhabarName],K.[TarikhNameh],K.[ShomareNameh],K.[OnvanKhabar],K.[SharhKhabar],K.[MolahazatKhabar],
           K.[NoghteKhabarkhizId],N.[Onvan] [NoghteKhabarkhizName],K.[MahalNoghteKhabarkhiz],K.[TarikhEnteshar],K.[CreateMahal],K.[CreatePostId],K.[CreateUserId],K.[CreateDateTime],K.[LastEditUserId],K.[LastEditDateTime],
           K.[CurrentStatusCode],K.[LastActionCode],K.[CurrentUserId],K.[CurrentPostId],K.[CurrentMahal],K.[StatusDateTime],
           CASE WHEN K.[CurrentStatusCode]=N'PISHNEVIS' THEN N'پیش‌نویس' WHEN K.[CurrentStatusCode]=N'TAEED_NAHAEI_SETAD' THEN N'تأیید نهایی در ستاد' WHEN K.[CurrentStatusCode] LIKE N'BARGASHT_%' THEN N'برگشت شده برای اصلاح' WHEN K.[CurrentStatusCode] LIKE N'KARTABL_%' THEN N'در کارتابل' ELSE N'در حال گردش' END [CurrentStatusName],
           ISNULL(CU.[FullName],N'') [CurrentUserName],ISNULL(CP.[OnvanPost],N'') [CurrentPostName],
           CASE WHEN CP.[RollId]=1 THEN N'ستاد' WHEN CP.[RollId]=3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=K.[CurrentMahal]),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=K.[CurrentMahal]),N'') END [CurrentMahalName],
           CAST(CASE WHEN K.[CreateUserId]=@UserId THEN 1 ELSE 0 END AS BIT) [IsOwner],
           CAST(CASE WHEN K.[CurrentUserId]=@UserId AND (K.[CurrentStatusCode] LIKE N'KARTABL_%' OR K.[CurrentStatusCode] LIKE N'BARGASHT_%') THEN 1 ELSE 0 END AS BIT) [IsInbox],
           CAST(CASE WHEN K.[CurrentStatusCode] LIKE N'BARGASHT_%' THEN 1 ELSE 0 END AS BIT) [IsReturned],
           CAST(CASE WHEN K.[CurrentUserId]=@UserId AND EXISTS(SELECT 1 FROM [Akhbar].[KhabarGardeshLog] RL WHERE RL.[ShomareKhabar]=K.[ShomareKhabar] AND RL.[ToUserId]=@UserId AND RL.[NoeEghdam] IN(N'ارسال خبر',N'تأیید و ارسال')) THEN 1 ELSE 0 END AS BIT) [CanReturn],
           (SELECT TOP(1) RR.[Tozihat] FROM [Akhbar].[KhabarGardeshLog] RR WHERE RR.[ShomareKhabar]=K.[ShomareKhabar] AND RR.[ToUserId]=@UserId AND RR.[NoeEghdam]=N'برگشت خبر' ORDER BY RR.[LogId] DESC) [LastReturnReason]
    FROM [Akhbar].[Khabar] K
    LEFT JOIN [dbo].[DFN] TB ON TB.[PID]=71101 AND TRY_CAST(TB.[Value] AS BIGINT)=K.[TabaqehBandi]
    INNER JOIN [dbo].[DFN] M ON M.[ID]=K.[ManbaKhabarId] AND M.[PID]=10201
    LEFT JOIN [dbo].[DFN] NK ON NK.[PID]=71102 AND TRY_CAST(NK.[Value] AS BIGINT)=K.[NoeKhabar]
    LEFT JOIN [Akhbar].[NoghatKhabarkhiz] N ON N.[NoghteKhabarkhizId]=K.[NoghteKhabarkhizId]
    LEFT JOIN [dbo].[Vbl_Users] CU ON CU.[UserId]=K.[CurrentUserId]
    LEFT JOIN [dbo].[Posts] CP ON CP.[PostId]=K.[CurrentPostId]
    WHERE K.[ShomareKhabar]=@ShomareKhabar AND K.[IsDelete]=0;
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarGardesh]
    @ShomareKhabar BIGINT,@UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanViewKhabar](@ShomareKhabar,@UserId)=0 THROW 51000,N'اجازه مشاهده گردش این خبر را ندارید.',1;

    SELECT K.[ShomareKhabar],K.[OnvanKhabar],K.[CurrentStatusCode],K.[LastActionCode],K.[StatusDateTime],ISNULL(V.[FullName],N'') [CurrentUserName],ISNULL(P.[OnvanPost],N'') [CurrentPostName],
           CASE WHEN P.[RollId]=1 THEN N'ستاد' WHEN P.[RollId]=3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=K.[CurrentMahal]),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=K.[CurrentMahal]),N'') END [CurrentMahalName],
           CASE WHEN K.[CurrentStatusCode]=N'PISHNEVIS' THEN N'پیش‌نویس' WHEN K.[CurrentStatusCode]=N'TAEED_NAHAEI_SETAD' THEN N'تأیید نهایی در ستاد' WHEN K.[CurrentStatusCode] LIKE N'BARGASHT_%' THEN N'برگشت شده برای اصلاح' WHEN K.[CurrentStatusCode] LIKE N'KARTABL_%' THEN N'در کارتابل' ELSE N'در حال گردش' END [CurrentStatusName]
    FROM [Akhbar].[Khabar] K LEFT JOIN [dbo].[Vbl_Users] V ON V.[UserId]=K.[CurrentUserId] LEFT JOIN [dbo].[Posts] P ON P.[PostId]=K.[CurrentPostId]
    WHERE K.[ShomareKhabar]=@ShomareKhabar;

    SELECT * FROM
    (
      SELECT CAST(0 AS BIGINT) [LogId],K.[ShomareKhabar],N'ایجاد خبر' [NoeEghdam],N'IJAD_KHABAR' [ActionCode],CAST(NULL AS NVARCHAR(2000)) [Tozihat],CAST(NULL AS NVARCHAR(500)) [EshkalatIds],K.[CreateDateTime],K.[CreateUserId] [FromUserId],K.[CreatePostId] [FromPostId],K.[CreateMahal] [FromMahal],ISNULL(V.[FullName],N'') [FromUserName],ISNULL(P.[OnvanPost],N'') [FromPostName],CASE WHEN P.[RollId]=1 THEN N'ستاد' WHEN P.[RollId]=3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=K.[CreateMahal]),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=K.[CreateMahal]),N'') END [FromMahalName],CAST(NULL AS BIGINT) [ToUserId],CAST(NULL AS BIGINT) [ToPostId],CAST(NULL AS BIGINT) [ToMahal],N'' [ToUserName],N'' [ToPostName],N'' [ToMahalName]
      FROM [Akhbar].[Khabar] K LEFT JOIN [dbo].[Vbl_Users] V ON V.[UserId]=K.[CreateUserId] LEFT JOIN [dbo].[Posts] P ON P.[PostId]=K.[CreatePostId] WHERE K.[ShomareKhabar]=@ShomareKhabar
      UNION ALL
      SELECT L.[LogId],L.[ShomareKhabar],L.[NoeEghdam],ISNULL(L.[ActionCode],N''),L.[Tozihat],L.[EshkalatIds],L.[CreateDateTime],L.[FromUserId],L.[FromPostId],L.[FromMahal],ISNULL(FU.[FullName],N''),ISNULL(FP.[OnvanPost],N''),CASE WHEN FP.[RollId]=1 THEN N'ستاد' WHEN FP.[RollId]=3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=L.[FromMahal]),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=L.[FromMahal]),N'') END,L.[ToUserId],L.[ToPostId],L.[ToMahal],ISNULL(TU.[FullName],N''),ISNULL(TP.[OnvanPost],N''),CASE WHEN TP.[RollId]=1 THEN N'ستاد' WHEN TP.[RollId]=3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=L.[ToMahal]),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=L.[ToMahal]),N'') END
      FROM [Akhbar].[KhabarGardeshLog] L LEFT JOIN [dbo].[Vbl_Users] FU ON FU.[UserId]=L.[FromUserId] LEFT JOIN [dbo].[Posts] FP ON FP.[PostId]=L.[FromPostId] LEFT JOIN [dbo].[Vbl_Users] TU ON TU.[UserId]=L.[ToUserId] LEFT JOIN [dbo].[Posts] TP ON TP.[PostId]=L.[ToPostId]
      WHERE L.[ShomareKhabar]=@ShomareKhabar
    ) X ORDER BY X.[LogId];
END
GO

/* این سه Procedure نیز دسترسی سراسری ستاد را حذف می‌کنند. */
CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarAshkhas]
    @ShomareKhabar BIGINT,@UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanViewKhabar](@ShomareKhabar,@UserId)=0 THROW 51000,N'اجازه مشاهده اشخاص وابسته این خبر را ندارید.',1;
    SELECT KA.[KhabarShakhsId],KA.[ShomarehParvandeh],A.[FirstName],A.[LastName],A.[NamePedar],KA.[CreateDateTime]
    FROM [Akhbar].[KhabarAshkhas] KA INNER JOIN [Davtalab].[Ashkhas] A ON A.[ShomarehParvandeh]=KA.[ShomarehParvandeh]
    WHERE KA.[ShomareKhabar]=@ShomareKhabar AND KA.[IsDelete]=0 ORDER BY KA.[KhabarShakhsId] DESC;
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarPeyvastha]
    @ShomareKhabar BIGINT,@UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanViewKhabar](@ShomareKhabar,@UserId)=0 THROW 51000,N'اجازه مشاهده پیوست‌های این خبر را ندارید.',1;
    SELECT KP.[KhabarPeyvastId],KP.[ShomareKhabar],KP.[FileName],KP.[OriginalFileName],ISNULL(PF.[FileSize],0) [FileSize],ISNULL(PF.[CreateDateTime],KP.[CreateDateTime]) [CreateDateTime]
    FROM [Akhbar].[KhabarPeyvast] KP LEFT JOIN [MeratFilesDB].[dbo].[PeyvastFiles] PF ON PF.[FileName]=KP.[FileName]
    WHERE KP.[ShomareKhabar]=@ShomareKhabar ORDER BY KP.[KhabarPeyvastId];
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarPeyvastFile]
    @ShomareKhabar BIGINT,@FileName NVARCHAR(250),@UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    IF [Akhbar].[FN_CanViewKhabar](@ShomareKhabar,@UserId)=0 THROW 51000,N'اجازه مشاهده فایل پیوست این خبر را ندارید.',1;
    SELECT TOP(1) PF.[FileName],PF.[Files],PF.[FileSize]
    FROM [Akhbar].[KhabarPeyvast] KP INNER JOIN [MeratFilesDB].[dbo].[PeyvastFiles] PF ON PF.[FileName]=KP.[FileName]
    WHERE KP.[ShomareKhabar]=@ShomareKhabar AND KP.[FileName]=@FileName;
END
GO



/* ============================================================
   کارتابل‌های شخصی: کارتابل / ارسال‌شده / برگشت‌شده
   شامل پشتیبانی از تأیید نهایی ستاد و نام رسمی حوزه انتخابیه
   ============================================================ */
CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarBoxCounts]
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @PostId BIGINT, @Mahal BIGINT;
    SELECT @PostId=[PostId], @Mahal=[Mahal]
    FROM [dbo].[Users]
    WHERE [UserId]=@UserId AND [IsActive]=1;

    IF @PostId IS NULL THROW 51000,N'کاربر فعال یافت نشد.',1;

    SELECT
      (
        SELECT COUNT(*)
        FROM [Akhbar].[Khabar] K
        WHERE K.[IsDelete]=0
          AND
          (
            (K.[CurrentStatusCode]=N'PISHNEVIS' AND K.[CreateUserId]=@UserId)
            OR
            (
              K.[CurrentUserId]=@UserId
              AND K.[CurrentPostId]=@PostId
              AND K.[CurrentMahal]=@Mahal
              AND (K.[CurrentStatusCode] LIKE N'KARTABL_%' OR K.[CurrentStatusCode] LIKE N'BARGASHT_%')
            )
          )
      ) [KartablCount],
      (
        SELECT COUNT(DISTINCT L.[ShomareKhabar])
        FROM [Akhbar].[KhabarGardeshLog] L
        INNER JOIN [Akhbar].[Khabar] K ON K.[ShomareKhabar]=L.[ShomareKhabar] AND K.[IsDelete]=0
        WHERE L.[FromUserId]=@UserId
          AND L.[FromPostId]=@PostId
          AND L.[FromMahal]=@Mahal
          AND L.[NoeEghdam] IN(N'ارسال خبر',N'تأیید و ارسال',N'تأیید نهایی')
          AND
          (
            K.[CurrentStatusCode]=N'TAEED_NAHAEI_SETAD'
            OR NOT (K.[CurrentUserId]=@UserId AND K.[CurrentPostId]=@PostId AND K.[CurrentMahal]=@Mahal)
          )
      ) [SentCount],
      (
        SELECT COUNT(*)
        FROM [Akhbar].[Khabar] K
        WHERE K.[IsDelete]=0
          AND K.[CurrentUserId]=@UserId
          AND K.[CurrentPostId]=@PostId
          AND K.[CurrentMahal]=@Mahal
          AND K.[CurrentStatusCode] LIKE N'BARGASHT_%'
      ) [ReturnedCount];
END
GO

CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarPage]
    @UserId BIGINT,
    @Page INT,
    @SizePage INT,
    @SortIndex INT=1,
    @SECDEC INT=2,
    @Search NVARCHAR(200)=N'',
    @BoxType INT=1
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page<1 SET @Page=1;
    IF @SizePage<1 SET @SizePage=20;
    IF @SizePage>100 SET @SizePage=100;
    IF @SortIndex NOT BETWEEN 1 AND 5 SET @SortIndex=1;
    IF @SECDEC NOT IN(1,2) SET @SECDEC=2;
    IF @BoxType NOT IN(1,2,3) SET @BoxType=1;

    SET @Search=[dbo].[NormalizePersianText](ISNULL(LTRIM(RTRIM(@Search)),N''));

    DECLARE @PostId BIGINT,@Mahal BIGINT;
    SELECT @PostId=[PostId],@Mahal=[Mahal]
    FROM [dbo].[Users]
    WHERE [UserId]=@UserId AND [IsActive]=1;

    IF @PostId IS NULL THROW 51000,N'کاربر فعال یافت نشد.',1;

    ;WITH B AS
    (
      SELECT
             K.[ShomareKhabar],
             K.[TabaqehBandi],
             TB.[NameFarsi] [TabaqehBandiName],
             K.[ManbaKhabarId],
             M.[NameFarsi] [ManbaKhabarName],
             K.[NoeKhabar],
             NK.[NameFarsi] [NoeKhabarName],
             K.[TarikhNameh],
             K.[ShomareNameh],
             K.[OnvanKhabar],
             K.[TarikhEnteshar],
             K.[CreateDateTime],
             K.[LastEditDateTime],
             K.[CreateUserId],
             K.[CreatePostId],
             K.[CreateMahal],
             K.[CurrentStatusCode],
             K.[LastActionCode],
             K.[CurrentUserId],
             K.[CurrentPostId],
             K.[CurrentMahal],
             K.[StatusDateTime],
             CASE K.[CurrentStatusCode]
               WHEN N'PISHNEVIS' THEN N'پیش‌نویس'
               WHEN N'KARTABL_NAMAYANDE_SH' THEN N'در کارتابل نماینده شهرستان'
               WHEN N'KARTABL_HOZE_TAHGHIGH' THEN N'در کارتابل مسئول اسناد و تحقیق حوزه'
               WHEN N'KARTABL_HOZE_RAEIS' THEN N'در کارتابل رئیس حوزه انتخابیه'
               WHEN N'KARTABL_OSTAN_KARDAN' THEN N'در کارتابل کاردان استان'
               WHEN N'KARTABL_OSTAN_KARSHENAS' THEN N'در کارتابل کارشناس استان'
               WHEN N'KARTABL_OSTAN_MASOOL' THEN N'در کارتابل مسئول واحد استان'
               WHEN N'KARTABL_OSTAN_RAEIS' THEN N'در کارتابل رئیس دفتر استان'
               WHEN N'KARTABL_SETAD_KARSHENAS' THEN N'در کارتابل کارشناس اخبار ستاد'
               WHEN N'BARGASHT_NAMAYANDE_SH' THEN N'برگشت شده به نماینده شهرستان'
               WHEN N'BARGASHT_HOZE_TAHGHIGH' THEN N'برگشت شده به مسئول اسناد و تحقیق حوزه'
               WHEN N'BARGASHT_HOZE_RAEIS' THEN N'برگشت شده به رئیس حوزه'
               WHEN N'BARGASHT_OSTAN_KARDAN' THEN N'برگشت شده به کاردان استان'
               WHEN N'BARGASHT_OSTAN_KARSHENAS' THEN N'برگشت شده به کارشناس استان'
               WHEN N'BARGASHT_OSTAN_MASOOL' THEN N'برگشت شده به مسئول واحد استان'
               WHEN N'BARGASHT_OSTAN_RAEIS' THEN N'برگشت شده به رئیس دفتر استان'
               WHEN N'BARGASHT_SETAD' THEN N'برگشت شده در ستاد'
               WHEN N'TAEED_NAHAEI_SETAD' THEN N'تأیید نهایی در ستاد'
               ELSE N'در حال گردش'
             END [CurrentStatusName],
             ISNULL(CU.[FullName],N'') [CurrentUserName],
             ISNULL(CP.[OnvanPost],N'') [CurrentPostName],
             CASE
               WHEN CP.[RollId]=1 THEN N'ستاد'
               WHEN CP.[RollId]=3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=K.[CurrentMahal]),N'حوزه انتخابیه')
               ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=K.[CurrentMahal]),N'')
             END [CurrentMahalName],
             CAST(CASE WHEN K.[CreateUserId]=@UserId THEN 1 ELSE 0 END AS BIT) [IsOwner],
             CAST(CASE
                    WHEN K.[CurrentUserId]=@UserId
                     AND K.[CurrentPostId]=@PostId
                     AND K.[CurrentMahal]=@Mahal
                     AND (K.[CurrentStatusCode] LIKE N'KARTABL_%' OR K.[CurrentStatusCode] LIKE N'BARGASHT_%')
                    THEN 1 ELSE 0
                  END AS BIT) [IsInbox],
             LS.[LastSendDateTime]
      FROM [Akhbar].[Khabar] K
      INNER JOIN [dbo].[DFN] M ON M.[ID]=K.[ManbaKhabarId] AND M.[PID]=10201
      LEFT JOIN [dbo].[DFN] TB ON TB.[PID]=71101 AND TRY_CAST(TB.[Value] AS BIGINT)=K.[TabaqehBandi]
      LEFT JOIN [dbo].[DFN] NK ON NK.[PID]=71102 AND TRY_CAST(NK.[Value] AS BIGINT)=K.[NoeKhabar]
      LEFT JOIN [dbo].[Vbl_Users] CU ON CU.[UserId]=K.[CurrentUserId]
      LEFT JOIN [dbo].[Posts] CP ON CP.[PostId]=K.[CurrentPostId]
      OUTER APPLY
      (
        SELECT TOP(1) L.[CreateDateTime] [LastSendDateTime]
        FROM [Akhbar].[KhabarGardeshLog] L
        WHERE L.[ShomareKhabar]=K.[ShomareKhabar]
          AND L.[FromUserId]=@UserId
          AND L.[FromPostId]=@PostId
          AND L.[FromMahal]=@Mahal
          AND L.[NoeEghdam] IN(N'ارسال خبر',N'تأیید و ارسال',N'تأیید نهایی')
        ORDER BY L.[LogId] DESC
      ) LS
      WHERE K.[IsDelete]=0
        AND
        (
          (
            @BoxType=1
            AND
            (
              (K.[CurrentStatusCode]=N'PISHNEVIS' AND K.[CreateUserId]=@UserId)
              OR
              (
                K.[CurrentUserId]=@UserId
                AND K.[CurrentPostId]=@PostId
                AND K.[CurrentMahal]=@Mahal
                AND (K.[CurrentStatusCode] LIKE N'KARTABL_%' OR K.[CurrentStatusCode] LIKE N'BARGASHT_%')
              )
            )
          )
          OR
          (
            @BoxType=2
            AND LS.[LastSendDateTime] IS NOT NULL
            AND
            (
              K.[CurrentStatusCode]=N'TAEED_NAHAEI_SETAD'
              OR NOT (K.[CurrentUserId]=@UserId AND K.[CurrentPostId]=@PostId AND K.[CurrentMahal]=@Mahal)
            )
          )
          OR
          (
            @BoxType=3
            AND K.[CurrentUserId]=@UserId
            AND K.[CurrentPostId]=@PostId
            AND K.[CurrentMahal]=@Mahal
            AND K.[CurrentStatusCode] LIKE N'BARGASHT_%'
          )
        )
        AND
        (
          @Search=N''
          OR [dbo].[NormalizePersianText](K.[OnvanKhabar]) LIKE N'%'+@Search+N'%'
          OR [dbo].[NormalizePersianText](ISNULL(K.[ShomareNameh],N'')) LIKE N'%'+@Search+N'%'
          OR [dbo].[NormalizePersianText](M.[NameFarsi]) LIKE N'%'+@Search+N'%'
          OR CAST(K.[ShomareKhabar] AS NVARCHAR(30)) LIKE N'%'+@Search+N'%'
        )
    )
    SELECT
      ROW_NUMBER() OVER
      (
        ORDER BY
          CASE WHEN @SortIndex=1 AND @SECDEC=1 THEN [ShomareKhabar] END ASC,
          CASE WHEN @SortIndex=1 AND @SECDEC=2 THEN [ShomareKhabar] END DESC,
          CASE WHEN @SortIndex=2 AND @SECDEC=1 THEN [OnvanKhabar] END ASC,
          CASE WHEN @SortIndex=2 AND @SECDEC=2 THEN [OnvanKhabar] END DESC,
          CASE WHEN @SortIndex=5 AND @SECDEC=1 THEN [CreateDateTime] END ASC,
          CASE WHEN @SortIndex=5 AND @SECDEC=2 THEN [CreateDateTime] END DESC,
          [ShomareKhabar] DESC
      ) [Rdf],
      *,
      (SELECT COUNT(*) FROM B) [TotalCount]
    FROM B
    ORDER BY
      CASE WHEN @SortIndex=1 AND @SECDEC=1 THEN [ShomareKhabar] END ASC,
      CASE WHEN @SortIndex=1 AND @SECDEC=2 THEN [ShomareKhabar] END DESC,
      CASE WHEN @SortIndex=2 AND @SECDEC=1 THEN [OnvanKhabar] END ASC,
      CASE WHEN @SortIndex=2 AND @SECDEC=2 THEN [OnvanKhabar] END DESC,
      CASE WHEN @SortIndex=5 AND @SECDEC=1 THEN [CreateDateTime] END ASC,
      CASE WHEN @SortIndex=5 AND @SECDEC=2 THEN [CreateDateTime] END DESC,
      [ShomareKhabar] DESC
    OFFSET (@Page-1)*@SizePage ROWS FETCH NEXT @SizePage ROWS ONLY;
END
GO

PRINT N'Akhbar workflow update installed successfully.';
GO

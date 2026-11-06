/* MeratDB | اخبار | برگشت رئیس دفتر استان به تأییدکننده واقعی
   بر اساس آخرین سورس تحویلی. ابتدا این فایل را در MeratDB اجرا کنید.
   فقط SP_GetKhabarReturnRecipient و SP_ReturnKhabar تغییر می‌کنند.
   هیچ رکورد قدیمی، گیرنده، کارتابل یا گردش خبر در زمان نصب دستکاری نمی‌شود.
*/
USE [MeratDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [Akhbar].[SP_GetKhabarReturnRecipient]
    @ShomareKhabar BIGINT,
    @UserId BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @KartablId BIGINT,@FromUserId BIGINT,@FromPostId BIGINT,@FromMahal BIGINT,
            @ReturnSourceLogId BIGINT=NULL,@WasReassigned BIT=0,@SenderUserId BIGINT,@SenderPostId BIGINT,@SenderMahal BIGINT;

    -- Only the active province office director can inspect their return recipient.
    SELECT @KartablId=KT.KartablId,@FromUserId=KT.FromUserId,
           @FromPostId=KT.FromPostId,@FromMahal=KT.FromMahal
    FROM Akhbar.Khabar K
    INNER JOIN Akhbar.KhabarKartabl KT ON KT.ShomareKhabar=K.ShomareKhabar
        AND KT.IsActive=1 AND KT.CurrentUserId=K.CurrentUserId
        AND KT.CurrentPostId=K.CurrentPostId AND KT.CurrentMahal=K.CurrentMahal
    INNER JOIN dbo.Users U ON U.UserId=@UserId AND U.IsActive=1
       AND U.PostId=50 AND U.Mahal=K.CurrentMahal
    WHERE K.ShomareKhabar=@ShomareKhabar AND K.IsDelete=0
      AND K.CurrentUserId=@UserId AND K.CurrentPostId=50
      AND K.CurrentStatusCode LIKE N'KARTABL_%';

    IF @KartablId IS NULL OR (SELECT COUNT_BIG(1) FROM Akhbar.KhabarKartabl
       WHERE ShomareKhabar=@ShomareKhabar AND IsActive=1)<>1
       THROW 51940,N'خبر در کارتابل فعال رئیس دفتر استان قرار ندارد.',1;

    -- Reassignment is not a send; its audit preserves the original send LogId.
    SELECT TOP(1) @WasReassigned=1,@ReturnSourceLogId=R.ReturnSourceLogId
    FROM Akhbar.KhabarReassignmentAudit R
    WHERE R.ShomareKhabar=@ShomareKhabar AND R.NewKartablId=@KartablId
    ORDER BY R.ReassignmentId DESC;

    IF @WasReassigned=1 AND @ReturnSourceLogId IS NULL
       THROW 51944,N'سابقه بازتخصیص، شناسه ارسال اصلی را ندارد؛ از برگشت اشتباه جلوگیری شد.',1;

    IF @WasReassigned=0
    BEGIN
      -- This very inbox was created by its sender. Verify identity, role and location
      -- against a genuine send event; never infer a recipient by organizational rank.
      SELECT TOP(1) @ReturnSourceLogId=L.LogId
      FROM Akhbar.KhabarGardeshLog L
      WHERE L.ShomareKhabar=@ShomareKhabar
        AND L.ToUserId=@UserId AND L.ToPostId=50
        AND L.FromUserId=@FromUserId AND L.FromPostId=@FromPostId
        AND L.FromMahal=@FromMahal
        AND L.NoeEghdam IN(N'ارسال خبر',N'تأیید و ارسال')
        AND ISNULL(L.ActionCode,N'') NOT LIKE N'BARGASHT_%'
      ORDER BY L.LogId DESC;
    END;

    IF @ReturnSourceLogId IS NULL
      THROW 51941,N'فرستنده واقعی خبر به رئیس دفتر مشخص نیست؛ برای جلوگیری از برگشت اشتباه، اقدام متوقف شد.',1;

    SELECT @SenderUserId=L.FromUserId,@SenderPostId=L.FromPostId,@SenderMahal=L.FromMahal
    FROM Akhbar.KhabarGardeshLog L
    WHERE L.ShomareKhabar=@ShomareKhabar AND L.LogId=@ReturnSourceLogId
      AND L.NoeEghdam IN(N'ارسال خبر',N'تأیید و ارسال')
      AND ISNULL(L.ActionCode,N'') NOT LIKE N'BARGASHT_%';

    IF @SenderUserId IS NULL OR @SenderUserId=@UserId
      THROW 51942,N'سوابق تأیید و ارسال برای برگشت به فرستنده معتبر نیست.',1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Users U
                   WHERE U.UserId=@SenderUserId AND U.IsActive=1
                     AND U.PostId=@SenderPostId AND U.Mahal=@SenderMahal)
      THROW 51943,N'فرستنده قبلی غیرفعال شده یا سمت و محل خدمت او تغییر کرده است.',1;

    SELECT @SenderUserId AS ToUserId,@SenderPostId AS ToPostId,@SenderMahal AS ToMahal,
           ISNULL(V.FullName,N'') AS ToFullName,
           ISNULL(P.OnvanPost,N'') AS ToOnvanPost,
           CASE WHEN P.RollId=1 THEN N'ستاد'
                WHEN P.RollId=3 THEN ISNULL((SELECT TOP(1) H.NameHozeh FROM Entekhabat.Hozeh H
                                             WHERE H.MarkazHozeh=@SenderMahal),N'حوزه انتخابیه')
                ELSE ISNULL((SELECT TOP(1) C.Name FROM dbo.Citys C
                             WHERE C.CityId=@SenderMahal),N'') END AS ToNameMahal,
           @ReturnSourceLogId AS SourceLogId
    FROM dbo.Users U
    INNER JOIN dbo.Posts P ON P.PostId=U.PostId
    LEFT JOIN dbo.Vbl_Users V ON V.UserId=U.UserId
    WHERE U.UserId=@SenderUserId;
END;

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

    IF NULLIF(LTRIM(RTRIM(@Tozihat)),N'') IS NULL
      THROW 51000,N'علت برگشت اجباری است.',1;

    SET @EshkalatIds=NULLIF(LTRIM(RTRIM(@EshkalatIds)),N'');
    IF @EshkalatIds IS NOT NULL AND EXISTS
    (
      SELECT 1 FROM STRING_SPLIT(@EshkalatIds,N',') S
      WHERE TRY_CAST(LTRIM(RTRIM(S.[value])) AS BIGINT) IS NULL
         OR NOT EXISTS(SELECT 1 FROM [dbo].[DFN] D WHERE D.[ID]=TRY_CAST(LTRIM(RTRIM(S.[value])) AS BIGINT) AND D.[PID]=71104)
    ) THROW 51000,N'یکی از تگ‌های علت برگشت معتبر نیست.',1;

    DECLARE @FromPostId BIGINT,@FromMahal BIGINT,@ToUserId BIGINT,@ToPostId BIGINT,@ToMahal BIGINT,
            @ToFullName NVARCHAR(500),@ToOnvanPost NVARCHAR(500),@ToNameMahal NVARCHAR(1000),@ToRollId INT,
            @StatusCode NVARCHAR(60),@Now NVARCHAR(20),@LockResult INT,@LockResource NVARCHAR(255),
            @LockedUser BIGINT,@LockedPost BIGINT,@LockedMahal BIGINT,@LockedStatus NVARCHAR(60),
            @ClaimFromUserId BIGINT=NULL,@ReassignmentSendLogId BIGINT=NULL;

    BEGIN TRAN;
    SET @LockResource=CONCAT(N'MERAT_NEWS_FLOW_',CONVERT(NVARCHAR(30),@ShomareKhabar));
    EXEC @LockResult=sys.sp_getapplock
      @Resource=@LockResource,
      @LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000;
    IF @LockResult<0 THROW 51510,N'خبر در حال پردازش است؛ دوباره بررسی کنید.',1;

    SELECT @FromPostId=U.[PostId],@FromMahal=U.[Mahal] FROM [dbo].[Users] U WHERE U.[UserId]=@UserId AND U.[IsActive]=1;
    IF @FromPostId IS NULL THROW 51000,N'کاربر فعال یافت نشد.',1;
    SELECT @LockedUser=K.CurrentUserId,@LockedPost=K.CurrentPostId,
           @LockedMahal=K.CurrentMahal,@LockedStatus=K.CurrentStatusCode
    FROM Akhbar.Khabar K WITH (UPDLOCK,HOLDLOCK)
    WHERE K.ShomareKhabar=@ShomareKhabar AND K.IsDelete=0;
    IF @LockedStatus IS NULL OR @LockedStatus NOT LIKE N'KARTABL_%'
      THROW 51511,N'خبر در وضعیت قابل برگشت نیست.',1;
    IF @LockedUser<>@UserId OR @LockedPost<>@FromPostId OR @LockedMahal<>@FromMahal
      THROW 51512,N'خبر دیگر در کارتابل شما قرار ندارد.',1;
    IF EXISTS(SELECT 1 FROM dbo.Posts P WHERE P.PostId=@FromPostId AND P.RollId=1)
       AND Akhbar.FN_SetadNewsProvinceAllowed(@ShomareKhabar,@UserId)=0
      THROW 51513,N'این خبر خارج از استان‌های مجاز شماست.',1;

    IF (SELECT COUNT_BIG(*) FROM Akhbar.KhabarKartabl WHERE ShomareKhabar=@ShomareKhabar AND IsActive=1)<>1
      THROW 51705,N'خبر دارای مغایرت در تعداد کارتابل‌های فعال است.',1;
    IF NOT EXISTS(SELECT 1 FROM [Akhbar].[KhabarKartabl] KT WHERE KT.[ShomareKhabar]=@ShomareKhabar AND KT.[IsActive]=1 AND KT.[CurrentUserId]=@UserId
        AND KT.CurrentPostId=@FromPostId AND KT.CurrentMahal=@FromMahal)
      THROW 51000,N'این خبر در کارتابل جاری شما نیست.',1;

    -- Phase 8: a managerial transfer is NOT a send. If this inbox was
    -- reassigned, use the original real send event, not the old inbox owner.
    SELECT TOP(1) @ReassignmentSendLogId=R.ReturnSourceLogId
    FROM Akhbar.KhabarReassignmentAudit R
    JOIN Akhbar.KhabarKartabl KT ON KT.KartablId=R.NewKartablId
    WHERE KT.ShomareKhabar=@ShomareKhabar AND KT.IsActive=1
      AND KT.CurrentUserId=@UserId
    ORDER BY R.ReassignmentId DESC;
    -- رئيس دفتر استان (PostId=50): برگشت فقط به همان شخصِ ثبت‌کننده
    -- آخرین «تأیید و ارسال» واقعی به رئیس دفتر، نه صاحب قبلی کارتابل/بازتخصیص.
    -- The resolver is executed under the existing per-news application lock.
    IF @FromPostId=50
    BEGIN
      DECLARE @DirectReturn TABLE
      (
        ToUserId BIGINT NOT NULL,ToPostId BIGINT NOT NULL,ToMahal BIGINT NOT NULL,
        ToFullName NVARCHAR(500),ToOnvanPost NVARCHAR(500),ToNameMahal NVARCHAR(1000),
        SourceLogId BIGINT NOT NULL
      );
      INSERT INTO @DirectReturn(ToUserId,ToPostId,ToMahal,ToFullName,ToOnvanPost,ToNameMahal,SourceLogId)
        EXEC [Akhbar].[SP_GetKhabarReturnRecipient] @ShomareKhabar=@ShomareKhabar,@UserId=@UserId;
      SELECT @ToUserId=R.ToUserId,@ToPostId=R.ToPostId,@ToMahal=R.ToMahal
      FROM @DirectReturn R;
    END
    ELSE IF @ReassignmentSendLogId IS NOT NULL
    BEGIN
      SELECT @ToUserId=L.FromUserId,@ToPostId=L.FromPostId,@ToMahal=L.FromMahal
      FROM Akhbar.KhabarGardeshLog L
      WHERE L.ShomareKhabar=@ShomareKhabar AND L.LogId=@ReassignmentSendLogId;
    END
    ELSE
    BEGIN
      -- Preserve regular return routing and the HQ manager claim exception.
      IF @FromMahal=1 AND @FromPostId=2 AND @LockedStatus=N'KARTABL_SETAD_KARSHENAS'
         AND EXISTS(SELECT 1 FROM Akhbar.Khabar K WHERE K.ShomareKhabar=@ShomareKhabar AND K.LastActionCode=N'TAHVIL_SETAD_RAEIS')
      BEGIN
        SELECT TOP(1) @ClaimFromUserId=L.FromUserId
        FROM Akhbar.KhabarGardeshLog L
        WHERE L.ShomareKhabar=@ShomareKhabar AND L.ToUserId=@UserId
          AND L.ActionCode=N'TAHVIL_SETAD_RAEIS'
        ORDER BY L.LogId DESC;
        -- The HQ expert may itself have received this news by reassignment
        -- before the manager claimed it. Follow that transfer context first.
        IF @ClaimFromUserId IS NOT NULL
        BEGIN
          SELECT TOP(1) @ReassignmentSendLogId=R.ReturnSourceLogId
          FROM Akhbar.KhabarReassignmentAudit R
          JOIN Akhbar.KhabarKartabl KT ON KT.KartablId=R.NewKartablId
          WHERE R.ShomareKhabar=@ShomareKhabar AND R.NewUserId=@ClaimFromUserId
            AND KT.IsActive=0
          ORDER BY R.ReassignmentId DESC;
          IF @ReassignmentSendLogId IS NOT NULL
          BEGIN
            SELECT @ToUserId=L.FromUserId,@ToPostId=L.FromPostId,@ToMahal=L.FromMahal
            FROM Akhbar.KhabarGardeshLog L
            WHERE L.ShomareKhabar=@ShomareKhabar AND L.LogId=@ReassignmentSendLogId;
          END;
        END;
      END;
      IF @ToUserId IS NULL
        SELECT TOP(1) @ToUserId=L.FromUserId,@ToPostId=L.FromPostId,@ToMahal=L.FromMahal
        FROM Akhbar.KhabarGardeshLog L
        WHERE L.ShomareKhabar=@ShomareKhabar
          AND L.ToUserId=COALESCE(@ClaimFromUserId,@UserId)
          AND L.NoeEghdam IN(N'ارسال خبر',N'تأیید و ارسال')
          AND ISNULL(L.ActionCode,N'') NOT LIKE N'BARGASHT_%'
        ORDER BY L.LogId DESC;
    END;

    IF @ToUserId IS NULL THROW 51000,N'فرستنده قبلی خبر برای برگشت یافت نشد.',1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Users U WHERE U.UserId=@ToUserId AND U.IsActive=1
                   AND U.PostId=@ToPostId AND U.Mahal=@ToMahal)
      THROW 51514,N'حساب فرستنده قبلی غیرفعال یا محل خدمتش تغییر کرده است.',1;
    SELECT @ToRollId=P.[RollId] FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;
    IF @ToRollId=1 AND Akhbar.FN_SetadNewsProvinceAllowed(@ShomareKhabar,@ToUserId)=0
      THROW 51515,N'مجوز استان فرستنده ستاد تغییر کرده است؛ خبر باید توسط مدیر بازتخصیص یابد.',1;
    SET @StatusCode=CASE
      WHEN @ToPostId=53 THEN N'BARGASHT_OSTAN_KARDAN'
      WHEN @ToPostId=52 THEN N'BARGASHT_OSTAN_KARSHENAS'
      WHEN @ToPostId=51 THEN N'BARGASHT_OSTAN_MASOOL'
      WHEN @ToPostId=50 THEN N'BARGASHT_OSTAN_RAEIS'
      WHEN @ToPostId=61 THEN N'BARGASHT_HOZE_TAHGHIGH'
      WHEN @ToPostId=60 THEN N'BARGASHT_HOZE_RAEIS'
      WHEN @ToRollId=1 THEN N'BARGASHT_SETAD'
      WHEN @ToRollId=2 THEN N'BARGASHT_OSTAN'
      WHEN @ToRollId=3 THEN N'BARGASHT_HOZE'
      WHEN @ToRollId=4 THEN N'BARGASHT_NAMAYANDE_SH'
      ELSE N'BARGASHT_OTHER' END;

    SELECT @ToFullName=ISNULL(V.[FullName],N'') FROM [dbo].[Vbl_Users] V WHERE V.[UserId]=@ToUserId;
    SELECT @ToOnvanPost=ISNULL(P.[OnvanPost],N'') FROM [dbo].[Posts] P WHERE P.[PostId]=@ToPostId;
    SET @ToNameMahal=CASE @ToRollId WHEN 1 THEN N'ستاد' WHEN 3 THEN ISNULL((SELECT TOP(1) H.[NameHozeh] FROM [Entekhabat].[Hozeh] H WHERE H.[MarkazHozeh]=@ToMahal),N'حوزه انتخابیه') ELSE ISNULL((SELECT TOP(1) C.[Name] FROM [dbo].[Citys] C WHERE C.[CityId]=@ToMahal),N'') END;
    SET @Now=[dbo].[FarsiDateTimeNow]();

    -- Same transaction as the locked authorization and previous-sender lookup.
      UPDATE [Akhbar].[KhabarKartabl] SET [IsActive]=0 WHERE [ShomareKhabar]=@ShomareKhabar AND [IsActive]=1;
      INSERT INTO [Akhbar].[KhabarKartabl]([ShomareKhabar],[CurrentUserId],[CurrentPostId],[CurrentMahal],[FromUserId],[FromPostId],[FromMahal],[ErsalDateTime],[IsActive]) VALUES(@ShomareKhabar,@ToUserId,@ToPostId,@ToMahal,@UserId,@FromPostId,@FromMahal,@Now,1);
      INSERT INTO [Akhbar].[KhabarGardeshLog]([ShomareKhabar],[FromUserId],[FromPostId],[FromMahal],[ToUserId],[ToPostId],[ToMahal],[NoeEghdam],[Tozihat],[CreateUserId],[CreateDateTime],[ActionCode],[EshkalatIds]) VALUES(@ShomareKhabar,@UserId,@FromPostId,@FromMahal,@ToUserId,@ToPostId,@ToMahal,N'برگشت خبر',LTRIM(RTRIM(@Tozihat)),@UserId,@Now,N'BARGASHT_KHABAR',LTRIM(RTRIM(@EshkalatIds)));
      UPDATE [Akhbar].[Khabar] SET [CurrentStatusCode]=@StatusCode,[LastActionCode]=N'BARGASHT_KHABAR',[CurrentUserId]=@ToUserId,[CurrentPostId]=@ToPostId,[CurrentMahal]=@ToMahal,[StatusDateTime]=@Now WHERE [ShomareKhabar]=@ShomareKhabar;
    COMMIT;

    SELECT @ShomareKhabar [ShomareKhabar],@ToUserId [ToUserId],@ToPostId [ToPostId],@ToMahal [ToMahal],@ToFullName [ToFullName],@ToOnvanPost [ToOnvanPost],@ToNameMahal [ToNameMahal],@StatusCode [CurrentStatusCode],N'برگشت شد' [StateName];
END
GO

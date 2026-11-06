USE [MeratDB];
GO

-- A self-contained profile photo store for signed-in users.
-- Does not depend on PersonFiles or MeratFilesDB.
IF OBJECT_ID(N'dbo.UserAvatar',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserAvatar
    (
        UserId BIGINT NOT NULL CONSTRAINT PK_UserAvatar PRIMARY KEY,
        PhotoJpeg VARBINARY(MAX) NOT NULL,
        UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_UserAvatar_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_UserAvatar_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
    );
END;
GO

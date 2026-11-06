/* Merat Phase 169 - Each authenticated user maintains one private signature image.
   Run on MeratDB. This script does not alter dbo.Users or dbo.Person. */
USE [MeratDB];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID(N'dbo.UserSignature', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserSignature
    (
        UserId BIGINT NOT NULL,
        SignaturePng VARBINARY(MAX) NOT NULL,
        CreatedAtUtc DATETIME2(3) NOT NULL
            CONSTRAINT DF_UserSignature_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc DATETIME2(3) NOT NULL
            CONSTRAINT DF_UserSignature_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserSignature PRIMARY KEY CLUSTERED (UserId),
        CONSTRAINT FK_UserSignature_Users FOREIGN KEY (UserId)
            REFERENCES dbo.Users(UserId),
        CONSTRAINT CK_UserSignature_ImageSize CHECK (
            DATALENGTH(SignaturePng) BETWEEN 45 AND 524288
        )
    );
END;
GO
SELECT CASE WHEN OBJECT_ID(N'dbo.UserSignature', N'U') IS NOT NULL
    THEN N'INSTALLED' ELSE N'MISSING' END AS UserSignatureStatus;
GO

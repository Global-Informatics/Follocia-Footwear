CREATE DATABASE FollociaDb;
GO

USE FollociaDb;
GO

CREATE TABLE dbo.Products
(
    Id NVARCHAR(64) NOT NULL CONSTRAINT PK_Products PRIMARY KEY,
    Title NVARCHAR(180) NOT NULL,
    Edition NVARCHAR(80) NOT NULL,
    PriceAmount DECIMAL(10, 2) NOT NULL,
    CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Products_CurrencyCode DEFAULT ('EUR'),
    Tone NVARCHAR(100) NOT NULL,
    ImagePath NVARCHAR(260) NOT NULL,
    Description NVARCHAR(1200) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT (1),
    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Products_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc DATETIME2 NULL
);
GO

CREATE TABLE dbo.ProductSizes
(
    ProductId NVARCHAR(64) NOT NULL,
    SizeLabel NVARCHAR(12) NOT NULL,
    StockQuantity INT NOT NULL CONSTRAINT DF_ProductSizes_StockQuantity DEFAULT (0),
    CONSTRAINT PK_ProductSizes PRIMARY KEY (ProductId, SizeLabel),
    CONSTRAINT FK_ProductSizes_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id)
);
GO

CREATE TABLE dbo.VipSubscribers
(
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VipSubscribers PRIMARY KEY,
    Email NVARCHAR(256) NOT NULL,
    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_VipSubscribers_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_VipSubscribers_Email UNIQUE (Email)
);
GO

CREATE TABLE dbo.Reservations
(
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Reservations PRIMARY KEY,
    CustomerEmail NVARCHAR(256) NULL,
    Status NVARCHAR(32) NOT NULL CONSTRAINT DF_Reservations_Status DEFAULT ('Draft'),
    SubtotalAmount DECIMAL(10, 2) NOT NULL CONSTRAINT DF_Reservations_SubtotalAmount DEFAULT (0),
    CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_Reservations_CurrencyCode DEFAULT ('EUR'),
    CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Reservations_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.ReservationItems
(
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ReservationItems PRIMARY KEY,
    ReservationId INT NOT NULL,
    ProductId NVARCHAR(64) NOT NULL,
    SizeLabel NVARCHAR(12) NOT NULL,
    Quantity INT NOT NULL CONSTRAINT DF_ReservationItems_Quantity DEFAULT (1),
    UnitPriceAmount DECIMAL(10, 2) NOT NULL,
    CONSTRAINT FK_ReservationItems_Reservations FOREIGN KEY (ReservationId) REFERENCES dbo.Reservations(Id),
    CONSTRAINT FK_ReservationItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id)
);
GO

INSERT INTO dbo.Products (Id, Title, Edition, PriceAmount, Tone, ImagePath, Description)
VALUES
(
    'atelier-01',
    N'Atelier 01 — Lumière',
    N'Edition of 220',
    1480.00,
    N'Ivory Calfskin',
    N'/assets/collection-1.jpg',
    N'Hand-lasted in Florence over thirty-two hours. Lined in nude nappa, finished with a 24-carat gold-plated heel signature. Numbered. Never reissued.'
),
(
    'atelier-02',
    N'Atelier 02 — Noir Suspendu',
    N'Edition of 180',
    1640.00,
    N'Patent Obsidian',
    N'/assets/collection-2.jpg',
    N'Hand-lasted in Florence over thirty-two hours. Lined in nude nappa, finished with a 24-carat gold-plated heel signature. Numbered. Never reissued.'
),
(
    'atelier-03',
    N'Atelier 03 — Or Liquide',
    N'Edition of 140',
    1820.00,
    N'Brushed Champagne',
    N'/assets/collection-3.jpg',
    N'Hand-lasted in Florence over thirty-two hours. Lined in nude nappa, finished with a 24-carat gold-plated heel signature. Numbered. Never reissued.'
);
GO

INSERT INTO dbo.ProductSizes (ProductId, SizeLabel, StockQuantity)
SELECT p.Id, s.SizeLabel, 10
FROM dbo.Products p
CROSS JOIN (VALUES (N'35'), (N'36'), (N'37'), (N'38'), (N'39'), (N'40'), (N'41')) s(SizeLabel);
GO

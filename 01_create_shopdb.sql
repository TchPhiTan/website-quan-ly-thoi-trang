-- ShopDB skeleton for SQL Server 2016+ / SSMS.
-- Creates missing tables only. Does not migrate existing table definitions.
-- Run the whole file in SSMS. GO is an SSMS/sqlcmd batch separator.
USE master;
GO
IF DB_ID(N'ShopDB') IS NULL
    EXEC(N'CREATE DATABASE ShopDB');
GO
USE ShopDB;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.roles
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            name VARCHAR(50) NOT NULL UNIQUE,
            description NVARCHAR(MAX) NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.users', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.users
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            full_name NVARCHAR(200) NOT NULL,
            email NVARCHAR(254) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            token_user UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
            phone VARCHAR(20) NULL,
            avatar NVARCHAR(2048) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','banned')),
            deleted BIT NOT NULL DEFAULT 0,
            deleted_at DATETIME2(0) NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            gender NVARCHAR(20) NULL,
            dob DATE NULL,
            address NVARCHAR(500) NULL,
            height_cm INT NULL CHECK (height_cm BETWEEN 50 AND 200),
            weight_kg DECIMAL(5,1) NULL CHECK (weight_kg BETWEEN 40 AND 200),
            role UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.roles(id)
        );
    END;

    IF OBJECT_ID(N'dbo.addresses', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.addresses
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            token_user UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(token_user),
            full_name NVARCHAR(200) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            city NVARCHAR(100) NOT NULL,
            district NVARCHAR(100) NULL,
            ward NVARCHAR(100) NULL,
            line1 NVARCHAR(500) NOT NULL,
            is_default BIT NOT NULL DEFAULT 0,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.categories', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.categories
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            title NVARCHAR(200) NOT NULL,
            parent_id UNIQUEIDENTIFIER NULL REFERENCES dbo.categories(id),
            description NVARCHAR(MAX) NULL,
            thumbnail NVARCHAR(2048) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
            is_featured BIT NOT NULL DEFAULT 0,
            slug NVARCHAR(200) NOT NULL UNIQUE,
            position INT NOT NULL DEFAULT 0,
            deleted BIT NOT NULL DEFAULT 0,
            deleted_at DATETIME2(0) NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            CHECK (parent_id IS NULL OR parent_id <> id)
        );
    END;

    IF OBJECT_ID(N'dbo.colors', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.colors
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            name NVARCHAR(100) NOT NULL,
            slug NVARCHAR(100) NOT NULL UNIQUE,
            hex VARCHAR(7) NULL,
            swatch_url NVARCHAR(2048) NULL,
            is_active BIT NOT NULL DEFAULT 1,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.products', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.products
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            title NVARCHAR(200) NOT NULL,
            description NVARCHAR(MAX) NULL,
            price DECIMAL(12,0) NOT NULL CHECK (price >= 0),
            discount INT NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 100),
            category_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.categories(id),
            size NVARCHAR(MAX) NOT NULL DEFAULT N'[]' CHECK (ISJSON(size) = 1),
            thumbnail NVARCHAR(2048) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
            deleted BIT NOT NULL DEFAULT 0,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            slug NVARCHAR(200) NOT NULL UNIQUE,
            sold_count INT NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
            rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
            rating_count INT NOT NULL DEFAULT 0 CHECK (rating_count >= 0)
        );
    END;

    IF OBJECT_ID(N'dbo.product_variants', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.product_variants
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            product_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.products(id),
            color NVARCHAR(100) NULL,
            size NVARCHAR(50) NOT NULL,
            images NVARCHAR(MAX) NOT NULL DEFAULT N'[]' CHECK (ISJSON(images) = 1),
            stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
            color_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.colors(id),
            color_hex_legacy VARCHAR(7) NULL,
            swatch_url_legacy NVARCHAR(2048) NULL,
            CONSTRAINT UQ_variants_product_color_size UNIQUE (product_id, color_id, size),
            CONSTRAINT UQ_variants_id_product UNIQUE (id, product_id)
        );
    END;

    IF OBJECT_ID(N'dbo.coupons', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.coupons
        (
            coupon_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            code VARCHAR(50) NOT NULL UNIQUE,
            title NVARCHAR(200) NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENT','AMOUNT','FREESHIP')),
            discount_value DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
            start_date DATETIME2(0) NOT NULL,
            end_date DATETIME2(0) NOT NULL,
            usage_limit INT NULL CHECK (usage_limit >= 0),
            used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
            min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
            max_discount DECIMAL(12,2) NULL CHECK (max_discount >= 0),
            status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            CHECK (end_date > start_date),
            CHECK (type <> 'PERCENT' OR discount_value <= 100),
            CHECK (usage_limit IS NULL OR used_count <= usage_limit)
        );
    END;

    IF OBJECT_ID(N'dbo.coupon_products', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.coupon_products
        (
            coupon_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.coupons(coupon_id),
            product_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.products(id),
            PRIMARY KEY (coupon_id, product_id)
        );
    END;

    IF OBJECT_ID(N'dbo.cart', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.cart
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            token_user UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(token_user) UNIQUE,
            grand_total DECIMAL(12,0) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            shipping_fee DECIMAL(12,0) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
            coupon_id UNIQUEIDENTIFIER NULL REFERENCES dbo.coupons(coupon_id)
        );
    END;

    IF OBJECT_ID(N'dbo.cart_items', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.cart_items
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            cart_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.cart(id),
            product_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.products(id),
            variant_id UNIQUEIDENTIFIER NOT NULL,
            image_url NVARCHAR(2048) NULL,
            size NVARCHAR(50) NULL,
            color NVARCHAR(100) NULL,
            price_unit DECIMAL(12,0) NOT NULL CHECK (price_unit >= 0),
            quantity INT NOT NULL CHECK (quantity > 0),
            line_subtotal AS CONVERT(DECIMAL(18,0), price_unit * quantity) PERSISTED,
            line_discount DECIMAL(18,0) NOT NULL DEFAULT 0,
            line_total AS CONVERT(DECIMAL(18,0), price_unit * quantity - line_discount) PERSISTED,
            CHECK (line_discount BETWEEN 0 AND price_unit * quantity),
            UNIQUE (cart_id, variant_id),
            FOREIGN KEY (variant_id, product_id) REFERENCES dbo.product_variants(id, product_id)
        );
    END;

    IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.orders
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            token_user UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(token_user),
            status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipping','completed','cancelled','returned')),
            payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('COD','BANK_TRANSFER','CARD','EWALLET')),
            coupon_id UNIQUEIDENTIFIER NULL REFERENCES dbo.coupons(coupon_id),
            subtotal DECIMAL(18,0) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
            discount_total DECIMAL(18,0) NOT NULL DEFAULT 0,
            shipping_fee DECIMAL(18,0) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
            grand_total AS CONVERT(DECIMAL(18,0), subtotal - discount_total + shipping_fee) PERSISTED,
            shipping_full_name NVARCHAR(200) NOT NULL,
            shipping_phone VARCHAR(20) NOT NULL,
            shipping_line1 NVARCHAR(500) NOT NULL,
            shipping_city NVARCHAR(100) NOT NULL,
            shipping_district NVARCHAR(100) NULL,
            shipping_ward NVARCHAR(100) NULL,
            note NVARCHAR(MAX) NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            CHECK (discount_total BETWEEN 0 AND subtotal)
        );
    END;

    IF OBJECT_ID(N'dbo.order_items', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.order_items
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            order_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.orders(id),
            product_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.products(id),
            variant_id UNIQUEIDENTIFIER NOT NULL,
            product_slug NVARCHAR(200) NULL,
            thumbnail_snapshot NVARCHAR(2048) NULL,
            price DECIMAL(12,0) NOT NULL CHECK (price >= 0),
            quantity INT NOT NULL CHECK (quantity > 0),
            size NVARCHAR(50) NOT NULL,
            color NVARCHAR(100) NOT NULL,
            line_total AS CONVERT(DECIMAL(18,0), price * quantity) PERSISTED,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            FOREIGN KEY (variant_id, product_id) REFERENCES dbo.product_variants(id, product_id),
            CONSTRAINT UQ_order_items_refs UNIQUE (id, order_id, product_id, variant_id)
        );
    END;

    IF OBJECT_ID(N'dbo.coupon_usages', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.coupon_usages
        (
            usage_id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            coupon_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.coupons(coupon_id),
            order_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.orders(id) UNIQUE,
            user_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(id),
            used_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.inventory_movements', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.inventory_movements
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            product_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.products(id),
            variant_id UNIQUEIDENTIFIER NOT NULL,
            order_item_id UNIQUEIDENTIFIER NULL,
            delta INT NOT NULL CHECK (delta <> 0),
            reason VARCHAR(30) NOT NULL CHECK (reason IN ('sales','returns','restock','adjustment')),
            ref_order_id UNIQUEIDENTIFIER NULL REFERENCES dbo.orders(id),
            note NVARCHAR(MAX) NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            FOREIGN KEY (variant_id, product_id) REFERENCES dbo.product_variants(id, product_id),
            FOREIGN KEY (order_item_id, ref_order_id, product_id, variant_id) REFERENCES dbo.order_items(id, order_id, product_id, variant_id),
            CHECK (order_item_id IS NULL OR ref_order_id IS NOT NULL)
        );
    END;

    IF OBJECT_ID(N'dbo.product_reviews', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.product_reviews
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            order_item_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.order_items(id) UNIQUE,
            token_user UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.users(token_user),
            rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            content NVARCHAR(MAX) NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
            updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.review_replies', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.review_replies
        (
            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
            review_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.product_reviews(id),
            author NVARCHAR(100) NOT NULL DEFAULT N'admin',
            content NVARCHAR(MAX) NOT NULL,
            created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
        );
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'admin')
        INSERT INTO dbo.roles(name, description) VALUES ('admin', N'Quản trị viên hệ thống');

    IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'user')
        INSERT INTO dbo.roles(name, description) VALUES ('user', N'Khách hàng');

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.addresses') AND name = N'UX_addresses_default')
        CREATE UNIQUE INDEX UX_addresses_default ON dbo.addresses (token_user) WHERE is_default = 1;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'IX_products_category')
        CREATE INDEX IX_products_category ON dbo.products (category_id);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.order_items') AND name = N'IX_order_items_order')
        CREATE INDEX IX_order_items_order ON dbo.order_items (order_id);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'IX_orders_user_created')
        CREATE INDEX IX_orders_user_created ON dbo.orders (token_user, created_at);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.inventory_movements') AND name = N'IX_inventory_variant_created')
        CREATE INDEX IX_inventory_variant_created ON dbo.inventory_movements (variant_id, created_at);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
SELECT name AS table_name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name;
SELECT id, name, description FROM dbo.roles;
GO

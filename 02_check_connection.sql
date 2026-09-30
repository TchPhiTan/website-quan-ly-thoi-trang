USE ShopDB;
GO
SELECT DB_NAME() AS database_name, @@SERVERNAME AS server_name, @@VERSION AS version;
SELECT COUNT(*) AS table_count FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo');
SELECT name FROM dbo.roles;
GO
-- Optional integration smoke check. ALL inserted test data is rolled back.
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
DECLARE @user UNIQUEIDENTIFIER = NEWID(), @token UNIQUEIDENTIFIER = NEWID();
DECLARE @cat UNIQUEIDENTIFIER = NEWID(), @color UNIQUEIDENTIFIER = NEWID();
DECLARE @product UNIQUEIDENTIFIER = NEWID(), @variant UNIQUEIDENTIFIER = NEWID();
DECLARE @coupon UNIQUEIDENTIFIER = NEWID(), @cart UNIQUEIDENTIFIER = NEWID();
DECLARE @order UNIQUEIDENTIFIER = NEWID(), @item UNIQUEIDENTIFIER = NEWID();
DECLARE @review UNIQUEIDENTIFIER = NEWID();
DECLARE @suffix VARCHAR(36) = CONVERT(VARCHAR(36), NEWID());
DECLARE @role UNIQUEIDENTIFIER = (SELECT id FROM dbo.roles WHERE name = 'user');
INSERT dbo.users(id,full_name,email,password,token_user,role)
VALUES (@user,N'Kiểm tra kết nối',@suffix+'@example.invalid','TEST_ONLY_NOT_A_PASSWORD_HASH',@token,@role);
INSERT dbo.addresses(token_user,full_name,phone,city,line1,is_default)
VALUES (@token,N'Người nhận thử','0900000000',N'TP.HCM',N'Địa chỉ thử',1);
INSERT dbo.categories(id,title,slug) VALUES (@cat,N'Áo thử',@suffix);
INSERT dbo.colors(id,name,slug,hex) VALUES (@color,N'Đỏ',@suffix,'#FF0000');
INSERT dbo.products(id,title,price,category_id,size,slug)
VALUES (@product,N'Áo thử',100000,@cat,N'["M","L"]',@suffix);
INSERT dbo.product_variants(id,product_id,color,size,color_id,stock)
VALUES (@variant,@product,N'Đỏ',N'M',@color,10);
INSERT dbo.coupons(coupon_id,code,title,type,discount_value,start_date,end_date,status)
VALUES (@coupon,@suffix,N'Giảm thử','AMOUNT',10000,SYSDATETIME(),DATEADD(DAY,1,SYSDATETIME()),'ACTIVE');
INSERT dbo.coupon_products(coupon_id,product_id) VALUES (@coupon,@product);
INSERT dbo.cart(id,token_user,grand_total,coupon_id) VALUES (@cart,@token,190000,@coupon);
INSERT dbo.cart_items(cart_id,product_id,variant_id,price_unit,quantity,line_discount,size,color)
VALUES (@cart,@product,@variant,100000,2,10000,N'M',N'Đỏ');
INSERT dbo.orders(id,token_user,payment_method,coupon_id,subtotal,discount_total,shipping_full_name,shipping_phone,shipping_line1,shipping_city)
VALUES (@order,@token,'COD',@coupon,200000,10000,N'Người nhận thử','0900000000',N'Địa chỉ thử',N'TP.HCM');
INSERT dbo.order_items(id,order_id,product_id,variant_id,price,quantity,size,color)
VALUES (@item,@order,@product,@variant,100000,2,N'M',N'Đỏ');
INSERT dbo.coupon_usages(coupon_id,order_id,user_id) VALUES (@coupon,@order,@user);
UPDATE dbo.coupons SET used_count = used_count + 1 WHERE coupon_id = @coupon;
UPDATE dbo.product_variants SET stock = stock - 2 WHERE id = @variant AND stock >= 2;
IF @@ROWCOUNT <> 1 THROW 50001, 'Insufficient stock.', 1;
INSERT dbo.inventory_movements(product_id,variant_id,order_item_id,delta,reason,ref_order_id)
VALUES (@product,@variant,@item,-2,'sales',@order);
UPDATE dbo.orders SET status = 'completed', updated_at = SYSDATETIME() WHERE id = @order;
INSERT dbo.product_reviews(id,order_item_id,token_user,rating,content)
VALUES (@review,@item,@token,5,N'Đánh giá thử');
INSERT dbo.review_replies(review_id,content) VALUES (@review,N'Phản hồi thử');
IF NOT EXISTS (SELECT 1 FROM dbo.orders WHERE id = @order AND grand_total = 190000)
    THROW 50002, 'Order total mismatch.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.cart_items WHERE cart_id = @cart AND line_subtotal = 200000 AND line_total = 190000)
    THROW 50003, 'Cart line total mismatch.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.product_variants WHERE id = @variant AND stock = 8)
    THROW 50004, 'Stock mismatch.', 1;
SELECT N'PASS: liên kết bảng, tổng tiền và tồn kho. Dữ liệu thử sẽ được hoàn tác.' AS result;
ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
THROW;
END CATCH;
GO

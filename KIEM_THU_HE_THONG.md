# BÁO CÁO KẾ HOẠCH & KỊCH BẢN KIỂM THỬ HỆ THỐNG
## Website Quản Lý Cửa Hàng Thời Trang MỘC (ShopDB)

---

## 1. TỔNG QUAN HỆ THỐNG & MÔI TRƯỜNG KIỂM THỬ

- **Hệ thống**: Website Quản lý & Bán hàng Thời trang MỘC.
- **Kiến trúc**: Client - Server tách rời (Decoupled Frontend & Backend API).
- **Công nghệ Frontend**: React 19, TanStack Router, TanStack Query, Tailwind CSS (Triển khai trên **Vercel**).
- **Công nghệ Backend**: Node.js, Express.js, Prisma ORM 5.22, Session Auth, Winston Logger (Triển khai trên **Railway** & Local).
- **Cơ sở dữ liệu**: Neon Serverless PostgreSQL (AWS Singapore region).
- **Phạm vi kiểm thử**:
  - Xác thực người dùng & Phân quyền đa vai trò (Khách hàng, Nhân viên, Quản trị viên).
  - Quản lý danh mục, sản phẩm, biến thể màu sắc/kích cỡ, hình ảnh.
  - Vòng đời sản phẩm: Tạo, cập nhật, xóa mềm (Soft Delete), tính an toàn lặp lại (Idempotency).
  - Quy trình mua sắm: Giỏ hàng, Áp dụng Voucher, Đặt hàng Checkout (COD & Chuyển khoản VietQR Sandbox).
  - Quản lý đơn hàng, Giao dịch nguyên tử (ACID Transaction) khi hủy đơn: hoàn kho và hoàn voucher.
  - Kiểm toán kho hàng (`inventory_movements`) và Báo cáo doanh thu Admin.

---

## 2. KẾT QUẢ TỔNG HỢP KIỂM THỬ TỰ ĐỘNG (AUTOMATION TEST SUITE)

| Bộ Test Script | Chức năng kiểm thử chính | Số lượng TC | Kết quả thực tế | Trạng thái |
| :--- | :--- | :---: | :---: | :---: |
| `tests/test-flow.js` | Luồng nghiệp vụ toàn diện từ Auth, Mua hàng, Duyệt đơn đến Báo cáo | 21 TCs | **21 PASS / 0 FAIL** | ✅ **ĐẠT 100%** |
| `tests/test-admin-product.js` | Xác thực dữ liệu, trùng slug, tạo sản phẩm, biến thể, kiểm tra DB Neon | 5 TCs | **5 PASS / 0 FAIL** | ✅ **ĐẠT 100%** |
| `tests/test-cancel-rollback.js` | Transaction trừ kho khi đặt, rollback tồn kho và voucher khi hủy đơn | 4 TCs | **4 PASS / 0 FAIL** | ✅ **ĐẠT 100%** |
| `scratch/e2e_http_test_product.js` | Quy trình Tạo -> Xóa mềm -> Idempotent check -> Dọn dẹp cascade | 5 TCs | **5 PASS / 0 FAIL** | ✅ **ĐẠT 100%** |

---

## 3. CHI TIẾT DANH MỤC CÁC KỊCH BẢN & CA KIỂM THỬ (TEST CASES)

### Phân hệ 1: Quản trị viên — Quản lý Sản phẩm & Vòng đời Xóa

#### TC-PRD-01: Tạo sản phẩm mới đầy đủ thông tin
- **Mục tiêu**: Kiểm tra tính năng tạo sản phẩm mới của Admin.
- **Tiền điều kiện**: Đã đăng nhập bằng tài khoản có vai trò `admin`.
- **Dữ liệu đầu vào**:
  - `title`: "Áo Blazer Dạ Nữ Mộc Cao Cấp"
  - `price`: 850,000₫, `discount`: 10%
  - `category_id`: UUID danh mục "Đầm nữ" hợp lệ
  - `size`: `["S", "M", "L"]`, `stock`: 20
  - `thumbnail`: Ảnh đại diện sản phẩm hợp lệ
  - `slug`: "ao-blazer-da-nu-moc-cao-cap"
- **Các bước thực hiện**:
  1. Gửi request `POST /api/admin/products` kèm cookie phiên Admin.
  2. Kiểm tra phản hồi HTTP và dữ liệu trong cơ sở dữ liệu PostgreSQL.
- **Kết quả mong đợi**: Trả về HTTP 201 Created, bản ghi được lưu vào PostgreSQL với `status: 'active'`, `deleted: false`.
- **Kết quả thực tế**: **PASS** (HTTP 201, Record ID sinh đúng dạng UUID).

#### TC-PRD-02: Xác thực dữ liệu đầu vào bắt buộc
- **Mục tiêu**: Ngăn chặn tạo sản phẩm khi thiếu các thông tin cốt lõi.
- **Dữ liệu đầu vào**: Bỏ trống trường `title`.
- **Các bước thực hiện**: Gửi request `POST /api/admin/products` với `{ price: 500000, category_id: ... }`.
- **Kết quả mong đợi**: Trả về HTTP 400 Bad Request kèm thông báo: *"Thiếu thông tin bắt buộc: title, price, category_id, slug"*.
- **Kết quả thực tế**: **PASS** (HTTP 400).

#### TC-PRD-03: Kiểm tra chống trùng lặp Slug (URL thân thiện)
- **Mục tiêu**: Đảm bảo mỗi sản phẩm có một đường dẫn SEO duy nhất.
- **Dữ liệu đầu vào**: Tạo 2 sản phẩm liên tiếp có cùng giá trị `slug`.
- **Kết quả mong đợi**: Lần tạo thứ nhất thành công (HTTP 201), lần tạo thứ hai bị chặn với HTTP 409 Conflict: *"Slug đã được sử dụng"*.
- **Kết quả thực tế**: **PASS** (HTTP 409).

#### TC-PRD-04: Thêm biến thể kích thước & màu sắc
- **Mục tiêu**: Bổ sung phân loại sản phẩm vào bảng `product_variants`.
- **Dữ liệu đầu vào**: `product_id`, `color_id`, `size: "XL"`, `stock: 50`.
- **Các bước thực hiện**: Gửi request `POST /api/admin/products/:id/variants`.
- **Kết quả mong đợi**: Trả về HTTP 201 Created, biến thể gắn khóa ngoại `product_id` chính xác.
- **Kết quả thực tế**: **PASS**.

#### TC-PRD-05: Xóa mềm sản phẩm (Soft Delete) & Bảo toàn toàn vẹn dữ liệu
- **Mục tiêu**: Ẩn sản phẩm khỏi cửa hàng mà không làm đứt gãy lịch sử các đơn hàng cũ đã mua sản phẩm này.
- **Tiền điều kiện**: Sản phẩm đang ở trạng thái bán (`deleted: false`, `status: 'active'`).
- **Các bước thực hiện**: Gửi `DELETE /api/admin/products/:id`.
- **Kết quả mong đợi**:
  1. Trả về HTTP 200 OK `{ message: 'Đã xóa sản phẩm' }`.
  2. Cập nhật `deleted: true`, `status: 'inactive'`, `deleted_at: DateTime`.
  3. Đổi slug thành `[slug-goc]-deleted-[timestamp]` để giải phóng slug gốc cho việc đặt lại tên sau này.
  4. Cập nhật tồn kho tất cả biến thể liên quan về `0`.
  5. Xóa sản phẩm khỏi giỏ hàng của tất cả người dùng (`cart_items`) để tránh việc khách bấm thanh toán hàng đã xóa.
- **Kết quả thực tế**: **PASS** (HTTP 200, tất cả 5 điều kiện toàn vẹn đều thỏa mãn).

#### TC-PRD-06: Kiểm thử tính an toàn lặp lại (Idempotency) khi Xóa sản phẩm
- **Mục tiêu**: Đảm bảo nếu Admin hoặc mạng bấm xóa 2 lần liên tiếp, hệ thống vẫn xử lý an toàn, không báo lỗi 500 hoặc crash máy chủ.
- **Các bước thực hiện**: Gửi tiếp request `DELETE /api/admin/products/:id` lần 2 ngay sau khi đã xóa.
- **Kết quả mong đợi**: Trả về HTTP 200 OK `{ message: 'Sản phẩm đã được xóa trước đó' }`.
- **Kết quả thực tế**: **PASS** (HTTP 200).

---

### Phân hệ 2: Xác thực & Phân quyền Người dùng (Authentication & RBAC)

#### TC-AUTH-01: Đăng ký tài khoản Khách hàng
- **Dữ liệu đầu vào**: Email, mật khẩu, họ tên, số điện thoại.
- **Kết quả mong đợi**: Mật khẩu được mã hóa an toàn bằng thuật toán `bcrypt` (salt rounds = 10), gán vai trò `user`, tự động khởi tạo 1 giỏ hàng rỗng (`cart`). Trả về HTTP 201 Created.
- **Kết quả thực tế**: **PASS**.

#### TC-AUTH-02: Đăng nhập Khách hàng & Cấp phát Session Cookie
- **Dữ liệu đầu vào**: Email và mật khẩu chính xác.
- **Kết quả mong đợi**: Trả về HTTP 200 OK, thiết lập cookie phiên `connect.sid` bảo mật (`httpOnly: true`).
- **Kết quả thực tế**: **PASS**.

#### TC-AUTH-03: Kiểm tra phiên đăng nhập (`GET /auth/me`)
- **Dữ liệu đầu vào**: Gửi cookie phiên vừa nhận.
- **Kết quả mong đợi**: Trả về đúng thông tin định danh người dùng và vai trò tương ứng.
- **Kết quả thực tế**: **PASS**.

#### TC-AUTH-04: Phân quyền vai trò (Role-Based Access Control)
- **Mục tiêu**: Người dùng thông thường không được phép truy cập tài nguyên quản trị.
- **Các bước thực hiện**: Dùng tài khoản role `user` gọi `GET /api/admin/products`.
- **Kết quả mong đợi**: Hệ thống từ chối truy cập với HTTP 403 Forbidden.
- **Kết quả thực tế**: **PASS**.

---

### Phân hệ 3: Quy trình Mua sắm, Giỏ hàng & Thanh toán (Shopping & Checkout)

#### TC-ORD-01: Thao tác Giỏ hàng
- **Mục tiêu**: Thêm, cập nhật số lượng, xóa mục trong giỏ hàng.
- **Kết quả mong đợi**: Số lượng cập nhật chính xác, không cho phép số lượng âm.
- **Kết quả thực tế**: **PASS**.

#### TC-ORD-02: Áp dụng Mã giảm giá (Coupon Code)
- **Dữ liệu đầu vào**: Mã giảm giá hợp lệ đang trong thời hạn sử dụng.
- **Kết quả mong đợi**: Tính toán giảm trừ % hoặc số tiền cố định chính xác vào tổng hóa đơn (`grand_total`).
- **Kết quả thực tế**: **PASS**.

#### TC-ORD-03: Đặt hàng phương thức Thanh toán khi nhận hàng (COD)
- **Mục tiêu**: Đặt hàng thành công với phương thức thanh toán tiền mặt.
- **Kết quả mong đợi**:
  1. Tạo bản ghi đơn hàng với trạng thái `status: 'pending'`, `payment_method: 'COD'`.
  2. Trừ tồn kho tương ứng của sản phẩm ngay khi đặt đơn.
  3. Xóa các mục đã đặt khỏi giỏ hàng.
  4. Hiển thị thông báo hướng dẫn nhận hàng và thanh toán tiền mặt.
- **Kết quả thực tế**: **PASS**.

#### TC-ORD-04: Đặt hàng phương thức Quét mã VietQR Sandbox
- **Mục tiêu**: Thanh toán tự động/mô phỏng qua chuyển khoản ngân hàng.
- **Kết quả mong đợi**:
  1. Hiển thị mã QR ngân hàng chuẩn VietQR kèm số tài khoản, số tiền và nội dung chuyển khoản định danh (`MOC [Mã đơn]`).
  2. Bấm xác nhận chuyển khoản: Đơn hàng cập nhật trạng thái thanh toán `payment_status: 'paid'`.
- **Kết quả thực tế**: **PASS**.

---

### Phân hệ 4: Transaction ACID Hủy đơn & Hoàn trả Kho/Voucher

#### TC-ROLLBACK-01: Đảm bảo tính nguyên tử khi Hủy đơn (Atomic Transaction)
- **Kịch bản**: Khách hàng hủy đơn hàng đang ở trạng thái `pending`.
- **Kết quả mong đợi thực thi trong `db.$transaction`**:
  1. Trạng thái đơn hàng chuyển thành `cancelled`.
  2. Toàn bộ số lượng sản phẩm trong đơn được **hoàn trả 100% vào tồn kho** của từng biến thể tương ứng.
  3. Nếu đơn có sử dụng mã giảm giá, voucher được hoàn trả lượt sử dụng cho khách hàng.
  4. Hệ thống ghi 1 bản ghi vào bảng nhật ký `inventory_movements`:
     - `movement_type`: `"cancelled"`
     - `delta`: Số lượng dương tương ứng với số hàng được hoàn kho
- **Kết quả thực tế**: **PASS** (Tồn kho hoàn lại từ 36 lên 38, audit log ghi nhận đầy đủ).

#### TC-ROLLBACK-02: Xử lý Hủy đơn đã Thanh toán VietQR (Yêu cầu Hoàn tiền)
- **Kịch bản**: Đơn hàng đã chuyển khoản thành công nhưng khách muốn hủy đơn.
- **Kết quả mong đợi**:
  1. Đơn hàng chuyển sang trạng thái: **Đã hủy (Chờ hoàn tiền)**.
  2. Bật thông báo rõ ràng cho khách hàng: *"Cửa hàng sẽ liên hệ hoàn tiền về tài khoản ngân hàng của bạn trong 24h - 48h làm việc"*.
  3. Trên giao diện Admin, đơn hàng hiển thị cảnh báo viền vàng yêu cầu hoàn tiền để nhân viên xử lý chuyển khoản lại cho khách.
- **Kết quả thực tế**: **PASS**.

---

### Phân hệ 5: Nghiệp vụ Nhân viên (Staff) & Báo cáo Quản trị

#### TC-STAFF-01: Nhân viên xử lý & cập nhật trạng thái đơn hàng
- **Kịch bản**: Nhân viên duyệt đơn theo quy trình chuẩn:
  `pending` (Chờ duyệt) $\rightarrow$ `processing` (Đang đóng gói) $\rightarrow$ `shipping` (Đang giao hàng) $\rightarrow$ `completed` (Hoàn thành).
- **Kết quả thực tế**: **PASS** (Cập nhật mượt mà, phân quyền Staff chỉ thao tác được đơn hàng và kho).

#### TC-STAFF-02: Báo cáo Thống kê Tồn kho & Cảnh báo Sắp hết hàng
- **Kết quả mong đợi**: Liệt kê số lượng tồn kho từng mặt hàng, cảnh báo màu đỏ/vàng cho các mặt hàng có tồn kho dưới 5 sản phẩm.
- **Kết quả thực tế**: **PASS**.

#### TC-ADM-01: Báo cáo Doanh thu & Đơn hàng Quản trị viên
- **Kết quả mong đợi**: Tổng hợp doanh thu theo mốc thời gian, tính toán số đơn thành công, đơn đã hủy và danh sách sản phẩm bán chạy nhất.
- **Kết quả thực tế**: **PASS**.

---

## 4. HƯỚNG DẪN KỊCH BẢN THỰC THI DEMO TRỰC TIẾP TRÊN GIAO DIỆN (DEMO CHECKLIST)

Dành cho phần trình bày trực quan trước hội đồng đánh giá:

```
[BƯỚC 1: TRẢI NGHIỆM KHÁCH HÀNG]
1. Truy cập https://website-quan-ly-thoi-trang.vercel.app/
2. Chọn sản phẩm -> Chọn Size, Màu -> Thêm vào giỏ hàng.
3. Vào Giỏ hàng -> Chọn thanh toán:
   - Thử nghiệm COD: Xem trạng thái "Chưa thanh toán (Thanh toán khi nhận hàng)".
   - Thử nghiệm VietQR: Mở modal quét mã QR -> Bấm "Xác nhận đã chuyển khoản" -> Đơn nhận diện "Đã thanh toán".

[BƯỚC 2: KIỂM THỬ TÍNH NĂNG HỦY ĐƠN & HOÀN TIỀN]
4. Vào trang "Đơn hàng của tôi".
5. Bấm "Hủy đơn" trên đơn vừa thanh toán VietQR:
   - Quan sát thông báo cam kết hoàn tiền trong 24h-48h.
   - Trạng thái chuyển thành "Đã hủy (Chờ hoàn tiền)".

[BƯỚC 3: QUẢN TRỊ VIÊN TẠO & UPLOAD ẢNH SẢN PHẨM]
6. Vào /admin/login -> Đăng nhập admin@shop.com / admin123.
7. Vào "Quản lý sản phẩm" -> Bấm "+ Thêm sản phẩm".
8. Nhập tên, danh mục, giá -> Tải ảnh bất kỳ từ máy (Test tính năng tự động nén Canvas).
9. Bấm "Lưu sản phẩm" -> Sản phẩm hiển thị ngay lập tức trên đầu danh sách.

[BƯỚC 4: QUẢN TRỊ VIÊN XÓA SẢN PHẨM]
10. Tại dòng sản phẩm vừa tạo, bấm biểu tượng "Thùng rác".
11. Xác nhận xóa -> Sản phẩm biến mất khỏi trang Admin.
12. Mở tab người mua tìm kiếm: sản phẩm đã ẩn hoàn toàn, không thể mua được nữa.
13. Thao tác xóa lại lần 2 (nếu có): hệ thống phản hồi êm ái, bảo toàn dữ liệu.

[BƯỚC 5: NHÂN VIÊN DUYỆT ĐƠN & THEO DÕI BIẾN ĐỘNG KHO]
14. Vào "Quản lý đơn hàng" -> Xem đơn hàng cần hoàn tiền có gắn cờ cảnh báo.
15. Vào "Hỗ trợ tồn kho" -> Xem nhật ký biến động kho đã tự động ghi lại lịch sử hoàn kho của đơn vừa hủy.
```

---
*Tài liệu kiểm thử được tổng hợp và xuất bản tự động từ Test Runner của dự án.*

# Website Quản Lý Thời Trang - ShopDB Backend (Node.js + Prisma ORM)

Hệ thống Backend API RESTful hoàn chỉnh cho dự án Website Quản Lý Thời Trang (ShopDB), được xây dựng theo kiến trúc MVC chuẩn, hỗ trợ đầy đủ xác thực phân quyền, giỏ hàng, đặt hàng, quản lý kho, quản trị viên và báo cáo doanh thu.

---

## 📌 Các Cập Nhật Lớn Vừa Hoàn Thành (Release Notes)

1. **Tổ chức lại toàn bộ cấu trúc mã nguồn theo mô hình MVC**:
   - Tách file monolithic `api.js` cũ thành các module độc lập trong thư mục `src/`:
     - `src/controllers/`: Xử lý toàn bộ logic nghiệp vụ (Auth, Public, User, Staff, Admin).
     - `src/routes/`: Định tuyến rõ ràng cho từng nhóm đối tượng sử dụng.
     - `src/middleware/`: Middleware xác thực đăng nhập (`requireAuth`) và kiểm tra phân quyền (`requireRole`).
     - `src/lib/`: Khởi tạo Prisma Client dùng chung.
     - `src/config/`: Cấu hình Winston Logger và Mailjet email.
2. **Hoàn thiện 100% các API còn thiếu trong TODO**:
   - **Public**: Lọc sản phẩm theo danh mục/giá/thứ tự, tìm kiếm từ khóa, chi tiết sản phẩm kèm biến thể & reviews, danh sách danh mục phân cấp.
   - **Khách hàng (User)**: Quản lý giỏ hàng CRUD, áp dụng voucher mã giảm giá, checkout thanh toán (trừ kho và tạo lịch sử tồn kho `inventory_movements`), lịch sử đơn hàng, xem chi tiết, sổ địa chỉ, gửi đánh giá.
   - **Nhân viên (Staff)**: Xem danh sách đơn hàng, cập nhật trạng thái đơn (hỗ trợ cả `PUT` & `PATCH`), gửi email thông báo qua Mailjet, xử lý đổi trả hàng (RMA), nhập kho và theo dõi lịch sử biến động tồn kho.
   - **Quản trị viên (Admin)**: Quản lý CRUD sản phẩm + biến thể + màu sắc, quản lý danh mục, quản lý người dùng (khóa/mở khóa/phân quyền), quản lý mã giảm giá, báo cáo tổng quan & doanh thu theo ngày/tháng.
3. **Hỗ trợ linh hoạt cả SQL Server và Cloud PostgreSQL (Neon)**:
   - File schema mặc định trong git được cấu hình chuẩn cho **SQL Server 2016+ / SSMS**.
   - Hỗ trợ chuyển đổi nhanh bằng 1 lệnh giữa SQL Server và PostgreSQL (Neon) mà không phải sửa code.
4. **Bộ Seed Data & Test E2E tự động**:
   - Script khởi tạo sẵn các quyền (`admin`, `staff`, `user`), màu sắc và tài khoản quản trị mẫu (`admin@shop.com` / `admin123`).
   - Bộ kịch bản kiểm thử tự động `tests/test-flow.js` kiểm tra 21/21 luồng nghiệp vụ thực tế.

---

## ⚙️ Yêu cầu hệ thống

- **Node.js** >= 18.0.0
- **Cơ sở dữ liệu**:
  - **SQL Server 2016+** (hoặc SQL Server Express / Azure SQL) kèm **SSMS** (Khuyên dùng cho Windows)
  - *Hoặc* **PostgreSQL / Neon Cloud** (Khuyên dùng cho macOS nếu không muốn cài SQL Server cục bộ)

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Động Cho Người Dùng SQL Server (Windows)

### Bước 1: Tạo Database trên SSMS
1. Mở **SQL Server Management Studio (SSMS)** và đăng nhập vào SQL Server của bạn.
2. Mở và chạy file `01_create_shopdb.sql` (bấm Execute hoặc `F5`) để tự động tạo database `ShopDB` và toàn bộ các bảng.
3. (Tùy chọn) Chạy `02_check_connection.sql` để kiểm tra các bảng đã được tạo đầy đủ.

### Bước 2: Cài đặt thư viện
Trong thư mục dự án, mở Terminal / PowerShell và chạy:
```bash
npm install
```

### Bước 3: Cấu hình file `.env`
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
Mở file `.env` và điền chuỗi kết nối SQL Server của bạn:
```env
DATABASE_URL="sqlserver://localhost:1433;database=ShopDB;user=sa;password=MatKhauCuaBan;encrypt=true;trustServerCertificate=true"
SESSION_SECRET="shopdb-super-secret-key"
PORT=8080
```

### Bước 4: Khởi tạo Prisma Client & Dữ liệu mẫu (Seed Data)
```bash
# 1. Generate Prisma Client cho SQL Server
npx prisma generate

# 2. Tạo sẵn các Roles (admin, staff, user) và tài khoản Admin mẫu
npm run db:seed
```
*Tài khoản Admin mặc định vừa tạo:*
- **Email:** `admin@shop.com`
- **Mật khẩu:** `admin123`

*Tài khoản Staff mặc định:*
- **Email:** `staff@shop.com`
- **Mật khẩu:** `staff123`

### Bước 5: Khởi động Server
```bash
# Chạy môi trường phát triển (tự reload khi sửa code)
npm run dev

# Hoặc chạy thông thường
npm start
```
Server sẽ chạy tại: **`http://localhost:8080`**

---

## 💡 Dành Cho Người Dùng macOS Hoặc Muốn Dùng Neon Cloud (PostgreSQL)

Nếu bạn dùng Mac hoặc muốn dùng Database trên Cloud Neon để nhẹ máy:
```bash
# 1. Chuyển schema sang PostgreSQL / Neon
npm run db:switch:neon

# 2. Cấu hình DATABASE_URL trong .env trỏ tới connection string của Neon
# DATABASE_URL="postgresql://neondb_owner:***@ep-***.aws.neon.tech/neondb?sslmode=require"

# 3. Đồng bộ bảng lên Neon
npm run db:push

# 4. Tạo dữ liệu mẫu
npm run db:seed
```

*(Khi muốn quay lại SQL Server: chỉ cần chạy `npm run db:switch:sqlserver`)*

---

## 🧪 Chạy Kiểm Thử Tự Động (E2E Test)

Dự án có sẵn bộ test tích hợp tự động kiểm tra toàn bộ luồng đăng ký, mua hàng, trừ kho, duyệt đơn và báo cáo doanh thu:
```bash
npm test
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
website-quan-ly-thoi-trang/
│
├── 📁 src/                           ← Mã nguồn Backend chính (MVC)
│   ├── app.js                        ← Cấu hình Express, CORS, Session, Routes
│   ├── 📁 config/
│   │   ├── logger.js                 ← Winston logger
│   │   └── mailjet.js                ← Cấu hình gửi email thông báo
│   ├── 📁 controllers/               ← Logic xử lý nghiệp vụ
│   │   ├── auth.controller.js        ← Đăng ký, đăng nhập, phiên
│   │   ├── public.controller.js      ← Xem sản phẩm, danh mục, đánh giá, mua nhanh
│   │   ├── user.controller.js        ← Giỏ hàng, voucher, checkout, lịch sử đơn
│   │   ├── staff.controller.js       ← Quản lý đơn, nhập kho, tồn kho, email
│   │   └── admin.controller.js       ← CRUD SP/DM/User/Coupon, báo cáo doanh thu
│   ├── 📁 middleware/
│   │   └── auth.js                   ← Kiểm tra session đăng nhập và phân quyền role
│   ├── 📁 routes/                    ← Định tuyến API theo nhóm đối tượng
│   │   ├── auth.routes.js
│   │   ├── public.routes.js
│   │   ├── user.routes.js
│   │   ├── staff.routes.js
│   │   └── admin.routes.js
│   └── 📁 lib/
│       └── prisma.js                 ← Singleton Prisma Client
│
├── 📁 prisma/
│   ├── schema.prisma                 ← Schema mặc định (SQL Server)
│   ├── schema.sqlserver.prisma       ← Bản lưu cho SQL Server
│   ├── schema.postgresql.prisma      ← Bản lưu cho Neon / PostgreSQL
│   └── seed.js                       ← Script tạo roles và user mặc định
│
├── 📁 tests/
│   └── test-flow.js                  ← Kịch bản kiểm thử E2E tự động
│
├── 📁 moc-store/                     ← Frontend React + Vite
├── 01_create_shopdb.sql              ← Script SQL Server tạo DB và bảng
├── 02_check_connection.sql           ← Script SQL Server kiểm tra dữ liệu
├── server.js                         ← File khởi chạy server
├── package.json
└── .env.example                      ← Mẫu biến môi trường
```

---

## 📋 Danh Sách Endpoint API Chi Tiết

Tất cả các route đều hỗ trợ cả hai tiền tố `/api/...` và `/api/v1/...`:

### 1. Xác thực (`/api/auth`)
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản khách hàng mới | Public |
| POST | `/api/auth/login` | Đăng nhập hệ thống (User/Staff/Admin) | Public |
| POST | `/api/auth/logout` | Đăng xuất, hủy phiên session | Đã đăng nhập |
| GET | `/api/auth/me` | Lấy thông tin tài khoản phiên hiện tại | Đã đăng nhập |

### 2. Khách vãng lai (`/api/public`)
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/public/products` | Danh sách sản phẩm (hỗ trợ lọc danh mục, giá, tìm kiếm, sắp xếp, phân trang) | Public |
| GET | `/api/public/products/:slug` | Chi tiết sản phẩm, danh sách biến thể, màu sắc và đánh giá | Public |
| GET | `/api/public/products/:slug/reviews` | Danh sách đánh giá của sản phẩm | Public |
| GET | `/api/public/categories` | Danh mục sản phẩm theo cây phân cấp | Public |
| POST | `/api/public/checkout` | Mua hàng nhanh không cần tài khoản | Public |

### 3. Thành viên mua sắm (`/api/user`)
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/user/cart` | Lấy giỏ hàng chi tiết kèm tổng tiền | User |
| POST | `/api/user/cart/items` | Thêm sản phẩm vào giỏ hàng | User |
| PUT/PATCH | `/api/user/cart/items/:id` | Cập nhật số lượng sản phẩm | User |
| DELETE | `/api/user/cart/items/:id` | Xóa sản phẩm khỏi giỏ | User |
| POST | `/api/user/cart/coupon` | Áp dụng mã giảm giá vào giỏ | User |
| DELETE | `/api/user/cart/coupon` | Gỡ mã giảm giá | User |
| POST | `/api/user/checkout` | Đặt hàng, tự trừ kho và xóa giỏ | User |
| GET | `/api/user/orders` | Danh sách lịch sử đơn hàng | User |
| GET | `/api/user/orders/:id` | Chi tiết đơn hàng và trạng thái | User |
| POST | `/api/user/orders/:id/cancel`| Hủy đơn hàng đang chờ | User |
| GET/PUT | `/api/user/profile` | Xem và cập nhật thông tin cá nhân | User |
| PUT | `/api/user/change-password` | Đổi mật khẩu | User |
| GET/POST/DELETE| `/api/user/addresses` | Quản lý sổ địa chỉ giao hàng | User |
| POST | `/api/user/reviews` | Gửi đánh giá cho sản phẩm đã mua | User |

### 4. Nhân viên cửa hàng (`/api/staff`)
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/api/staff/orders` | Xem danh sách đơn hàng cần xử lý | Staff/Admin |
| PUT/PATCH | `/api/staff/orders/:id/status` | Cập nhật trạng thái đơn (processing, shipped, etc.) | Staff/Admin |
| POST | `/api/staff/orders/:id/notify` | Gửi email thông báo đơn hàng cho khách | Staff/Admin |
| POST | `/api/staff/orders/:id/rma` | Xử lý yêu cầu đổi trả hàng | Staff/Admin |
| GET | `/api/staff/inventory` | Báo cáo tồn kho theo biến thể | Staff/Admin |
| POST | `/api/staff/inventory/restock`| Nhập thêm hàng vào kho | Staff/Admin |
| GET | `/api/staff/inventory/movements`| Xem lịch sử biến động kho | Staff/Admin |
| POST | `/api/staff/reviews/:id/reply` | Trả lời phản hồi của khách hàng | Staff/Admin |

### 5. Quản trị viên (`/api/admin`)
| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET/POST | `/api/admin/products` | Danh sách & tạo sản phẩm mới | Admin |
| PUT/PATCH/DELETE| `/api/admin/products/:id` | Sửa & xóa mềm sản phẩm | Admin |
| POST/PUT | `/api/admin/products/:id/variants`| Thêm & cập nhật biến thể, màu sắc, tồn kho | Admin |
| GET/POST/PUT/DELETE| `/api/admin/categories` | Quản lý cây danh mục sản phẩm | Admin |
| GET/PUT | `/api/admin/users` | Quản lý tài khoản người dùng, đổi role, khóa tài khoản | Admin |
| GET/POST/PUT | `/api/admin/coupons` | Quản lý mã giảm giá (voucher) | Admin |
| GET | `/api/admin/reports/overview`| Thống kê tổng quan đơn hàng, doanh thu, thành viên | Admin |
| GET | `/api/admin/reports/revenue` | Báo cáo doanh thu theo mốc thời gian | Admin |
| GET | `/api/admin/reports/top-products`| Báo cáo sản phẩm bán chạy nhất | Admin |

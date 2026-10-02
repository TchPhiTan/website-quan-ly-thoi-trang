# MỘC — giao diện website bán quần áo (dựng lại từ Lovable)

Stack: TanStack Start + React 19 + Tailwind v4 + shadcn/ui.

```
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

- `src/routeTree.gen.ts` tự sinh khi chạy dev/build.
- `src/assets/*.jpg` đang là ảnh giữ chỗ, thay bằng ảnh thật cùng tên.


## Trang quản trị (`/admin`)
Đăng nhập tại `/admin/login` (giao diện mẫu: nhập bất kỳ tài khoản, mật khẩu từ 6 ký tự).

Các trang: bảng điều khiển, sản phẩm (+ thêm/sửa), tồn kho, hỗ trợ tồn kho (kiểm kê, CSV, PO, chẩn đoán), đơn hàng, khuyến mại, đánh giá, báo cáo, người dùng.
Lưu ý: tải lại trang sẽ mất trạng thái đăng nhập và dữ liệu đã sửa (chỉ lưu trong bộ nhớ trình duyệt).

## Dữ liệu dùng chung & nối API (`src/services`)
- `mock-db.ts`: "CSDL giả" lưu ở localStorage. Trang khách (`/`) và trang quản trị (`/admin`) cùng origin nên **dùng chung dữ liệu, kể cả khi mở 2 tab** (tab kia tự cập nhật). Không cần đổi cổng/localhost.
- `index.ts`: các service async (`productService`, `orderService`, `promoService`, `reviewService`, `userService`, `sessionService`) là nơi duy nhất ghi dữ liệu.
- `hooks.ts`: các hook đọc (`useProducts`, `useOrders`, ...) mà giao diện dùng.
- Điều gì đang liên thông: sản phẩm/giá/trạng thái/tồn kho admin sửa -> hiện ở cửa hàng; "Thanh toán" ở giỏ hàng tạo đơn "Chờ duyệt" -> admin duyệt -> khách thấy ở Lịch sử đơn hàng; gửi đánh giá ở khách -> admin phản hồi; mã khuyến mại và Ví voucher lấy từ khuyến mại đang hoạt động; đăng ký tài khoản -> có trong Quản lý người dùng.
- Xóa dữ liệu mẫu đã lưu: mở DevTools > Application > Local Storage > xóa khóa `moc-db-v1`.

### Khi có backend
1. Tạo file `.env` từ `.env.example`, đặt `VITE_API_BASE_URL`.
2. Sửa thân từng hàm trong `src/services/index.ts` sang `request<T>("GET", "/products")` (helper ở `http.ts`). Chữ ký hàm giữ nguyên nên các trang không phải sửa.
3. Đổi các hook trong `hooks.ts` sang `useQuery` của TanStack Query (đã cài sẵn), và `invalidateQueries` sau mỗi thao tác ghi.
4. Bỏ `ssr: false` trong `routes/products.$productId.tsx` nếu muốn render phía server.

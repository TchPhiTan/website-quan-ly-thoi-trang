/**
 * TEST-FLOW.JS — Comprehensive E2E API Verification Script
 */

const BASE_URL = 'http://localhost:8080/api';

async function runTests() {
    console.log('🚀 Bắt đầu kiểm thử toàn diện hệ thống backend ShopDB (Neon PostgreSQL)...\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message, detail = '') {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            if (detail) console.error(`     Chi tiết: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`);
            failed++;
        }
    }

    // Helper for requests with cookies
    async function apiRequest(url, method = 'GET', body = null, cookie = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (cookie) headers['Cookie'] = cookie;

        const res = await fetch(`${BASE_URL}${url}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const setCookieHeader = res.headers.get('set-cookie');
        let newCookie = cookie;
        if (setCookieHeader) {
            newCookie = setCookieHeader.split(';')[0];
        }

        let json = null;
        try {
            json = await res.json();
        } catch (_) {}

        return { status: res.status, data: json, cookie: newCookie };
    }

    try {
        // --- 1. HEALTH CHECK ---
        console.log('--- 1. KIỂM TRA HỆ THỐNG (HEALTH CHECK) ---');
        const health = await apiRequest('/health');
        assert(health.status === 200 && health.data?.status === 'ok', 'GET /health hoạt động tốt', health.data);

        // --- 2. AUTH FLOW: CUSTOMER ---
        console.log('\n--- 2. XÁC THỰC KHÁCH HÀNG (AUTH CUSTOMER) ---');
        const testEmail = `customer_${Date.now()}@example.com`;
        const regRes = await apiRequest('/auth/register', 'POST', {
            email: testEmail,
            password: 'CustomerPass123',
            full_name: 'Nguyen Van Khach',
            phone: '0901234567',
        });
        assert(regRes.status === 201, `Đăng ký khách hàng (${testEmail})`, regRes.data);

        const custLogin = await apiRequest('/auth/login', 'POST', {
            email: testEmail,
            password: 'CustomerPass123',
        });
        assert(custLogin.status === 200 && custLogin.cookie, 'Đăng nhập khách hàng thành công & nhận session cookie', custLogin.data);
        const custCookie = custLogin.cookie;

        const custMe = await apiRequest('/auth/me', 'GET', null, custCookie);
        assert(custMe.status === 200 && custMe.data?.user?.email === testEmail, 'GET /auth/me trả về đúng thông tin phiên', custMe.data);

        // --- 3. AUTH FLOW: ADMIN & STAFF ---
        console.log('\n--- 3. XÁC THỰC QUẢN TRỊ VIÊN & NHÂN VIÊN ---');
        const adminLogin = await apiRequest('/auth/login', 'POST', {
            email: 'admin@shop.com',
            password: 'admin123',
        });
        assert(adminLogin.status === 200 && adminLogin.cookie, 'Đăng nhập Admin (admin@shop.com)', adminLogin.data);
        const adminCookie = adminLogin.cookie;

        const staffLogin = await apiRequest('/auth/login', 'POST', {
            email: 'staff@shop.com',
            password: 'staff123',
        });
        assert(staffLogin.status === 200 && staffLogin.cookie, 'Đăng nhập Staff (staff@shop.com)', staffLogin.data);
        const staffCookie = staffLogin.cookie;

        // --- 4. ADMIN: TẠO DANH MỤC & SẢN PHẨM ---
        console.log('\n--- 4. ADMIN: QUẢN LÝ DANH MỤC & SẢN PHẨM ---');
        const catSlug = `ao-nam-${Date.now()}`;
        const catRes = await apiRequest('/admin/categories', 'POST', {
            title: 'Áo Nam Cao Cấp',
            slug: catSlug,
            description: 'Bộ sưu tập áo nam',
        }, adminCookie);
        assert(catRes.status === 201 && catRes.data?.data?.id, 'Tạo danh mục mới', catRes.data);
        const categoryId = catRes.data?.data?.id;

        const prodSlug = `ao-so-mi-luan-don-${Date.now()}`;
        const prodRes = await apiRequest('/admin/products', 'POST', {
            title: 'Áo Sơ Mi Oxford Dài Tay',
            slug: prodSlug,
            price: 450000,
            discount: 10,
            category_id: categoryId,
            size: JSON.stringify(['M', 'L', 'XL']),
            description: 'Vải cotton thoáng mát cao cấp',
            thumbnail: 'http://localhost:8080/assets/products/Noah-shirt-front.jpg',
            status: 'active',
        }, adminCookie);
        assert(prodRes.status === 201 && prodRes.data?.data?.id, 'Tạo sản phẩm mới', prodRes.data);
        const productId = prodRes.data?.data?.id;

        // Lấy danh sách màu để tạo biến thể
        const colors = await (await fetch('http://localhost:8080/api/public/categories')).json();
        // Lấy color từ db
        const db = require('../src/lib/prisma');
        const color = await db.colors.findFirst({ where: { slug: 'den' } });

        let variantId = null;
        if (color && productId) {
            const varRes = await apiRequest(`/admin/products/${productId}/variants`, 'POST', {
                color_id: color.id,
                size: 'L',
                stock: 50,
                images: ['http://localhost:8080/assets/products/Noah-shirt-front.jpg'],
            }, adminCookie);
            assert(varRes.status === 201 && varRes.data?.data?.id, 'Tạo biến thể sản phẩm (Size L - Màu Đen)', varRes.data);
            variantId = varRes.data?.data?.id;
        }

        // Tạo mã giảm giá
        const couponCode = `SALE${Math.floor(Math.random() * 9000 + 1000)}`;
        const now = new Date();
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const couponRes = await apiRequest('/admin/coupons', 'POST', {
            code: couponCode,
            title: 'Giảm 50k cho khách hàng mới',
            type: 'AMOUNT',
            discount_value: 50000,
            min_order_value: 200000,
            start_date: now.toISOString(),
            end_date: nextMonth.toISOString(),
            usage_limit: 100,
            status: 'ACTIVE',
        }, adminCookie);
        assert(couponRes.status === 201 && couponRes.data?.data?.coupon_id, `Tạo mã giảm giá (${couponCode})`, couponRes.data);
        const couponId = couponRes.data?.data?.coupon_id;

        // --- 5. PUBLIC STOREFRONT ---
        console.log('\n--- 5. GIAO DIỆN KHÁCH VÃNG LAI (PUBLIC API) ---');
        const pubProducts = await apiRequest('/public/products');
        assert(pubProducts.status === 200 && pubProducts.data?.data?.length > 0, 'GET /public/products trả về danh sách', pubProducts.data?.pagination);

        const pubDetail = await apiRequest(`/public/products/${prodSlug}`);
        assert(pubDetail.status === 200 && pubDetail.data?.data?.slug === prodSlug, `GET /public/products/${prodSlug} trả về chi tiết`, pubDetail.data?.data?.title);

        // --- 6. SHOPPING FLOW: GIỎ HÀNG & ĐẶT HÀNG ---
        console.log('\n--- 6. QUY TRÌNH MUA HÀNG (SHOPPING & CHECKOUT) ---');
        if (variantId) {
            const addCart = await apiRequest('/user/cart/items', 'POST', {
                product_id: productId,
                variant_id: variantId,
                size: 'L',
                color: 'Đen',
                quantity: 2,
                price_unit: 405000,
            }, custCookie);
            assert(addCart.status === 200, 'Thêm sản phẩm vào giỏ hàng', addCart.data);

            const getCart = await apiRequest('/user/cart', 'GET', null, custCookie);
            assert(getCart.status === 200 && getCart.data?.data?.cart_items?.length > 0, 'Xem giỏ hàng có sản phẩm', getCart.data?.data?.cart_items?.length);

            const applyCp = await apiRequest('/user/cart/coupon', 'POST', { code: couponCode }, custCookie);
            assert(applyCp.status === 200, `Áp dụng mã giảm giá ${couponCode}`, applyCp.data);

            const checkoutRes = await apiRequest('/user/checkout', 'POST', {
                payment_method: 'cod',
                shipping_full_name: 'Nguyen Van Khach',
                shipping_phone: '0901234567',
                shipping_city: 'TP. Ho Chi Minh',
                shipping_line1: '123 Nguyen Trai, Q.1',
                coupon_id: couponId,
            }, custCookie);
            assert(checkoutRes.status === 201 && checkoutRes.data?.order_id, 'Đặt hàng thành công qua Checkout (UC-KH07)', checkoutRes.data);
            const orderId = checkoutRes.data?.order_id;

            const myOrders = await apiRequest('/user/orders', 'GET', null, custCookie);
            assert(myOrders.status === 200 && myOrders.data?.data?.length > 0, 'Xem lịch sử đơn hàng', myOrders.data?.pagination);

            // --- 7. STAFF: XỬ LÝ ĐƠN HÀNG & KHO ---
            console.log('\n--- 7. NHÂN VIÊN (STAFF ORDERS & INVENTORY) ---');
            const staffOrders = await apiRequest('/staff/orders', 'GET', null, staffCookie);
            assert(staffOrders.status === 200, 'Staff xem danh sách đơn hàng', staffOrders.data?.pagination);

            if (orderId) {
                const updateStatus = await apiRequest(`/staff/orders/${orderId}/status`, 'PATCH', {
                    status: 'processing',
                }, staffCookie);
                assert(updateStatus.status === 200, `Staff cập nhật trạng thái đơn ${orderId} -> processing`, updateStatus.data);
            }

            const staffInv = await apiRequest('/staff/inventory', 'GET', null, staffCookie);
            assert(staffInv.status === 200, 'Staff xem báo cáo tồn kho', staffInv.data?.pagination);
        }

        // --- 8. ADMIN: BÁO CÁO DOANH THU ---
        console.log('\n--- 8. QUẢN TRỊ VIÊN: BÁO CÁO DOANH THU ---');
        const report = await apiRequest('/admin/reports/revenue', 'GET', null, adminCookie);
        assert(report.status === 200, 'Admin xem báo cáo doanh thu & đơn hàng', report.data);

        console.log('\n========================================');
        console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
        console.log('========================================');
    } catch (err) {
        console.error('Lỗi ngoại lệ trong quá trình test:', err);
    } finally {
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();

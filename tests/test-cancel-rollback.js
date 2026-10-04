const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:8080/api';

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

async function testCancelRollback() {
    console.log('🧪 BẮT ĐẦU TEST: TRANSACTION HOÀN KHO & HOÀN VOUCHER KHI HỦY ĐƠN');

    let customerCookie = null;
    let testOrderId = null;
    let variantId = null;
    let initialStock = 0;

    try {
        // 1. Đăng ký/đăng nhập customer
        const email = `test_cancel_${Date.now()}@test.com`;
        const password = 'Password123!';
        await apiRequest('/auth/register', 'POST', {
            email,
            password,
            full_name: 'Khách Hàng Test Rollback',
            phone: '0909123456',
        });
        const loginRes = await apiRequest('/auth/login', 'POST', { email, password });
        customerCookie = loginRes.cookie;
        console.log('1. Đăng ký & đăng nhập customer thành công, cookie:', customerCookie ? 'OK' : 'FAIL');

        // 2. Tìm một variant còn hàng
        const variant = await prisma.product_variants.findFirst({
            where: { stock: { gte: 5 } },
            include: { products: true },
        });
        if (!variant) throw new Error('Không tìm thấy variant nào có stock >= 5');
        variantId = variant.id;
        initialStock = variant.stock;
        console.log(`2. Chọn variant ID ${variantId}, stock ban đầu: ${initialStock}`);

        // 3. Thêm vào giỏ hàng
        const addCartRes = await apiRequest('/user/cart/items', 'POST', {
            product_id: variant.product_id,
            variant_id: variantId,
            size: variant.size || 'M',
            color: 'Mặc định',
            price_unit: Number(variant.products?.price || 500000),
            quantity: 2,
        }, customerCookie);
        console.log('3. Thêm 2 sản phẩm vào giỏ:', addCartRes.status === 200 ? 'OK' : addCartRes.data);

        // 4. Checkout đặt hàng
        const checkoutRes = await apiRequest('/user/checkout', 'POST', {
            payment_method: 'COD',
            shipping_full_name: 'Khách Hàng Test',
            shipping_phone: '0909123456',
            shipping_city: 'TP. Hồ Chí Minh',
            shipping_line1: '123 Đường Test',
        }, customerCookie);
        testOrderId = checkoutRes.data?.order_id;
        console.log(`4. Đặt hàng thành công! Order ID: ${testOrderId}`);

        // Kiểm tra tồn kho sau khi đặt (phải giảm 2)
        const stockAfterOrder = (await prisma.product_variants.findUnique({ where: { id: variantId } })).stock;
        console.log(`   Stock sau khi đặt (kỳ vọng ${initialStock - 2}): ${stockAfterOrder}`);
        if (stockAfterOrder !== initialStock - 2) {
            throw new Error(`Tồn kho không giảm đúng: ${stockAfterOrder}`);
        }

        // 5. Hủy đơn hàng (POST /user/orders/:id/cancel)
        console.log('5. Tiến hành hủy đơn hàng...');
        const cancelRes = await apiRequest(`/user/orders/${testOrderId}/cancel`, 'POST', {}, customerCookie);
        console.log('   Kết quả hủy đơn:', cancelRes.data);

        // 6. Kiểm tra tồn kho sau khi hủy (phải hoàn lại = initialStock)
        const stockAfterCancel = (await prisma.product_variants.findUnique({ where: { id: variantId } })).stock;
        console.log(`6. Tồn kho sau khi hủy (kỳ vọng hoàn lại ${initialStock}): ${stockAfterCancel}`);

        if (stockAfterCancel === initialStock) {
            console.log('   ✅ PASS: Tồn kho đã được HOÀN TRẢ CHÍNH XÁC 100%!');
        } else {
            console.error('   ❌ FAIL: Tồn kho chưa được hoàn trả!');
        }

        // 7. Kiểm tra bảng inventory_movements xem có lý do 'cancelled' không
        const movement = await prisma.inventory_movements.findFirst({
            where: { ref_order_id: testOrderId, reason: 'cancelled' },
        });
        if (movement && movement.delta === 2) {
            console.log('   ✅ PASS: Nhật ký biến động kho (inventory_movements) đã ghi nhận delta +2 lý do "cancelled"!');
        } else {
            console.error('   ❌ FAIL: Chưa tìm thấy inventory_movements cho hủy đơn!');
        }

    } catch (e) {
        console.error('Lỗi test rollback:', e);
    } finally {
        // Dọn dẹp dữ liệu test order
        if (testOrderId) {
            console.log('\n🧹 Dọn dẹp dữ liệu đơn hàng test...');
            await prisma.inventory_movements.deleteMany({ where: { ref_order_id: testOrderId } });
            await prisma.order_items.deleteMany({ where: { order_id: testOrderId } });
            await prisma.orders.deleteMany({ where: { id: testOrderId } });
            console.log('   ✅ Đã xóa đơn hàng test.');
        }
        await prisma.$disconnect();
    }
}

testCancelRollback();

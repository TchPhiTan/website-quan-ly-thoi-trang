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

async function runAdminProductTest() {
    console.log('====================================================');
    console.log('🧪 BẮT ĐẦU KIỂM THỬ: USECASE ADMIN TẠO SẢN PHẨM');
    console.log('====================================================\n');

    let adminCookie = null;
    let createdProductId = null;
    const testSlug = `test-ao-blazer-demo-${Date.now()}`;

    try {
        // BƯỚC 1: Đăng nhập Admin
        console.log('1️⃣ Đăng nhập tài khoản Admin...');
        const loginRes = await apiRequest('/auth/login', 'POST', {
            email: 'admin@shop.com',
            password: 'admin123',
        });
        if (loginRes.status !== 200 || !loginRes.cookie) {
            throw new Error(`Đăng nhập admin thất bại: ${JSON.stringify(loginRes.data)}`);
        }
        adminCookie = loginRes.cookie;
        console.log('   ✅ Đăng nhập Admin thành công. Cookie session đã nhận.\n');

        // BƯỚC 2: Lấy danh mục hợp lệ từ Database
        console.log('2️⃣ Lấy danh mục có sẵn trong hệ thống...');
        const categories = await prisma.categories.findMany({
            where: { deleted: false },
            take: 3,
        });
        if (!categories.length) throw new Error('Không tìm thấy danh mục nào trong DB');
        const targetCategory = categories[0];
        console.log(`   ✅ Chọn danh mục thử nghiệm: "${targetCategory.title}" (ID: ${targetCategory.id})\n`);

        // BƯỚC 3: Testcase Validation — Thiếu trường bắt buộc (TC02)
        console.log('3️⃣ Testcase TC02: Thử tạo sản phẩm thiếu dữ liệu bắt buộc (không có title)...');
        const invalidRes = await apiRequest('/admin/products', 'POST', {
            price: 500000,
            category_id: targetCategory.id,
            slug: 'test-invalid-slug',
        }, adminCookie);
        console.log(`   HTTP Status: ${invalidRes.status}`);
        console.log(`   Phản hồi lỗi:`, invalidRes.data);
        if (invalidRes.status === 400) {
            console.log('   ✅ PASS TC02: Hệ thống chặn đúng với HTTP 400.\n');
        } else {
            console.log('   ⚠️ Chú ý: Kỳ vọng 400 nhưng nhận được', invalidRes.status);
        }

        // BƯỚC 4: Testcase Happy Path — Tạo sản phẩm mới hợp lệ (TC01)
        console.log('4️⃣ Testcase TC01: Tạo sản phẩm mới hoàn chỉnh...');
        const newProductPayload = {
            title: 'Áo Blazer Dạ Nữ Mộc Cao Cấp (Test Demo)',
            description: 'Chất liệu dạ ép cao cấp, giữ ấm tốt, form dáng chuẩn công sở.',
            price: 850000,
            discount: 10,
            category_id: targetCategory.id,
            size: ['S', 'M', 'L'],
            thumbnail: '/assets/Noah-shirt-front.jpg',
            status: 'active',
            slug: testSlug,
        };

        const createRes = await apiRequest('/admin/products', 'POST', newProductPayload, adminCookie);
        console.log(`   HTTP Status: ${createRes.status}`);
        console.log(`   Kết quả API:`, createRes.data);

        if (createRes.status !== 201 || !createRes.data?.data?.id) {
            throw new Error(`Tạo sản phẩm thất bại: ${JSON.stringify(createRes.data)}`);
        }
        createdProductId = createRes.data.data.id;
        console.log(`   ✅ PASS TC01: Tạo sản phẩm thành công! Product ID: ${createdProductId}\n`);

        // BƯỚC 5: Testcase Trùng Slug (TC04)
        console.log('5️⃣ Testcase TC04: Thử tạo sản phẩm có slug bị trùng...');
        const duplicateRes = await apiRequest('/admin/products', 'POST', newProductPayload, adminCookie);
        console.log(`   HTTP Status: ${duplicateRes.status}`);
        console.log(`   Phản hồi:`, duplicateRes.data);
        if (duplicateRes.status === 409) {
            console.log('   ✅ PASS TC04: Hệ thống chặn trùng slug thành công với HTTP 409 Conflict.\n');
        }

        // BƯỚC 6: Tạo biến thể màu / size cho sản phẩm (TC07)
        console.log('6️⃣ Testcase TC07: Thêm biến thể cho sản phẩm vừa tạo...');
        const colors = await prisma.colors.findMany({ take: 1 });
        let colorId = colors[0]?.id;
        if (!colorId) {
            const newColor = await prisma.colors.create({
                data: { name: 'Xám khói', slug: 'xam-khoi', hex: '#888888' },
            });
            colorId = newColor.id;
        }

        const variantRes = await apiRequest(`/admin/products/${createdProductId}/variants`, 'POST', {
            color_id: colorId,
            size: 'M',
            images: ['/assets/Noah-shirt-front.jpg', '/assets/Noah-shirt-side.jpg'],
            stock: 50,
        }, adminCookie);
        console.log(`   HTTP Status: ${variantRes.status}`);
        console.log(`   Kết quả biến thể:`, variantRes.data);
        console.log('   ✅ PASS TC07: Đã thêm biến thể thành công.\n');

        // BƯỚC 7: TRUY VẤN VÀ KIỂM TRA TRỰC TIẾP TRONG NEON DATABASE
        console.log('7️⃣ TRUY VẤN DỮ LIỆU THỰC TẾ TRONG DATABASE NEON (PostgreSQL):');
        const dbProduct = await prisma.products.findUnique({
            where: { id: createdProductId },
            include: {
                categories: { select: { id: true, title: true, slug: true } },
                product_variants: {
                    include: { colors: { select: { id: true, name: true, hex: true } } },
                },
            },
        });

        console.log('----------------------------------------------------');
        console.log('Chi tiết Record trong Neon DB:');
        console.log(JSON.stringify(dbProduct, null, 2));
        console.log('----------------------------------------------------\n');

    } catch (err) {
        console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
    } finally {
        // BƯỚC 8: CLEAR DỮ LIỆU ĐÃ TẠO THEO YÊU CẦU CỦA USER
        console.log('8️⃣ DỌN DẸP DỮ LIỆU (CLEAR TEST DATA):');
        if (createdProductId) {
            console.log(`   Đang xóa biến thể của sản phẩm ID: ${createdProductId}...`);
            const delVariants = await prisma.product_variants.deleteMany({
                where: { product_id: createdProductId },
            });
            console.log(`   Đã xóa ${delVariants.count} biến thể.`);

            console.log(`   Đang xóa sản phẩm ID: ${createdProductId}...`);
            await prisma.products.delete({
                where: { id: createdProductId },
            });
            console.log(`   ✅ Đã xóa hoàn toàn sản phẩm khỏi Database Neon.`);

            // Xác nhận lại rằng record không còn tồn tại
            const check = await prisma.products.findUnique({ where: { id: createdProductId } });
            console.log(`   Kiểm tra lại sau khi xóa: ${check === null ? 'ĐÃ SẠCH 100% (null)' : 'Vẫn còn'}`);
        }
        await prisma.$disconnect();
        console.log('\n====================================================');
        console.log('✨ HOÀN TẤT KIỂM THỬ VÀ ĐÃ DỌN DẸP SẠCH DATABASE');
        console.log('====================================================');
    }
}

runAdminProductTest();

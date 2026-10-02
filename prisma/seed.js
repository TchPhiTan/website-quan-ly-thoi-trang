const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Đang khởi tạo dữ liệu mẫu...');

    // 1. Tạo các roles cơ bản
    const defaultRoles = [
        { name: 'admin', description: 'Quản trị viên toàn quyền hệ thống' },
        { name: 'staff', description: 'Nhân viên quản lý đơn hàng, kho và hỗ trợ' },
        { name: 'user', description: 'Khách hàng mua sắm' },
    ];

    for (const r of defaultRoles) {
        await prisma.roles.upsert({
            where: { name: r.name },
            update: {},
            create: {
                id: uuidv4(),
                name: r.name,
                description: r.description,
            },
        });
    }
    console.log('✅ Đã tạo các Roles: admin, staff, user');

    // 2. Tạo tài khoản Admin mặc định
    const adminRole = await prisma.roles.findUnique({ where: { name: 'admin' } });
    const existingAdmin = await prisma.users.findUnique({ where: { email: 'admin@shop.com' } });

    if (!existingAdmin && adminRole) {
        const adminId = uuidv4();
        const tokenUser = uuidv4();
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await prisma.users.create({
            data: {
                id: adminId,
                email: 'admin@shop.com',
                password: hashedPassword,
                full_name: 'System Administrator',
                token_user: tokenUser,
                role: adminRole.id,
                status: 'active',
            },
        });

        await prisma.cart.create({
            data: { id: uuidv4(), token_user: tokenUser },
        });

        console.log('✅ Đã tạo tài khoản Admin mẫu: admin@shop.com / admin123');
    }

    // 3. Tạo tài khoản Staff mặc định
    const staffRole = await prisma.roles.findUnique({ where: { name: 'staff' } });
    const existingStaff = await prisma.users.findUnique({ where: { email: 'staff@shop.com' } });

    if (!existingStaff && staffRole) {
        const staffId = uuidv4();
        const tokenUser = uuidv4();
        const hashedPassword = await bcrypt.hash('staff123', 10);

        await prisma.users.create({
            data: {
                id: staffId,
                email: 'staff@shop.com',
                password: hashedPassword,
                full_name: 'Store Staff',
                token_user: tokenUser,
                role: staffRole.id,
                status: 'active',
            },
        });

        await prisma.cart.create({
            data: { id: uuidv4(), token_user: tokenUser },
        });

        console.log('✅ Đã tạo tài khoản Staff mẫu: staff@shop.com / staff123');
    }

    // 4. Tạo các màu sắc cơ bản
    const defaultColors = [
        { name: 'Đen', slug: 'den', hex: '#000000' },
        { name: 'Trắng', slug: 'trang', hex: '#FFFFFF' },
        { name: 'Xanh Navy', slug: 'xanh-navy', hex: '#000080' },
        { name: 'Be / Kem', slug: 'be-kem', hex: '#F5F5DC' },
    ];

    for (const c of defaultColors) {
        await prisma.colors.upsert({
            where: { slug: c.slug },
            update: {},
            create: {
                id: uuidv4(),
                name: c.name,
                slug: c.slug,
                hex: c.hex,
            },
        });
    }
    console.log('✅ Đã tạo các Màu sắc cơ bản');

    console.log('🎉 Seed hoàn tất!');
}

main()
    .catch((e) => {
        console.error('❌ Lỗi seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

/**
 * CONTROLLER: Admin (Quản trị viên)
 * - Quản lý sản phẩm (CRUD + biến thể + màu sắc)
 * - Quản lý danh mục (CRUD)
 * - Quản lý người dùng (xem, khóa, phân quyền)
 * - Quản lý mã giảm giá (CRUD)
 * - Báo cáo doanh thu & thống kê
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../lib/prisma');
const logger = require('../config/logger');

// ==========================================
// QUẢN LÝ SẢN PHẨM
// ==========================================

// GET /admin/products — Danh sách sản phẩm (gồm cả đã xóa mềm)
const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, keyword, category_id, status, include_deleted = 'false' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            ...(include_deleted !== 'true' && { deleted: false }),
            ...(status && { status }),
            ...(category_id && { category_id }),
            ...(keyword && { title: { contains: keyword } }),
        };

        const [products, total] = await Promise.all([
            db.products.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
                include: {
                    categories: { select: { title: true } },
                    product_variants: { include: { colors: true } },
                },
            }),
            db.products.count({ where }),
        ]);

        res.json({ data: products, pagination: { page: Number(page), limit: Number(limit), total } });
    } catch (error) {
        logger.error('Admin: Lỗi lấy sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /admin/products — Tạo sản phẩm mới
const createProduct = async (req, res) => {
    try {
        const { title, description, price, discount = 0, category_id, size = '[]', thumbnail, status = 'active', slug } = req.body;

        if (!title || !price || !category_id || !slug) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: title, price, category_id, slug' });
        }

        const existing = await db.products.findUnique({ where: { slug } });
        if (existing) return res.status(409).json({ error: 'Slug đã được sử dụng' });

        const product = await db.products.create({
            data: {
                id: uuidv4(),
                title, description, price: Number(price),
                discount: Number(discount), category_id,
                size: typeof size === 'string' ? size : JSON.stringify(size),
                thumbnail, status, slug,
            },
        });

        res.status(201).json({ message: 'Tạo sản phẩm thành công', data: product });
    } catch (error) {
        logger.error('Admin: Lỗi tạo sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /admin/products/:id — Cập nhật sản phẩm
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, discount, category_id, size, thumbnail, status, slug } = req.body;

        await db.products.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: Number(price) }),
                ...(discount !== undefined && { discount: Number(discount) }),
                ...(category_id && { category_id }),
                ...(size !== undefined && { size: typeof size === 'string' ? size : JSON.stringify(size) }),
                ...(thumbnail !== undefined && { thumbnail }),
                ...(status && { status }),
                ...(slug && { slug }),
            },
        });

        res.json({ message: 'Cập nhật sản phẩm thành công' });
    } catch (error) {
        logger.error('Admin: Lỗi cập nhật sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// DELETE /admin/products/:id — Xóa mềm sản phẩm
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.products.update({
            where: { id },
            data: { deleted: true, deleted_at: new Date(), status: 'inactive' },
        });
        res.json({ message: 'Đã xóa sản phẩm' });
    } catch (error) {
        logger.error('Admin: Lỗi xóa sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /admin/products/:id/variants — Thêm biến thể sản phẩm
const createVariant = async (req, res) => {
    try {
        const { id: product_id } = req.params;
        const { color_id, size, images = '[]', stock = 0 } = req.body;

        if (!color_id || !size) {
            return res.status(400).json({ error: 'Thiếu color_id hoặc size' });
        }

        const variant = await db.product_variants.create({
            data: {
                id: uuidv4(),
                product_id,
                color_id,
                size,
                images: typeof images === 'string' ? images : JSON.stringify(images),
                stock: Number(stock),
            },
        });

        res.status(201).json({ message: 'Đã thêm biến thể', data: variant });
    } catch (error) {
        logger.error('Admin: Lỗi tạo biến thể', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /admin/variants/:id — Cập nhật biến thể
const updateVariant = async (req, res) => {
    try {
        const { id } = req.params;
        const { images, stock } = req.body;

        await db.product_variants.update({
            where: { id },
            data: {
                ...(images !== undefined && { images: typeof images === 'string' ? images : JSON.stringify(images) }),
                ...(stock !== undefined && { stock: Number(stock) }),
            },
        });

        res.json({ message: 'Đã cập nhật biến thể' });
    } catch (error) {
        logger.error('Admin: Lỗi cập nhật biến thể', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// QUẢN LÝ DANH MỤC
// ==========================================

// GET /admin/categories
const getCategories = async (req, res) => {
    try {
        const categories = await db.categories.findMany({
            where: { deleted: false },
            orderBy: [{ position: 'asc' }, { title: 'asc' }],
            include: { children: { where: { deleted: false } } },
        });
        res.json({ data: categories });
    } catch (error) {
        logger.error('Admin: Lỗi lấy danh mục', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /admin/categories
const createCategory = async (req, res) => {
    try {
        const { title, parent_id, description, thumbnail, slug, position = 0, is_featured = false } = req.body;

        if (!title || !slug) {
            return res.status(400).json({ error: 'Thiếu title hoặc slug' });
        }

        const category = await db.categories.create({
            data: {
                id: uuidv4(),
                title, slug, description, thumbnail,
                parent_id: parent_id || null,
                position: Number(position),
                is_featured: Boolean(is_featured),
            },
        });

        res.status(201).json({ message: 'Tạo danh mục thành công', data: category });
    } catch (error) {
        logger.error('Admin: Lỗi tạo danh mục', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /admin/categories/:id
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, parent_id, description, thumbnail, slug, position, is_featured, status } = req.body;

        await db.categories.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(slug && { slug }),
                ...(description !== undefined && { description }),
                ...(thumbnail !== undefined && { thumbnail }),
                ...(parent_id !== undefined && { parent_id: parent_id || null }),
                ...(position !== undefined && { position: Number(position) }),
                ...(is_featured !== undefined && { is_featured: Boolean(is_featured) }),
                ...(status && { status }),
            },
        });

        res.json({ message: 'Cập nhật danh mục thành công' });
    } catch (error) {
        logger.error('Admin: Lỗi cập nhật danh mục', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// DELETE /admin/categories/:id — Xóa mềm
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await db.categories.update({
            where: { id },
            data: { deleted: true, deleted_at: new Date(), status: 'inactive' },
        });
        res.json({ message: 'Đã xóa danh mục' });
    } catch (error) {
        logger.error('Admin: Lỗi xóa danh mục', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// QUẢN LÝ NGƯỜI DÙNG
// ==========================================

// GET /admin/users
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, keyword, status, role_name } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            deleted: false,
            ...(status && { status }),
            ...(keyword && {
                OR: [
                    { full_name: { contains: keyword } },
                    { email: { contains: keyword } },
                    { phone: { contains: keyword } },
                ],
            }),
            ...(role_name && { roles: { name: role_name } }),
        };

        const [users, total] = await Promise.all([
            db.users.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
                select: {
                    id: true, full_name: true, email: true, phone: true,
                    status: true, created_at: true, roles: { select: { name: true } },
                },
            }),
            db.users.count({ where }),
        ]);

        res.json({ data: users, pagination: { page: Number(page), limit: Number(limit), total } });
    } catch (error) {
        logger.error('Admin: Lỗi lấy danh sách user', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /admin/users/:id/status — Khóa / Mở khóa tài khoản
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive', 'banned'].includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        }

        await db.users.update({ where: { id }, data: { status } });
        res.json({ message: `Đã cập nhật tài khoản thành "${status}"` });
    } catch (error) {
        logger.error('Admin: Lỗi cập nhật user', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /admin/users/:id/role — Phân quyền
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name } = req.body;

        const role = await db.roles.findFirst({ where: { name: role_name } });
        if (!role) return res.status(404).json({ error: 'Role không tồn tại' });

        await db.users.update({ where: { id }, data: { role: role.id } });
        res.json({ message: `Đã cập nhật quyền thành "${role_name}"` });
    } catch (error) {
        logger.error('Admin: Lỗi phân quyền', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// QUẢN LÝ MÃ GIẢM GIÁ
// ==========================================

// GET /admin/coupons
const getCoupons = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = { ...(status && { status }) };

        const [coupons, total] = await Promise.all([
            db.coupons.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
            }),
            db.coupons.count({ where }),
        ]);

        res.json({ data: coupons, pagination: { page: Number(page), limit: Number(limit), total } });
    } catch (error) {
        logger.error('Admin: Lỗi lấy mã giảm giá', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /admin/coupons
const createCoupon = async (req, res) => {
    try {
        const {
            code, title, type, discount_value, start_date, end_date,
            usage_limit, min_order_value = 0, max_discount, status = 'INACTIVE',
        } = req.body;

        if (!code || !title || !type || !discount_value || !start_date || !end_date) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
        }

        const coupon = await db.coupons.create({
            data: {
                coupon_id: uuidv4(),
                code: code.toUpperCase(),
                title, type, status,
                discount_value: Number(discount_value),
                start_date: new Date(start_date),
                end_date: new Date(end_date),
                usage_limit: usage_limit ? Number(usage_limit) : null,
                min_order_value: Number(min_order_value),
                max_discount: max_discount ? Number(max_discount) : null,
            },
        });

        res.status(201).json({ message: 'Tạo mã giảm giá thành công', data: coupon });
    } catch (error) {
        logger.error('Admin: Lỗi tạo coupon', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /admin/coupons/:id
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, status, end_date, usage_limit, max_discount } = req.body;

        await db.coupons.update({
            where: { coupon_id: id },
            data: {
                ...(title && { title }),
                ...(status && { status }),
                ...(end_date && { end_date: new Date(end_date) }),
                ...(usage_limit !== undefined && { usage_limit: usage_limit ? Number(usage_limit) : null }),
                ...(max_discount !== undefined && { max_discount: max_discount ? Number(max_discount) : null }),
            },
        });

        res.json({ message: 'Cập nhật mã giảm giá thành công' });
    } catch (error) {
        logger.error('Admin: Lỗi cập nhật coupon', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// BÁO CÁO & THỐNG KÊ
// ==========================================

// GET /admin/reports/overview — Tổng quan hệ thống
const getOverview = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalOrders, totalUsers, totalProducts,
            monthOrders, pendingOrders, lowStockCount,
        ] = await Promise.all([
            db.orders.count({ where: { status: { not: 'cancelled' } } }),
            db.users.count({ where: { deleted: false, status: 'active' } }),
            db.products.count({ where: { deleted: false, status: 'active' } }),
            db.orders.findMany({
                where: {
                    created_at: { gte: startOfMonth },
                    status: { not: 'cancelled' },
                },
                select: { subtotal: true, discount_total: true, shipping_fee: true },
            }),
            db.orders.count({ where: { status: 'pending' } }),
            db.product_variants.count({ where: { stock: { lte: 5 } } }),
        ]);

        const monthRevenue = monthOrders.reduce((sum, o) => {
            return sum + Number(o.subtotal) - Number(o.discount_total) + Number(o.shipping_fee);
        }, 0);

        res.json({
            data: {
                total_orders: totalOrders,
                total_users: totalUsers,
                total_products: totalProducts,
                month_revenue: monthRevenue,
                month_orders: monthOrders.length,
                pending_orders: pendingOrders,
                low_stock_variants: lowStockCount,
            },
        });
    } catch (error) {
        logger.error('Admin: Lỗi báo cáo tổng quan', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /admin/reports/revenue — Doanh thu theo tháng
const getRevenueReport = async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        const orders = await db.orders.findMany({
            where: {
                status: 'completed',
                created_at: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${Number(year) + 1}-01-01`),
                },
            },
            select: { created_at: true, subtotal: true, discount_total: true, shipping_fee: true },
        });

        // Gom doanh thu theo tháng
        const monthly = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            revenue: 0,
            orders: 0,
        }));

        for (const o of orders) {
            const month = new Date(o.created_at).getMonth();
            monthly[month].revenue += Number(o.subtotal) - Number(o.discount_total) + Number(o.shipping_fee);
            monthly[month].orders += 1;
        }

        res.json({ data: monthly, year: Number(year) });
    } catch (error) {
        logger.error('Admin: Lỗi báo cáo doanh thu', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /admin/reports/top-products — Top sản phẩm bán chạy
const getTopProducts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const products = await db.products.findMany({
            where: { deleted: false },
            orderBy: { sold_count: 'desc' },
            take: Number(limit),
            select: {
                id: true, title: true, thumbnail: true, slug: true,
                sold_count: true, rating_avg: true, rating_count: true, price: true,
            },
        });

        res.json({ data: products });
    } catch (error) {
        logger.error('Admin: Lỗi top sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

module.exports = {
    getProducts, createProduct, updateProduct, deleteProduct,
    createVariant, updateVariant,
    getCategories, createCategory, updateCategory, deleteCategory,
    getUsers, updateUserStatus, updateUserRole,
    getCoupons, createCoupon, updateCoupon,
    getOverview, getRevenueReport, getTopProducts,
};

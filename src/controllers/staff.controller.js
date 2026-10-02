/**
 * CONTROLLER: Staff (Nhân viên)
 * - Xem và cập nhật trạng thái đơn hàng
 * - Gửi email thông báo (UC-NV04)
 * - Xử lý đổi/trả hàng (UC-NV07)
 * - Nhập kho (restock)
 * - Xem lịch sử tồn kho
 * - Phản hồi đánh giá
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../lib/prisma');
const logger = require('../config/logger');
const mailjet = require('../config/mailjet');

const ORDER_STATUSES = ['pending', 'processing', 'shipping', 'completed', 'cancelled', 'returned'];

// GET /staff/orders — Danh sách đơn hàng
const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, keyword } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            ...(status && { status }),
            ...(keyword && {
                OR: [
                    { shipping_full_name: { contains: keyword } },
                    { shipping_phone: { contains: keyword } },
                ],
            }),
        };

        const [orders, total] = await Promise.all([
            db.orders.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
                include: {
                    users: { select: { full_name: true, email: true, phone: true } },
                    order_items: { include: { products: { select: { title: true } } } },
                },
            }),
            db.orders.count({ where }),
        ]);

        res.json({ data: orders, pagination: { page: Number(page), limit: Number(limit), total } });
    } catch (error) {
        logger.error('Lỗi lấy danh sách đơn hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /staff/orders/:id/status — Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Trạng thái không hợp lệ. Cho phép: ${ORDER_STATUSES.join(', ')}` });
        }

        const order = await db.orders.findUnique({ where: { id } });
        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

        // Cập nhật sold_count khi đơn hoàn thành
        if (status === 'completed' && order.status !== 'completed') {
            const items = await db.order_items.findMany({ where: { order_id: id } });
            for (const item of items) {
                await db.products.update({
                    where: { id: item.product_id },
                    data: { sold_count: { increment: item.quantity } },
                });
            }
        }

        await db.orders.update({ where: { id }, data: { status } });
        res.json({ message: `Đã cập nhật trạng thái đơn hàng thành "${status}"` });
    } catch (error) {
        logger.error('Lỗi cập nhật trạng thái đơn', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /staff/orders/:id/notify — Gửi email thông báo (UC-NV04)
const notifyOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status_message } = req.body;

        const order = await db.orders.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

        const user = await db.users.findUnique({ where: { token_user: order.token_user } });

        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.MAIL_FROM || 'cskh@yourshop.com',
                        Name: 'ShopDB Fashion',
                    },
                    To: [{ Email: user.email, Name: user.full_name }],
                    Subject: `Cập nhật đơn hàng #${orderId.slice(0, 8).toUpperCase()}`,
                    HTMLPart: `
                        <h3>Xin chào ${user.full_name},</h3>
                        <p>Đơn hàng <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> của bạn: <strong>${status_message}</strong>.</p>
                        <p>Cảm ơn bạn đã mua hàng!</p>
                    `,
                },
            ],
        });

        res.json({ message: 'Đã gửi thông báo thành công' });
    } catch (error) {
        logger.error('Lỗi Mailjet', { orderId: req.params.id, error: error.message });
        res.status(500).json({ error: 'Không thể gửi email' });
    }
};

// POST /staff/orders/:id/rma — Xử lý đổi/trả hàng (UC-NV07)
const processRma = async (req, res) => {
    try {
        const { order_item_id, variant_id, product_id, quantity } = req.body;
        const orderId = req.params.id;

        await db.$transaction(async (tx) => {
            await tx.orders.update({ where: { id: orderId }, data: { status: 'returned' } });
            await tx.product_variants.update({
                where: { id: variant_id },
                data: { stock: { increment: quantity } },
            });
            await tx.inventory_movements.create({
                data: {
                    id: uuidv4(),
                    product_id,
                    variant_id,
                    order_item_id,
                    delta: quantity,
                    reason: 'returns',
                    ref_order_id: orderId,
                },
            });
        });

        res.json({ message: 'Đã xử lý đổi/trả và nhập lại kho' });
    } catch (error) {
        logger.error('Lỗi đổi trả', { error: error.message });
        res.status(500).json({ error: 'Lỗi xử lý' });
    }
};

// POST /staff/inventory/restock — Nhập kho thủ công
const restock = async (req, res) => {
    try {
        const { variant_id, quantity, note } = req.body;

        if (!variant_id || !quantity || quantity < 1) {
            return res.status(400).json({ error: 'Thiếu thông tin nhập kho' });
        }

        const variant = await db.product_variants.findUnique({ where: { id: variant_id } });
        if (!variant) return res.status(404).json({ error: 'Không tìm thấy biến thể sản phẩm' });

        await db.$transaction(async (tx) => {
            await tx.product_variants.update({
                where: { id: variant_id },
                data: { stock: { increment: quantity } },
            });
            await tx.inventory_movements.create({
                data: {
                    id: uuidv4(),
                    product_id: variant.product_id,
                    variant_id,
                    delta: quantity,
                    reason: 'restock',
                    note: note || null,
                },
            });
        });

        res.json({ message: `Đã nhập thêm ${quantity} sản phẩm vào kho` });
    } catch (error) {
        logger.error('Lỗi nhập kho', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /staff/inventory — Xem tồn kho theo sản phẩm
const getInventory = async (req, res) => {
    try {
        const { page = 1, limit = 20, keyword, low_stock } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            products: {
                deleted: false,
                ...(keyword && { title: { contains: keyword } }),
            },
            ...(low_stock === 'true' && { stock: { lte: 10 } }),
        };

        const [variants, total] = await Promise.all([
            db.product_variants.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    products: { select: { id: true, title: true, thumbnail: true, slug: true } },
                    colors: true,
                },
                orderBy: { stock: 'asc' },
            }),
            db.product_variants.count({ where }),
        ]);

        res.json({ data: variants, pagination: { page: Number(page), limit: Number(limit), total } });
    } catch (error) {
        logger.error('Lỗi lấy tồn kho', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /staff/inventory/movements — Lịch sử biến động kho
const getInventoryMovements = async (req, res) => {
    try {
        const { page = 1, limit = 30, variant_id, reason } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            ...(variant_id && { variant_id }),
            ...(reason && { reason }),
        };

        const [movements, total] = await Promise.all([
            db.inventory_movements.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
                include: {
                    products: { select: { title: true } },
                    product_variants: { select: { size: true, color: true } },
                },
            }),
            db.inventory_movements.count({ where }),
        ]);

        res.json({ data: movements, pagination: { page: Number(page), limit: Number(limit), total } });
    } catch (error) {
        logger.error('Lỗi lấy lịch sử kho', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /staff/reviews/:id/reply — Phản hồi đánh giá
const replyReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) return res.status(400).json({ error: 'Nội dung phản hồi là bắt buộc' });

        const review = await db.product_reviews.findUnique({ where: { id } });
        if (!review) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });

        await db.review_replies.create({
            data: {
                id: uuidv4(),
                review_id: id,
                author: req.user.full_name || 'staff',
                content,
            },
        });

        res.status(201).json({ message: 'Đã gửi phản hồi' });
    } catch (error) {
        logger.error('Lỗi phản hồi đánh giá', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

module.exports = {
    getOrders, updateOrderStatus, notifyOrder, processRma,
    restock, getInventory, getInventoryMovements,
    replyReview,
};

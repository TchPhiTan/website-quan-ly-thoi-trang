/**
 * CONTROLLER: Public API (Không yêu cầu đăng nhập)
 * - Danh sách sản phẩm (lọc, tìm kiếm, phân trang)
 * - Chi tiết sản phẩm
 * - Danh sách danh mục
 * - Đánh giá sản phẩm
 * - Đặt hàng nhanh (khách vãng lai - UC-KVL03)
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../lib/prisma');
const logger = require('../config/logger');

// GET /public/products — Danh sách sản phẩm
const getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category_id,
            keyword,
            min_price,
            max_price,
            sort = 'created_at_desc',
            status = 'active',
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            deleted: false,
            status,
            ...(category_id && { category_id }),
            ...(keyword && {
                OR: [
                    { title: { contains: keyword } },
                    { description: { contains: keyword } },
                ],
            }),
            ...(min_price || max_price
                ? {
                    price: {
                        ...(min_price && { gte: Number(min_price) }),
                        ...(max_price && { lte: Number(max_price) }),
                    },
                }
                : {}),
        };

        const orderByMap = {
            created_at_desc: { created_at: 'desc' },
            created_at_asc: { created_at: 'asc' },
            price_asc: { price: 'asc' },
            price_desc: { price: 'desc' },
            sold_count_desc: { sold_count: 'desc' },
            rating_desc: { rating_avg: 'desc' },
        };

        const [products, total] = await Promise.all([
            db.products.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: orderByMap[sort] || { created_at: 'desc' },
                include: {
                    categories: { select: { id: true, title: true, slug: true } },
                    product_variants: {
                        select: { id: true, color: true, size: true, stock: true, images: true, colors: true },
                    },
                },
            }),
            db.products.count({ where }),
        ]);

        res.json({
            data: products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                total_pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        logger.error('Lỗi lấy danh sách sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /public/products/:slug — Chi tiết sản phẩm
const getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await db.products.findUnique({
            where: { slug },
            include: {
                categories: { select: { id: true, title: true, slug: true } },
                product_variants: {
                    include: { colors: true },
                    orderBy: { size: 'asc' },
                },
            },
        });

        if (!product || product.deleted) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        const reviews = await db.product_reviews.findMany({
            where: {
                order_items: { product_id: product.id },
            },
            take: 10,
            orderBy: { created_at: 'desc' },
            include: {
                users: { select: { full_name: true, avatar: true } },
                review_replies: true,
            },
        });

        res.json({ data: { ...product, reviews } });
    } catch (error) {
        logger.error('Lỗi lấy chi tiết sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /public/categories — Danh sách danh mục
const getCategories = async (req, res) => {
    try {
        const { parent_only } = req.query;

        const where = {
            deleted: false,
            status: 'active',
            ...(parent_only === 'true' && { parent_id: null }),
        };

        const categories = await db.categories.findMany({
            where,
            orderBy: [{ position: 'asc' }, { title: 'asc' }],
            include: {
                children: {
                    where: { deleted: false, status: 'active' },
                    orderBy: { position: 'asc' },
                },
            },
        });

        res.json({ data: categories });
    } catch (error) {
        logger.error('Lỗi lấy danh mục', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /public/products/:slug/reviews — Đánh giá của sản phẩm (phân trang)
const getProductReviews = async (req, res) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const product = await db.products.findUnique({ where: { slug }, select: { id: true } });
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        const [reviews, total] = await Promise.all([
            db.product_reviews.findMany({
                where: {
                    order_items: { product_id: product.id },
                },
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
                include: {
                    users: { select: { full_name: true, avatar: true } },
                    review_replies: true,
                },
            }),
            db.product_reviews.count({
                where: { order_items: { product_id: product.id } },
            }),
        ]);

        res.json({
            data: reviews,
            pagination: { page: Number(page), limit: Number(limit), total },
        });
    } catch (error) {
        logger.error('Lỗi lấy đánh giá sản phẩm', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /public/checkout — Đặt hàng nhanh (khách vãng lai - UC-KVL03)
const guestCheckout = async (req, res) => {
    try {
        const {
            cartItems,
            shipping_full_name,
            shipping_phone,
            shipping_city,
            shipping_line1,
            payment_method,
        } = req.body;

        if (!cartItems?.length) {
            return res.status(400).json({ error: 'Giỏ hàng trống' });
        }

        const cleanShippingPhone = shipping_phone ? String(shipping_phone).replace(/\s/g, '') : null;
        if (!cleanShippingPhone || !/^0\d{9}$/.test(cleanShippingPhone)) {
            return res.status(400).json({ error: 'Số điện thoại nhận hàng không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
        }

        await db.$transaction(async (tx) => {
            const shadowUserToken = uuidv4();
            const role = await tx.roles.findFirst({ where: { name: 'user' } });

            await tx.users.create({
                data: {
                    id: uuidv4(),
                    full_name: shipping_full_name,
                    email: `guest_${Date.now()}@guest.local`,
                    password: 'NO_PASSWORD',
                    token_user: shadowUserToken,
                    status: 'inactive',
                    role: role.id,
                },
            });

            const orderId = uuidv4();
            let subtotal = 0;
            const preparedItems = [];

            for (const item of cartItems) {
                const qty = parseInt(item.quantity, 10);
                if (isNaN(qty) || qty < 1 || qty > 100) {
                    throw new Error('Số lượng sản phẩm không hợp lệ (từ 1 đến 100)');
                }

                const variant = await tx.product_variants.findUnique({
                    where: { id: item.variant_id },
                    include: { products: true, colors: true },
                });

                if (!variant || variant.stock < qty) {
                    const prodName = variant?.products?.title || 'Sản phẩm';
                    throw new Error(`${prodName} đã hết hàng hoặc không đủ tồn kho (còn ${variant ? variant.stock : 0})`);
                }

                const realProduct = variant.products;
                const discountPercent = Number(realProduct?.discount) || 0;
                const basePrice = Number(realProduct?.price) || 0;
                const unitPrice = discountPercent > 0 ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice;

                subtotal += unitPrice * qty;

                preparedItems.push({
                    variant,
                    quantity: qty,
                    unitPrice,
                    size: item.size || variant.size || '',
                    color: item.color || variant.colors?.name || '',
                });
            }

            await tx.orders.create({
                data: {
                    id: orderId,
                    token_user: shadowUserToken,
                    payment_method: payment_method || 'cod',
                    status: 'pending',
                    subtotal,
                    shipping_fee: 0,
                    shipping_full_name,
                    shipping_phone: cleanShippingPhone,
                    shipping_line1: shipping_line1 || '',
                    shipping_city: shipping_city || '',
                },
            });

            for (const item of preparedItems) {
                const orderItemId = uuidv4();
                await tx.order_items.create({
                    data: {
                        id: orderItemId,
                        order_id: orderId,
                        product_id: item.variant.product_id,
                        variant_id: item.variant.id,
                        price: item.unitPrice,
                        quantity: item.quantity,
                        size: item.size,
                        color: item.color,
                    },
                });

                const updated = await tx.product_variants.updateMany({
                    where: { id: item.variant.id, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });

                if (updated.count === 0) {
                    throw new Error(`Sản phẩm "${item.variant.products.title}" không đủ tồn kho`);
                }

                await tx.inventory_movements.create({
                    data: {
                        id: uuidv4(),
                        product_id: item.variant.product_id,
                        variant_id: item.variant.id,
                        order_item_id: orderItemId,
                        delta: -item.quantity,
                        reason: 'sales',
                        ref_order_id: orderId,
                    },
                });
            }
        });

        res.status(201).json({ message: 'Đặt hàng nhanh thành công' });
    } catch (error) {
        logger.error('Lỗi Guest Checkout', { error: error.message });
        res.status(400).json({ error: error.message || 'Lỗi thanh toán' });
    }
};

module.exports = { getProducts, getProductBySlug, getCategories, getProductReviews, guestCheckout };

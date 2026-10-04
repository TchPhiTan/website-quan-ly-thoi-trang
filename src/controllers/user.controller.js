/**
 * CONTROLLER: User (Khách hàng đã đăng nhập)
 * - Giỏ hàng (xem, thêm, cập nhật, xóa, áp mã giảm giá)
 * - Đặt hàng (UC-KH07)
 * - Lịch sử đơn hàng
 * - Hồ sơ cá nhân
 * - Sổ địa chỉ
 * - Đánh giá sản phẩm
 * - Mã giảm giá của tôi
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../lib/prisma');
const logger = require('../config/logger');

// ==========================================
// GIỎ HÀNG
// ==========================================

// GET /user/cart — Lấy giỏ hàng
const getCart = async (req, res) => {
    try {
        const cart = await db.cart.findUnique({
            where: { token_user: req.user.token_user },
            include: {
                cart_items: {
                    include: {
                        products: { select: { id: true, title: true, slug: true, thumbnail: true } },
                        product_variants: { include: { colors: true } },
                    },
                },
                coupons: { select: { coupon_id: true, code: true, title: true, type: true, discount_value: true, min_order_value: true, end_date: true, status: true } },
            },
        });

        if (!cart) return res.status(404).json({ error: 'Không tìm thấy giỏ hàng' });
        res.json({ data: cart });
    } catch (error) {
        logger.error('Lỗi lấy giỏ hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /user/cart/items — Thêm vào giỏ hàng (UC-KH05)
const addToCart = async (req, res) => {
    try {
        const { product_id, variant_id, size, color, quantity = 1, price_unit } = req.body;

        const parsedQty = parseInt(quantity, 10);
        if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 100) {
            return res.status(400).json({ error: 'Số lượng không hợp lệ (cần từ 1 đến 100)' });
        }

        const variant = await db.product_variants.findUnique({
            where: { id: variant_id },
            include: { products: true },
        });
        if (!variant || variant.stock < parsedQty) {
            return res.status(400).json({ error: 'Sản phẩm không đủ tồn kho' });
        }

        // Lấy giá chuẩn từ database để chống can thiệp giá từ client
        const realProduct = variant.products;
        const discountPercent = Number(realProduct?.discount) || 0;
        const basePrice = Number(realProduct?.price) || Number(price_unit) || 0;
        const finalPriceUnit = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;

        const cart = await db.cart.findUnique({ where: { token_user: req.user.token_user } });
        if (!cart) return res.status(404).json({ error: 'Giỏ hàng không tồn tại' });

        const existingItem = await db.cart_items.findFirst({
            where: { cart_id: cart.id, variant_id },
        });

        if (existingItem) {
            if (variant.stock < existingItem.quantity + parsedQty) {
                return res.status(400).json({ error: `Số lượng vượt quá tồn kho (hiện còn ${variant.stock})` });
            }
            await db.cart_items.update({
                where: { id: existingItem.id },
                data: {
                    quantity: { increment: parsedQty },
                    price_unit: finalPriceUnit,
                },
            });
        } else {
            await db.cart_items.create({
                data: {
                    id: uuidv4(),
                    cart_id: cart.id,
                    product_id: variant.product_id || product_id,
                    variant_id,
                    size: size || variant.size || '',
                    color: color || variant.color || '',
                    price_unit: finalPriceUnit,
                    quantity: parsedQty,
                    line_discount: 0,
                },
            });
        }

        res.json({ message: 'Đã cập nhật giỏ hàng' });
    } catch (error) {
        logger.error('Lỗi thêm vào giỏ hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi giỏ hàng' });
    }
};

// PUT /user/cart/items/:id — Cập nhật số lượng
const updateCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const parsedQty = parseInt(quantity, 10);
        if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 100) {
            return res.status(400).json({ error: 'Số lượng phải từ 1 đến 100' });
        }

        const item = await db.cart_items.findUnique({ where: { id } });
        if (!item) return res.status(404).json({ error: 'Không tìm thấy sản phẩm trong giỏ' });

        const variant = await db.product_variants.findUnique({ where: { id: item.variant_id } });
        if (variant && variant.stock < parsedQty) {
            return res.status(400).json({ error: `Chỉ còn ${variant.stock} sản phẩm` });
        }

        await db.cart_items.update({ where: { id }, data: { quantity: parsedQty } });
        res.json({ message: 'Đã cập nhật số lượng' });
    } catch (error) {
        logger.error('Lỗi cập nhật giỏ hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// DELETE /user/cart/items/:id — Xóa sản phẩm khỏi giỏ
const removeCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        const cart = await db.cart.findUnique({ where: { token_user: req.user.token_user } });
        if (cart) {
            await db.cart_items.deleteMany({
                where: {
                    cart_id: cart.id,
                    OR: [
                        { id },
                        { variant_id: id },
                        { product_id: id },
                    ],
                },
            });
        }
        res.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
    } catch (error) {
        logger.error('Lỗi xóa sản phẩm giỏ hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /user/cart/coupon — Áp mã giảm giá vào giỏ
const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const normalizedCode = String(code || '').trim();
        if (!normalizedCode) {
            return res.status(400).json({ error: 'Vui lòng nhập mã giảm giá' });
        }
        const now = new Date();

        // Tìm coupon: thử tìm mã chính xác hoặc duyệt danh sách active (tránh lỗi Prisma sqlserver với mode: 'insensitive')
        let coupon = await db.coupons.findFirst({
            where: {
                code: normalizedCode,
            },
        });

        if (!coupon) {
            const allActive = await db.coupons.findMany({
                where: { status: 'ACTIVE' },
            });
            coupon = allActive.find(c => c.code.trim().toUpperCase() === normalizedCode.toUpperCase());
        }

        if (
            !coupon ||
            coupon.status !== 'ACTIVE' ||
            (coupon.start_date && coupon.start_date > now) ||
            (coupon.end_date && coupon.end_date < now) ||
            (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)
        ) {
            return res.status(400).json({ error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' });
        }

        // Ràng buộc nghiệp vụ: Mỗi khách hàng chỉ được dùng mã ưu đãi 1 lần
        const user = await db.users.findUnique({ where: { token_user: req.user.token_user } });
        if (user) {
            const usedBefore = await db.coupon_usages.findFirst({
                where: {
                    coupon_id: coupon.coupon_id,
                    user_id: user.id,
                },
            });
            if (usedBefore) {
                return res.status(400).json({
                    error: `Mã giảm giá ${coupon.code} chỉ được áp dụng 1 lần cho mỗi khách hàng.`,
                });
            }
        }

        let cart = await db.cart.findUnique({
            where: { token_user: req.user.token_user },
            include: { cart_items: true },
        });
        if (!cart) {
            cart = await db.cart.create({
                data: { id: uuidv4(), token_user: req.user.token_user },
                include: { cart_items: true },
            });
        }

        const cartSubtotal = cart.cart_items.reduce((total, item) => total + Number(item.price_unit) * item.quantity, 0);
        const clientSubtotal = Number(req.body.subtotal) || 0;
        const subtotal = Math.max(cartSubtotal, clientSubtotal);

        if (subtotal < Number(coupon.min_order_value)) {
            return res.status(400).json({
                error: `Đơn hàng cần từ ${Number(coupon.min_order_value).toLocaleString('vi-VN')}₫ để dùng mã này.`,
            });
        }

        await db.cart.update({
            where: { id: cart.id },
            data: { coupon_id: coupon.coupon_id },
        });

        res.json({
            message: 'Áp mã giảm giá thành công',
            coupon: {
                coupon_id: coupon.coupon_id,
                code: coupon.code,
                title: coupon.title,
                type: coupon.type,
                discount_value: coupon.discount_value,
                min_order_value: coupon.min_order_value,
                end_date: coupon.end_date,
                status: coupon.status,
            },
        });
    } catch (error) {
        logger.error('Lỗi áp mã giảm giá', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// DELETE /user/cart/coupon — Gỡ mã giảm giá
const removeCoupon = async (req, res) => {
    try {
        const cart = await db.cart.findUnique({ where: { token_user: req.user.token_user } });
        await db.cart.update({ where: { id: cart.id }, data: { coupon_id: null } });
        res.json({ message: 'Đã gỡ mã giảm giá' });
    } catch (error) {
        logger.error('Lỗi gỡ mã giảm giá', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// ĐẶT HÀNG
// ==========================================

// POST /user/checkout — Đặt hàng thành viên (UC-KH07)
const checkout = async (req, res) => {
    const { payment_method, shipping_full_name, shipping_phone, shipping_city, shipping_line1, coupon_id } = req.body;
    const token_user = req.user.token_user;

    const cleanShippingPhone = shipping_phone ? String(shipping_phone).replace(/\s/g, '') : null;
    if (cleanShippingPhone && !/^0\d{9}$/.test(cleanShippingPhone)) {
        return res.status(400).json({ error: 'Số điện thoại nhận hàng không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
    }

    let newOrderId = uuidv4();
    try {
        await db.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({
                where: { token_user },
                include: { cart_items: true },
            });
            if (!cart || cart.cart_items.length === 0) throw new Error('Giỏ hàng trống');

            let subtotal = 0;
            let discount_total = 0;

            for (const item of cart.cart_items) {
                const variant = await tx.product_variants.findUnique({
                    where: { id: item.variant_id },
                    include: { products: true },
                });
                if (!variant || variant.stock < item.quantity) {
                    const prodName = variant?.products?.title || 'Sản phẩm';
                    throw new Error(`Sản phẩm "${prodName}" không đủ tồn kho (còn ${variant ? variant.stock : 0})`);
                }
                const realProduct = variant.products;
                const discountPercent = Number(realProduct?.discount) || 0;
                const basePrice = Number(realProduct?.price) || 0;
                const unitPrice = discountPercent > 0 ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice;
                item.price_unit = unitPrice;
                subtotal += unitPrice * item.quantity;
            }

            let appliedCoupon = null;
            if (coupon_id) {
                const cleanCouponParam = String(coupon_id).trim();
                const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCouponParam);
                if (isValidUuid) {
                    appliedCoupon = await tx.coupons.findFirst({
                        where: {
                            OR: [{ coupon_id: cleanCouponParam }, { code: cleanCouponParam }],
                        },
                    });
                } else {
                    appliedCoupon = await tx.coupons.findFirst({
                        where: {
                            code: cleanCouponParam,
                        },
                    });
                }

                if (!appliedCoupon) {
                    const allActive = await tx.coupons.findMany({
                        where: { status: 'ACTIVE' },
                    });
                    appliedCoupon = allActive.find(
                        c => (isValidUuid && c.coupon_id === cleanCouponParam) || c.code.trim().toUpperCase() === cleanCouponParam.toUpperCase()
                    );
                }

                const now = new Date();
                if (
                    !appliedCoupon ||
                    appliedCoupon.status !== 'ACTIVE' ||
                    (appliedCoupon.start_date && appliedCoupon.start_date > now) ||
                    (appliedCoupon.end_date && appliedCoupon.end_date < now) ||
                    (appliedCoupon.usage_limit && appliedCoupon.used_count >= appliedCoupon.usage_limit) ||
                    Number(subtotal) < Number(appliedCoupon.min_order_value)
                ) {
                    throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn');
                }

                // Ràng buộc nghiệp vụ: Mỗi khách hàng chỉ được dùng mã ưu đãi 1 lần
                const user = await tx.users.findUnique({ where: { token_user } });
                if (user) {
                    const usedBefore = await tx.coupon_usages.findFirst({
                        where: {
                            coupon_id: appliedCoupon.coupon_id,
                            user_id: user.id,
                        },
                    });
                    if (usedBefore) {
                        throw new Error(`Mã giảm giá ${appliedCoupon.code} chỉ được áp dụng 1 lần cho mỗi khách hàng.`);
                    }
                }

                discount_total =
                    appliedCoupon.type === 'AMOUNT'
                        ? Number(appliedCoupon.discount_value)
                        : (subtotal * Number(appliedCoupon.discount_value)) / 100;
                if (appliedCoupon.max_discount && discount_total > Number(appliedCoupon.max_discount)) {
                    discount_total = Number(appliedCoupon.max_discount);
                }
                await tx.coupons.update({
                    where: { coupon_id: appliedCoupon.coupon_id },
                    data: { used_count: { increment: 1 } },
                });
            }

            await tx.orders.create({
                data: {
                    id: newOrderId,
                    token_user,
                    payment_method,
                    coupon_id: appliedCoupon ? appliedCoupon.coupon_id : null,
                    subtotal,
                    discount_total,
                    shipping_fee: 0,
                    shipping_full_name,
                    shipping_phone,
                    shipping_line1,
                    shipping_city,
                    status: 'pending',
                },
            });

            if (appliedCoupon) {
                const user = await tx.users.findUnique({ where: { token_user } });
                await tx.coupon_usages.create({
                    data: {
                        usage_id: uuidv4(),
                        coupon_id: appliedCoupon.coupon_id,
                        order_id: newOrderId,
                        user_id: user.id,
                    },
                });
            }

            for (const item of cart.cart_items) {
                const orderItemId = uuidv4();
                await tx.order_items.create({
                    data: {
                        id: orderItemId,
                        order_id: newOrderId,
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        price: item.price_unit,
                        quantity: item.quantity,
                        size: item.size || '',
                        color: item.color || '',
                    },
                });

                const updated = await tx.product_variants.updateMany({
                    where: { id: item.variant_id, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });
                if (updated.count === 0) throw new Error(`Sản phẩm không đủ tồn kho`);

                await tx.inventory_movements.create({
                    data: {
                        id: uuidv4(),
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        order_item_id: orderItemId,
                        delta: -item.quantity,
                        reason: 'sales',
                        ref_order_id: newOrderId,
                    },
                });
            }

            await tx.cart_items.deleteMany({ where: { cart_id: cart.id } });
            await tx.cart.update({
                where: { id: cart.id },
                data: { coupon_id: null, grand_total: 0 },
            });
        });

        res.status(201).json({ message: 'Đặt hàng thành công', order_id: newOrderId });
    } catch (error) {
        logger.error('Rollback Checkout', { user: token_user, error: error.message });
        res.status(400).json({ error: error.message || 'Lỗi thanh toán' });
    }
};

// ==========================================
// ĐƠN HÀNG
// ==========================================

// GET /user/orders — Lịch sử đơn hàng
const getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {
            token_user: req.user.token_user,
            ...(status && { status }),
        };

        const [orders, total] = await Promise.all([
            db.orders.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { created_at: 'desc' },
                include: {
                    order_items: {
                        include: {
                            products: { select: { title: true, slug: true, thumbnail: true } },
                        },
                    },
                    coupons: { select: { code: true, title: true } },
                },
            }),
            db.orders.count({ where }),
        ]);

        res.json({
            data: orders,
            pagination: { page: Number(page), limit: Number(limit), total },
        });
    } catch (error) {
        logger.error('Lỗi lấy lịch sử đơn hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /user/orders/:id — Chi tiết đơn hàng
const getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await db.orders.findFirst({
            where: { id, token_user: req.user.token_user },
            include: {
                order_items: {
                    include: {
                        products: { select: { title: true, slug: true, thumbnail: true } },
                        product_variants: { include: { colors: true } },
                        product_reviews: { select: { id: true, rating: true, content: true } },
                    },
                },
                coupons: { select: { code: true, title: true } },
            },
        });

        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        res.json({ data: order });
    } catch (error) {
        logger.error('Lỗi lấy chi tiết đơn hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /user/orders/:id/cancel — Hủy đơn hàng (chỉ khi pending) và hoàn kho, hoàn voucher
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const token_user = req.user.token_user;

        await db.$transaction(async (tx) => {
            const order = await tx.orders.findFirst({
                where: { id, token_user },
                include: { order_items: true },
            });

            if (!order) {
                const err = new Error('Không tìm thấy đơn hàng');
                err.status = 404;
                throw err;
            }
            if (order.status !== 'pending') {
                const err = new Error('Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận"');
                err.status = 400;
                throw err;
            }

            // 1. Cập nhật trạng thái đơn thành cancelled
            await tx.orders.update({
                where: { id },
                data: { status: 'cancelled' },
            });

            // 2. Hoàn lại tồn kho cho từng sản phẩm và ghi nhận inventory_movements
            for (const item of order.order_items) {
                if (item.variant_id) {
                    await tx.product_variants.update({
                        where: { id: item.variant_id },
                        data: { stock: { increment: item.quantity } },
                    });

                    await tx.inventory_movements.create({
                        data: {
                            id: uuidv4(),
                            product_id: item.product_id,
                            variant_id: item.variant_id,
                            order_item_id: item.id,
                            delta: item.quantity,
                            reason: 'cancelled',
                            ref_order_id: id,
                        },
                    });
                }
            }

            // 3. Hoàn lại số lượt sử dụng voucher nếu đơn hàng có áp dụng
            if (order.coupon_id) {
                await tx.coupons.update({
                    where: { coupon_id: order.coupon_id },
                    data: { used_count: { decrement: 1 } },
                });
                await tx.coupon_usages.deleteMany({
                    where: { order_id: id },
                });
            }
        });

        res.json({ message: 'Đã hủy đơn hàng thành công, tồn kho và voucher đã được hoàn trả.' });
    } catch (error) {
        logger.error('Lỗi hủy đơn hàng', { error: error.message });
        res.status(error.status || 500).json({ error: error.message || 'Lỗi hệ thống' });
    }
};

// ==========================================
// HỒ SƠ CÁ NHÂN
// ==========================================

// GET /user/profile — Xem hồ sơ
const getProfile = async (req, res) => {
    try {
        const user = await db.users.findUnique({
            where: { token_user: req.user.token_user },
            select: {
                id: true, full_name: true, email: true, phone: true,
                avatar: true, gender: true, dob: true, height_cm: true,
                weight_kg: true, created_at: true,
            },
        });
        res.json({ data: user });
    } catch (error) {
        logger.error('Lỗi lấy hồ sơ', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /user/profile — Cập nhật hồ sơ
const updateProfile = async (req, res) => {
    try {
        const { full_name, phone, gender, dob, height_cm, weight_kg, avatar } = req.body;

        const cleanPhone = phone !== undefined && phone !== null && phone !== '' ? String(phone).replace(/\s/g, '') : null;
        if (cleanPhone && !/^0\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({ error: 'Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
        }

        await db.users.update({
            where: { token_user: req.user.token_user },
            data: {
                ...(full_name && { full_name }),
                ...(phone !== undefined && { phone: cleanPhone }),
                ...(gender !== undefined && { gender }),
                ...(dob !== undefined && { dob: dob ? new Date(dob) : null }),
                ...(height_cm !== undefined && { height_cm: Number(height_cm) }),
                ...(weight_kg !== undefined && { weight_kg: Number(weight_kg) }),
                ...(avatar !== undefined && { avatar }),
            },
        });

        res.json({ message: 'Cập nhật hồ sơ thành công' });
    } catch (error) {
        logger.error('Lỗi cập nhật hồ sơ', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /user/profile/password — Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        if (!old_password || !new_password) {
            return res.status(400).json({ error: 'Vui lòng nhập đủ mật khẩu cũ và mới' });
        }

        const user = await db.users.findUnique({ where: { token_user: req.user.token_user } });
        const match = await bcrypt.compare(old_password, user.password);
        if (!match) return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });

        const hashed = await bcrypt.hash(new_password, 10);
        await db.users.update({ where: { id: user.id }, data: { password: hashed } });

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        logger.error('Lỗi đổi mật khẩu', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// SỔ ĐỊA CHỈ
// ==========================================

// GET /user/addresses — Lấy danh sách địa chỉ
const getAddresses = async (req, res) => {
    try {
        const addresses = await db.addresses.findMany({
            where: { token_user: req.user.token_user },
            orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
        });
        res.json({ data: addresses });
    } catch (error) {
        logger.error('Lỗi lấy địa chỉ', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// POST /user/addresses — Thêm địa chỉ mới
const createAddress = async (req, res) => {
    try {
        const { full_name, phone, city, district, ward, line1, is_default = false } = req.body;

        const cleanPhone = phone ? String(phone).replace(/\s/g, '') : null;
        if (cleanPhone && !/^0\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({ error: 'Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
        }

        await db.$transaction(async (tx) => {
            if (is_default) {
                await tx.addresses.updateMany({
                    where: { token_user: req.user.token_user },
                    data: { is_default: false },
                });
            }
            await tx.addresses.create({
                data: {
                    id: uuidv4(),
                    token_user: req.user.token_user,
                    full_name, phone: cleanPhone, city, district, ward, line1,
                    is_default: Boolean(is_default),
                },
            });
        });

        res.status(201).json({ message: 'Đã thêm địa chỉ mới' });
    } catch (error) {
        logger.error('Lỗi thêm địa chỉ', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// PUT /user/addresses/:id — Cập nhật địa chỉ
const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, city, district, ward, line1, is_default } = req.body;

        const cleanPhone = phone !== undefined && phone !== null && phone !== '' ? String(phone).replace(/\s/g, '') : null;
        if (cleanPhone && !/^0\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({ error: 'Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
        }

        await db.$transaction(async (tx) => {
            if (is_default) {
                await tx.addresses.updateMany({
                    where: { token_user: req.user.token_user },
                    data: { is_default: false },
                });
            }
            await tx.addresses.update({
                where: { id },
                data: {
                    ...(full_name && { full_name }),
                    ...(phone !== undefined && { phone: cleanPhone }),
                    ...(city && { city }),
                    ...(district !== undefined && { district }),
                    ...(ward !== undefined && { ward }),
                    ...(line1 && { line1 }),
                    ...(is_default !== undefined && { is_default: Boolean(is_default) }),
                },
            });
        });

        res.json({ message: 'Đã cập nhật địa chỉ' });
    } catch (error) {
        logger.error('Lỗi cập nhật địa chỉ', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// DELETE /user/addresses/:id — Xóa địa chỉ
const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await db.addresses.delete({ where: { id } });
        res.json({ message: 'Đã xóa địa chỉ' });
    } catch (error) {
        logger.error('Lỗi xóa địa chỉ', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// ==========================================
// ĐÁNH GIÁ SẢN PHẨM
// ==========================================

// POST /user/reviews — Gửi đánh giá sản phẩm
const createReview = async (req, res) => {
    try {
        const { order_item_id, rating, content } = req.body;

        if (!order_item_id || !rating) {
            return res.status(400).json({ error: 'Thiếu thông tin đánh giá' });
        }

        // Kiểm tra order_item thuộc về user này
        const orderItem = await db.order_items.findFirst({
            where: {
                id: order_item_id,
                orders: { token_user: req.user.token_user, status: 'completed' },
            },
        });
        if (!orderItem) {
            return res.status(403).json({ error: 'Không thể đánh giá sản phẩm này' });
        }

        const existing = await db.product_reviews.findUnique({ where: { order_item_id } });
        if (existing) {
            return res.status(409).json({ error: 'Bạn đã đánh giá sản phẩm này rồi' });
        }

        await db.$transaction(async (tx) => {
            await tx.product_reviews.create({
                data: {
                    id: uuidv4(),
                    order_item_id,
                    token_user: req.user.token_user,
                    rating: Number(rating),
                    content: content || null,
                },
            });

            // Cập nhật rating_avg và rating_count của sản phẩm
            const reviews = await tx.product_reviews.findMany({
                where: { order_items: { product_id: orderItem.product_id } },
                select: { rating: true },
            });
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            await tx.products.update({
                where: { id: orderItem.product_id },
                data: { rating_avg: avg, rating_count: reviews.length },
            });
        });

        res.status(201).json({ message: 'Đánh giá đã được gửi' });
    } catch (error) {
        logger.error('Lỗi gửi đánh giá', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// GET /user/reviews — Danh sách đánh giá của tôi
const getMyReviews = async (req, res) => {
    try {
        const reviews = await db.product_reviews.findMany({
            where: { token_user: req.user.token_user },
            orderBy: { created_at: 'desc' },
            include: {
                order_items: {
                    include: { products: { select: { title: true, slug: true, thumbnail: true } } },
                },
                review_replies: true,
            },
        });
        res.json({ data: reviews });
    } catch (error) {
        logger.error('Lỗi lấy đánh giá', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

module.exports = {
    getCart, addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon,
    checkout,
    getMyOrders, getOrderDetail, cancelOrder,
    getProfile, updateProfile, changePassword,
    getAddresses, createAddress, updateAddress, deleteAddress,
    createReview, getMyReviews,
};

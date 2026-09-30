/**
 * TÊN FILE: api.js
 * MÔ TẢ: Master Router API chuẩn hóa cho SQL Server ShopDB
 * TÁC GIẢ: Cố vấn Phần mềm (Senior Software Engineer)
 */

const express = require('express');
const bcrypt = require('bcrypt');
const winston = require('winston');
const Mailjet = require('node-mailjet');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const router = express.Router();

// ==========================================
// 1. CẤU HÌNH LOGGER & MAILJET
// ==========================================

// Ghi toàn bộ lỗi hệ thống vào file error.log theo yêu cầu
const logger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log' }),
        new winston.transports.Console() 
    ],
});

// Khởi tạo Mailjet (Cho UC-NV04)
const mailjet = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY || 'your-api-key',
    apiSecret: process.env.MAILJET_API_SECRET || 'your-api-secret'
});

// ==========================================
// 2. MIDDLEWARE XÁC THỰC (SESSION - KHÔNG DÙNG JWT)
// ==========================================

router.use(session({
    secret: process.env.SESSION_SECRET || 'sql-server-shopdb-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    }
}));

const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.token_user) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
    }
    req.user = req.session; 
    next();
};

const requireRole = (role_name) => async (req, res, next) => {
    // Ktra role. Trong DB, role lưu dưới dạng UUID. 
    // Ta đối chiếu tên role thông qua req.session.role_name đã lưu lúc đăng nhập.
    if (req.user.role_name !== role_name && req.user.role_name !== 'admin') {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    next();
};

// ==========================================
// 3. PHÂN HỆ KHÁCH VÃNG LAI & AUTHENTICATION
// ==========================================

// UC-KH01: Đăng ký
router.post('/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user_uuid = uuidv4();
        const token_user = uuidv4();

        await db.$transaction(async (tx) => {
            // Lấy ID của role 'user'
            const role = await tx.roles.findOne({ name: 'user' });

            // Tạo user
            await tx.users.create({
                id: user_uuid,
                token_user: token_user,
                email,
                password: hashedPassword,
                full_name,
                phone,
                role: role.id
            });

            // UC-KH05 (Tiền điều kiện): Tạo sẵn Cart trống rỗng cho User (grand_total là PERSISTED/DEFAULT)
            await tx.cart.create({
                id: uuidv4(),
                token_user: token_user
            });
        });

        res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (error) {
        logger.error('Lỗi đăng ký', { context: 'POST /auth/register', error: error.message });
        res.status(500).json({ error: 'Đăng ký thất bại' });
    }
});

// UC-KH02: Đăng nhập
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.users.findOne({ email }, { include: { roles: true } }); // Join bảng roles để lấy tên

        if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Sai email/mật khẩu hoặc tài khoản bị khóa' });
        }

        // Lưu session
        req.session.token_user = user.token_user;
        req.session.role_name = user.roles.name; 

        res.json({ message: 'Đăng nhập thành công' });
    } catch (error) {
        logger.error('Lỗi đăng nhập', { error: error.message });
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

// UC-KH03: Đăng xuất
router.post('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Đã đăng xuất' });
});

// LƯU Ý UC-KVL02: Khách vãng lai quản lý giỏ hàng tạm qua localstorage (Không cần API).

// UC-KVL03: Đặt hàng nhanh cho khách vãng lai
router.post('/public/checkout', async (req, res) => {
    try {
        const { cartItems, shipping_full_name, shipping_phone, shipping_city, shipping_line1, payment_method } = req.body;
        
        await db.$transaction(async (tx) => {
            // DB Ràng buộc: orders.token_user NOT NULL REFERENCES users. 
            // Giải pháp: Tạo một tài khoản "Khách vãng lai" ảo (shadow user) để thỏa mãn FK.
            const shadowUserToken = uuidv4();
            const role = await tx.roles.findOne({ name: 'user' });
            
            await tx.users.create({
                id: uuidv4(),
                full_name: shipping_full_name,
                email: `guest_${Date.now()}@guest.local`, // Email ảo
                password: 'NO_PASSWORD',
                token_user: shadowUserToken,
                status: 'inactive', // Đánh dấu là guest/inactive
                role: role.id
            });

            const orderId = uuidv4();
            // LƯU Ý KỸ THUẬT: KHÔNG insert grand_total vì nó là cột PERSISTED trong SQL Server
            let subtotal = 0;

            for (const item of cartItems) {
                const variant = await tx.product_variants.findOne({ id: item.variant_id });
                if (variant.stock < item.quantity) throw new Error(`Sản phẩm hết hàng`);
                subtotal += (item.price * item.quantity);
            }

            await tx.orders.create({
                id: orderId,
                token_user: shadowUserToken,
                payment_method,
                status: 'pending',
                subtotal: subtotal, 
                shipping_fee: 0,
                shipping_full_name, shipping_phone, shipping_line1, shipping_city
            });

            // Tạo order_items và trừ kho (Tương tự UC-KH07)
            for (const item of cartItems) {
                const orderItemId = uuidv4();
                // SQL Server: KHÔNG insert line_total vì tính tự động
                await tx.order_items.create({
                    id: orderItemId,
                    order_id: orderId,
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    price: item.price,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color
                });

                // Cập nhật nguyên tử (Atomic Update) tránh Overselling
                const updated = await tx.product_variants.update({
                    where: { id: item.variant_id, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } }
                });
                if(!updated) throw new Error('Hết hàng trong lúc thanh toán');

                await tx.inventory_movements.create({
                    id: uuidv4(),
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    order_item_id: orderItemId,
                    delta: -item.quantity,
                    reason: 'sales',
                    ref_order_id: orderId
                });
            }
        });
        res.status(201).json({ message: 'Đặt hàng nhanh thành công' });
    } catch (error) {
        logger.error('Lỗi Guest Checkout', { error: error.message });
        res.status(400).json({ error: error.message || 'Lỗi thanh toán' });
    }
});

// ==========================================
// 4. PHÂN HỆ KHÁCH HÀNG (CUSTOMER API)
// ==========================================

// UC-KH05: Thêm vào giỏ hàng
router.post('/user/cart/items', requireAuth, async (req, res) => {
    try {
        const { product_id, variant_id, size, color, quantity, price_unit } = req.body;
        const cart = await db.cart.findOne({ token_user: req.user.token_user });
        
        const variant = await db.product_variants.findOne({ id: variant_id });
        if (variant.stock < quantity) return res.status(400).json({ error: 'Không đủ tồn kho' });

        // SQL Server CONSTRAINT: UNIQUE (cart_id, variant_id) - Nếu trùng phải Update, ko được Create
        const existingItem = await db.cart_items.findOne({ cart_id: cart.id, variant_id });
        
        if (existingItem) {
            await db.cart_items.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity } // line_subtotal tự tính trong SQL
            });
        } else {
            await db.cart_items.create({
                id: uuidv4(),
                cart_id: cart.id,
                product_id,
                variant_id,
                size, color, price_unit, quantity,
                line_discount: 0 // line_total tự tính
            });
        }
        res.json({ message: 'Đã cập nhật giỏ hàng' });
    } catch (error) {
        logger.error('Lỗi giỏ hàng', { error: error.message });
        res.status(500).json({ error: 'Lỗi giỏ hàng' });
    }
});

// UC-KH07: Đặt hàng thành viên (TRANSACTION CHUẨN MỰC)
router.post('/user/checkout', requireAuth, async (req, res) => {
    const { payment_method, shipping_full_name, shipping_phone, shipping_city, shipping_line1, coupon_id } = req.body;
    const token_user = req.user.token_user;

    try {
        // Mọi tác vụ trong db.$transaction sẽ tự động Rollback nếu ném ra (throw) Error
        await db.$transaction(async (tx) => {
            const cart = await tx.cart.findOne({ token_user });
            const cartItems = await tx.cart_items.findMany({ cart_id: cart.id });
            if (cartItems.length === 0) throw new Error('Giỏ hàng trống');

            let subtotal = 0;
            let discount_total = 0;

            // Xử lý logic tính tiền 
            for (const item of cartItems) {
                subtotal += (item.price_unit * item.quantity);
            }

            if (coupon_id) {
                const coupon = await tx.coupons.findOne({ coupon_id });
                // Check đk mã
                if (!coupon || coupon.status !== 'ACTIVE' || coupon.used_count >= coupon.usage_limit || subtotal < coupon.min_order_value) {
                    throw new Error('Mã giảm giá không hợp lệ hoặc đã hết hạn');
                }
                discount_total = coupon.type === 'AMOUNT' ? coupon.discount_value : (subtotal * coupon.discount_value / 100);
                if (coupon.max_discount && discount_total > coupon.max_discount) discount_total = coupon.max_discount;
                
                // Cập nhật số lần dùng
                await tx.coupons.update({ where: { coupon_id }, data: { used_count: { increment: 1 } } });
            }

            const newOrder = await tx.orders.create({
                id: uuidv4(),
                token_user, payment_method, coupon_id,
                subtotal, discount_total, shipping_fee: cart.shipping_fee, // grand_total PERSISTED
                shipping_full_name, shipping_phone, shipping_line1, shipping_city,
                status: 'pending'
            });

            if (coupon_id) {
                const user = await tx.users.findOne({ token_user });
                await tx.coupon_usages.create({
                    usage_id: uuidv4(), coupon_id, order_id: newOrder.id, user_id: user.id
                });
            }

            for (const item of cartItems) {
                const orderItemId = uuidv4();
                await tx.order_items.create({
                    id: orderItemId, order_id: newOrder.id, product_id: item.product_id, variant_id: item.variant_id,
                    price: item.price_unit, quantity: item.quantity, size: item.size, color: item.color
                });

                // Atomic Check & Update kho
                const variantUpdated = await tx.product_variants.update({
                    where: { id: item.variant_id, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } }
                });
                if (!variantUpdated) throw new Error(`Sản phẩm variant_id ${item.variant_id} không đủ tồn kho`);

                await tx.inventory_movements.create({
                    id: uuidv4(), product_id: item.product_id, variant_id: item.variant_id,
                    order_item_id: orderItemId, delta: -item.quantity, reason: 'sales', ref_order_id: newOrder.id
                });
            }

            await tx.cart_items.deleteMany({ cart_id: cart.id });
            await tx.cart.update({ where: { id: cart.id }, data: { coupon_id: null, grand_total: 0 }});
        });

        res.status(201).json({ message: 'Đặt hàng thành công' });
    } catch (error) {
        logger.error('Rollback Checkout', { user: token_user, error: error.message });
        res.status(400).json({ error: error.message || 'Lỗi thanh toán' });
    }
});

// ==========================================
// 5. PHÂN HỆ NHÂN VIÊN (STAFF)
// ==========================================

// UC-NV04: Gửi Mailjet
router.post('/staff/orders/:id/notify', requireAuth, requireRole('staff'), async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status_message } = req.body;

        // 1. Query trực tiếp từ DB để lấy email chuẩn thay vì tin tưởng req.body
        const order = await db.orders.findOne({ id: orderId });
        if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

        // 2. Lấy user liên kết với đơn hàng để lấy email
        const user = await db.users.findOne({ token_user: order.token_user });
        const target_email = user.email;

        // 3. Gửi qua Mailjet với Email From đã được Verify
        await mailjet.post("send", { 'version': 'v3.1' }).request({
            Messages: [{
                From: { 
                    Email: "cskh@ten-website-cua-ban.com", // ALO ALO ALO THAY BANG GMAIL MAILJET REAL ALO ALO ALO
                    Name: "X-Mate Fashion" 
                },
                To: [{ Email: target_email, Name: user.full_name }],
                Subject: `Cập nhật trạng thái đơn hàng #${orderId}`,
                HTMLPart: `<h3>Xin chào ${user.full_name},</h3><p>Đơn hàng của bạn: <strong>${status_message}</strong>.</p>`
            }]
        });
        
        res.json({ message: 'Đã gửi thông báo thành công' });
    } catch (error) {
        logger.error('Lỗi Mailjet', { orderId: req.params.id, error: error.message });
        res.status(500).json({ error: 'Không thể gửi email' });
    }
});

// UC-NV07: Đổi trả (Tạo movement kho dương 'returns')
router.post('/staff/orders/:id/rma', requireAuth, requireRole('staff'), async (req, res) => {
    try {
        const { order_item_id, variant_id, product_id, quantity } = req.body;
        const orderId = req.params.id;

        await db.$transaction(async (tx) => {
            await tx.orders.update({ where: { id: orderId }, data: { status: 'returned' } });
            await tx.product_variants.update({ where: { id: variant_id }, data: { stock: { increment: quantity } } });
            await tx.inventory_movements.create({
                id: uuidv4(), product_id, variant_id, order_item_id,
                delta: quantity, reason: 'returns', ref_order_id: orderId
            });
        });
        res.json({ message: 'Đã xử lý đổi/trả và nhập lại kho' });
    } catch (error) {
        logger.error('Lỗi Đổi trả', { error: error.message });
        res.status(500).json({ error: 'Lỗi xử lý' });
    }
});

module.exports = router;
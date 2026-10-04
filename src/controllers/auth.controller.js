/**
 * CONTROLLER: Authentication
 * UC-KH01: Đăng ký
 * UC-KH02: Đăng nhập
 * UC-KH03: Đăng xuất
 * UC-KH04: Lấy thông tin phiên hiện tại
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../lib/prisma');
const { isTransientDatabaseError } = require('../lib/prisma');
const logger = require('../config/logger');

// UC-KH01: Đăng ký
const register = async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Email, mật khẩu và họ tên là bắt buộc' });
        }

        const cleanPhone = phone ? String(phone).replace(/\s/g, '') : null;
        if (cleanPhone && !/^0\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({ error: 'Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)' });
        }

        const existing = await db.users.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Email đã được sử dụng' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user_uuid = uuidv4();
        const token_user = uuidv4();

        await db.$transaction(async (tx) => {
            const role = await tx.roles.findFirst({ where: { name: 'user' } });
            if (!role) throw new Error('Role "user" chưa được khởi tạo trong DB');

            await tx.users.create({
                data: {
                    id: user_uuid,
                    token_user,
                    email,
                    password: hashedPassword,
                    full_name,
                    phone: phone || null,
                    role: role.id,
                },
            });

            await tx.cart.create({
                data: { id: uuidv4(), token_user },
            });
        });

        res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (error) {
        logger.error('Lỗi đăng ký', { context: 'POST /auth/register', error: error.message });
        res.status(500).json({ error: 'Đăng ký thất bại' });
    }
};

// UC-KH02: Đăng nhập
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
        }

        const user = await db.users.findUnique({
            where: { email },
            include: { roles: true },
        });

        if (!user || user.status !== 'active') {
            return res.status(401).json({ error: 'Sai email/mật khẩu hoặc tài khoản bị khóa' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Sai email/mật khẩu hoặc tài khoản bị khóa' });
        }

        req.session.token_user = user.token_user;
        req.session.user_id = user.id;
        req.session.email = user.email;
        req.session.role_name = user.roles.name;
        req.session.full_name = user.full_name;

        res.json({
            message: 'Đăng nhập thành công',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.roles.name,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        logger.error('Lỗi đăng nhập', { error: error.message });
        if (isTransientDatabaseError(error)) {
            return res.status(503).json({ error: 'Dịch vụ cơ sở dữ liệu đang tạm thời không khả dụng. Vui lòng thử lại sau.' });
        }
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
};

// UC-KH03: Đăng xuất
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Không thể đăng xuất' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Đã đăng xuất' });
    });
};

// UC-KH04: Lấy thông tin phiên hiện tại (kiểm tra đang login chưa)
const me = (req, res) => {
    if (!req.session || !req.session.token_user) {
        return res.status(401).json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        user: {
            id: req.session.user_id,
            email: req.session.email,
            full_name: req.session.full_name,
            role: req.session.role_name,
        },
    });
};

module.exports = { register, login, logout, me };

/**
 * APP.JS — Cấu hình Express App
 * Tách riêng khỏi server.js để dễ test
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const authRoutes   = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const userRoutes   = require('./routes/user.routes');
const staffRoutes  = require('./routes/staff.routes');
const adminRoutes  = require('./routes/admin.routes');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Cần thiết khi deploy phía sau Reverse Proxy (Railway, Render, Heroku) để nhận diện đúng HTTPS
app.set('trust proxy', 1);

// ==========================================
// MIDDLEWARE CORE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, '../moc-store/src/assets')));

// Chuẩn hóa danh sách origin cho phép từ FRONTEND_URL (hỗ trợ phân tách bằng dấu phẩy)
const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const isOriginAllowed = (origin) => {
    // Cho phép request không có origin (server-to-server, mobile app, curl, healthcheck)
    if (!origin) return true;

    // Nếu cấu hình wildcard '*' hoặc chưa set FRONTEND_URL ở môi trường dev
    if (process.env.FRONTEND_URL === '*' || (!isProduction && configuredOrigins.length === 0)) {
        return true;
    }

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Cho phép domain cấu hình trong FRONTEND_URL
    if (configuredOrigins.includes(cleanOrigin)) return true;

    // Tự động cho phép mọi domain Vercel (*.vercel.app)
    if (/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/i.test(cleanOrigin)) {
        return true;
    }

    // Cho phép localhost và 127.0.0.1 ở mọi cổng khi dev/test
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
        return true;
    }

    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            // Trả về origin cụ thể để hỗ trợ credentials: true
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'shopdb-default-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: isProduction,
        // Khi deploy tách rời Frontend (Vercel) và Backend (Railway), bắt buộc sameSite: 'none'
        sameSite: isProduction ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    },
}));

// ==========================================
// ROUTES (hỗ trợ cả /api và /api/v1)
// ==========================================
['/api', '/api/v1'].forEach((prefix) => {
    app.use(`${prefix}/auth`,   authRoutes);
    app.use(`${prefix}/public`, publicRoutes);
    app.use(`${prefix}/user`,   userRoutes);
    app.use(`${prefix}/staff`,  staffRoutes);
    app.use(`${prefix}/admin`,  adminRoutes);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} không tồn tại` });
});

// Global error handler
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
});

module.exports = app;

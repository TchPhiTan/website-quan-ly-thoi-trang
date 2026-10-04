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

// ==========================================
// MIDDLEWARE CORE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, '../moc-store/src/assets')));

const allowedOrigins = new Set([
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin không được phép'));
    },
    credentials: true,
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'shopdb-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
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

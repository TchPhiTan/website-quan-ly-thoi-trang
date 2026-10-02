/**
 * MIDDLEWARE: Xác thực và phân quyền
 */

// Kiểm tra đăng nhập qua session
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.token_user) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
    }
    req.user = req.session;
    next();
};

// Kiểm tra quyền theo role_name
// Có thể truyền 1 role hoặc nhiều role: requireRole('admin') hoặc requireRole(['admin','staff'])
const requireRole = (roles) => (req, res, next) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(req.user.role_name) && req.user.role_name !== 'admin') {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    next();
};

module.exports = { requireAuth, requireRole };

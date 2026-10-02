const { Router } = require('express');
const { register, login, logout, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/register', register);  // UC-KH01: Đăng ký
router.post('/login', login);        // UC-KH02: Đăng nhập
router.post('/logout', logout);      // UC-KH03: Đăng xuất
router.get('/me', me);               // Kiểm tra session

module.exports = router;

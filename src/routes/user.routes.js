const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const {
    getCart, addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon,
    checkout,
    getMyOrders, getOrderDetail, cancelOrder,
    getProfile, updateProfile, changePassword,
    getAddresses, createAddress, updateAddress, deleteAddress,
    createReview, getMyReviews,
} = require('../controllers/user.controller');

const router = Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(requireAuth);

// Giỏ hàng
router.get('/cart', getCart);
router.post('/cart/items', addToCart);
router.put('/cart/items/:id', updateCartItem);
router.delete('/cart/items/:id', removeCartItem);
router.post('/cart/coupon', applyCoupon);
router.delete('/cart/coupon', removeCoupon);

// Đặt hàng (UC-KH07)
router.post('/checkout', checkout);

// Đơn hàng
router.get('/orders', getMyOrders);
router.get('/orders/:id', getOrderDetail);
router.post('/orders/:id/cancel', cancelOrder);

// Hồ sơ cá nhân
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/password', changePassword);

// Sổ địa chỉ
router.get('/addresses', getAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

// Đánh giá sản phẩm
router.post('/reviews', createReview);
router.get('/reviews', getMyReviews);

module.exports = router;

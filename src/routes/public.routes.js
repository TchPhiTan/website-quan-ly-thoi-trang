const { Router } = require('express');
const {
    getProducts, getProductBySlug, getCategories,
    getProductReviews, guestCheckout, getPublicCoupons,
} = require('../controllers/public.controller');

const router = Router();

router.get('/products', getProducts);                          // Danh sách sản phẩm (lọc, phân trang)
router.get('/products/:slug', getProductBySlug);              // Chi tiết sản phẩm
router.get('/products/:slug/reviews', getProductReviews);     // Đánh giá sản phẩm
router.get('/categories', getCategories);                     // Danh sách danh mục
router.get('/coupons', getPublicCoupons);                      // Danh sách mã ưu đãi công khai
router.post('/checkout', guestCheckout);                      // UC-KVL03: Đặt hàng nhanh

module.exports = router;

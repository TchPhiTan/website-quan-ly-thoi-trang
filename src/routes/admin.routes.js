const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    getProducts, createProduct, updateProduct, deleteProduct,
    createVariant, updateVariant,
    getCategories, createCategory, updateCategory, deleteCategory,
    getUsers, updateUserStatus, updateUserRole,
    getCoupons, createCoupon, updateCoupon,
    getOverview, getRevenueReport, getTopProducts,
} = require('../controllers/admin.controller');

const router = Router();

// Tất cả routes chỉ cho admin
router.use(requireAuth, requireRole('admin'));

// Sản phẩm
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/:id/variants', createVariant);
router.put('/variants/:id', updateVariant);
router.patch('/variants/:id', updateVariant);

// Danh mục
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Người dùng
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.patch('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.patch('/users/:id/role', updateUserRole);

// Mã giảm giá
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.patch('/coupons/:id', updateCoupon);

// Báo cáo
router.get('/reports/overview', getOverview);
router.get('/reports/revenue', getRevenueReport);
router.get('/reports/top-products', getTopProducts);

module.exports = router;

const { Router } = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
    getOrders, updateOrderStatus, notifyOrder, processRma,
    restock, getInventory, getInventoryMovements,
    getReviews, replyReview,
} = require('../controllers/staff.controller');

const router = Router();

// Tất cả routes yêu cầu đăng nhập + quyền staff hoặc admin
router.use(requireAuth, requireRole(['staff', 'admin']));

// Đơn hàng
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/notify', notifyOrder);       // UC-NV04: Gửi email
router.post('/orders/:id/rma', processRma);           // UC-NV07: Đổi trả

// Kho hàng
router.get('/inventory', getInventory);
router.post('/inventory/restock', restock);
router.get('/inventory/movements', getInventoryMovements);

// Đánh giá
router.get('/reviews', getReviews);
router.post('/reviews/:id/reply', replyReview);

module.exports = router;

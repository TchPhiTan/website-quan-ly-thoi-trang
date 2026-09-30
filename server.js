const express = require('express');
const cors = require('cors');
const apiRouter = require('./api.js'); // Import file api.js của bạn

const app = express();

// Middleware cấu hình JSON và CORS
app.use(express.json()); // Đọc data body dạng JSON
app.use(cors({
    origin: 'http://localhost:3000', // Thay bằng URL Frontend (React/Vue/Angular) của bạn
    credentials: true // Bắt buộc bật true để Frontend có thể lưu được Cookie Session
}));

// Gắn Router vào ứng dụng
app.use('/api/v1', apiRouter);

// Khởi động Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Hệ thống đang chạy tại cổng ${PORT}`);
});
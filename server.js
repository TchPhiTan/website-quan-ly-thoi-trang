require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
    console.log(`✅ Server đang chạy tại http://${HOST}:${PORT}`);
    console.log(`📋 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});

// Xử lý dừng server an toàn khi Railway redeploy / restart
const handleShutdown = (signal) => {
    console.log(`[Server] Nhận tín hiệu ${signal}, đóng server an toàn...`);
    server.close(() => {
        console.log('[Server] Đã đóng các kết nối HTTP. Thoát tiến trình thành công.');
        process.exit(0);
    });

    // Ép dừng sau 5 giây nếu còn kết nối treo
    setTimeout(() => {
        console.error('[Server] Quá thời gian chờ shutdown, buộc dừng.');
        process.exit(0);
    }, 5000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
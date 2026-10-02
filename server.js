require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📋 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});
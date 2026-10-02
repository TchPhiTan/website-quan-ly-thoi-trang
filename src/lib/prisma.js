const { PrismaClient } = require('@prisma/client');

// Singleton pattern: tái sử dụng 1 instance duy nhất trong toàn bộ app
const db = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = db;

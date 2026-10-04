const { PrismaClient } = require('@prisma/client');

const transientCodes = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const isTransientDatabaseError = (error) => transientCodes.has(error?.code)
    || /Can't reach database|timed out|connection/i.test(error?.message || '');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Singleton pattern: tái sử dụng 1 instance duy nhất trong toàn bộ app
const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Neon có thể cần một nhịp để đánh thức compute. Chỉ retry lỗi kết nối, không retry
// lỗi validation hoặc lỗi nghiệp vụ để tránh lặp thao tác ghi ngoài ý muốn.
const db = client.$extends({
    name: 'neon-resilience',
    query: {
        $allModels: {
            async $allOperations({ args, query }) {
                for (let attempt = 0; ; attempt += 1) {
                    try {
                        return await query(args);
                    } catch (error) {
                        if (!isTransientDatabaseError(error) || attempt >= 2) throw error;
                        await wait(250 * (attempt + 1));
                    }
                }
            },
        },
    },
});

module.exports = db;
module.exports.isTransientDatabaseError = isTransientDatabaseError;

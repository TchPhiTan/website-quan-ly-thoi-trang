const { PrismaClient } = require('@prisma/client');

let databaseUrl = process.env.DATABASE_URL || '';
if (databaseUrl.includes('-pooler') && !databaseUrl.includes('pgbouncer=true')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}pgbouncer=true&connect_timeout=15`;
    process.env.DATABASE_URL = databaseUrl;
}

const transientCodes = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2028']);
const isTransientDatabaseError = (error) => {
    if (!error) return false;
    const msg = String(error.message || error);
    const code = error.code || error.cause?.code || '';
    return transientCodes.has(code)
        || /Can't reach database|timed out|connection|terminating connection|57P01|closed the connection|broken pipe|Connection reset|ProcessInterrupts|Transaction not found|Transaction ID is invalid|before disconnecting/i.test(msg);
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Singleton pattern: tái sử dụng 1 instance duy nhất trong toàn bộ app
const client = new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const executeWithRetry = async (fn, maxRetries = 3) => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await fn(db);
        } catch (error) {
            if (!isTransientDatabaseError(error) || attempt >= maxRetries - 1) {
                throw error;
            }
            if (/57P01|terminating connection|ProcessInterrupts|closed/i.test(String(error?.message || error))) {
                try { await client.$disconnect(); } catch (_) {}
            }
            await wait(300 * (attempt + 1));
        }
    }
};

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
                        if (/57P01|terminating connection|ProcessInterrupts/i.test(String(error?.message || error))) {
                            try { await client.$disconnect(); } catch (_) {}
                        }
                        await wait(250 * (attempt + 1));
                    }
                }
            },
        },
    },
});

module.exports = db;
module.exports.isTransientDatabaseError = isTransientDatabaseError;
module.exports.executeWithRetry = executeWithRetry;


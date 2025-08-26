"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
let prisma;
if (process.env.NODE_ENV === "production") {
    exports.prisma = prisma = new client_1.PrismaClient();
}
else {
    if (!global.__prisma) {
        global.__prisma = new client_1.PrismaClient({
            log: ["query", "info", "warn", "error"],
        });
    }
    exports.prisma = prisma = global.__prisma;
}
async function connectDatabase() {
    try {
        await prisma.$connect();
        logger_1.logger.info("✅ Database connected successfully");
    }
    catch (error) {
        logger_1.logger.error("❌ Database connection failed:", error);
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await prisma.$disconnect();
        logger_1.logger.info("✅ Database disconnected successfully");
    }
    catch (error) {
        logger_1.logger.error("❌ Database disconnection failed:", error);
        throw error;
    }
}
//# sourceMappingURL=database.js.map
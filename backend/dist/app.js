"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const sales_1 = __importDefault(require("./routes/sales"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const users_1 = __importDefault(require("./routes/users"));
const branches_1 = __importDefault(require("./routes/branches"));
const categories_1 = __importDefault(require("./routes/categories"));
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const requestLogger_1 = require("./middleware/requestLogger");
const logger_1 = require("./utils/logger");
const database_1 = require("./utils/database");
const socketIO_1 = require("./utils/socketIO");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
const io = (0, socketIO_1.setupSocketIO)(httpServer);
exports.io = io;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again later.",
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use(limiter);
app.use(requestLogger_1.requestLogger);
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});
const API_VERSION = process.env.API_VERSION || "v1";
app.use(`/api/${API_VERSION}/auth`, auth_1.default);
app.use(`/api/${API_VERSION}/inventory`, inventory_1.default);
app.use(`/api/${API_VERSION}/sales`, sales_1.default);
app.use(`/api/${API_VERSION}/analytics`, analytics_1.default);
app.use(`/api/${API_VERSION}/users`, users_1.default);
app.use(`/api/${API_VERSION}/branches`, branches_1.default);
app.use(`/api/${API_VERSION}/categories`, categories_1.default);
if (process.env.NODE_ENV !== "production") {
    const swaggerJsdoc = require("swagger-jsdoc");
    const swaggerUi = require("swagger-ui-express");
    const options = {
        definition: {
            openapi: "3.0.0",
            info: {
                title: "AX Stock Management API",
                version: "2.0.0",
                description: "Modern stock management system API",
            },
            servers: [
                {
                    url: `http://localhost:${process.env.PORT || 3001}/api/${API_VERSION}`,
                    description: "Development server",
                },
            ],
        },
        apis: ["./src/routes/*.ts"],
    };
    const specs = swaggerJsdoc(options);
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
}
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
process.on("SIGTERM", () => {
    logger_1.logger.info("SIGTERM received, shutting down gracefully");
    httpServer.close(() => {
        logger_1.logger.info("Process terminated");
        process.exit(0);
    });
});
process.on("SIGINT", () => {
    logger_1.logger.info("SIGINT received, shutting down gracefully");
    httpServer.close(() => {
        logger_1.logger.info("Process terminated");
        process.exit(0);
    });
});
const PORT = process.env.PORT || 3001;
async function startServer() {
    try {
        await (0, database_1.connectDatabase)();
        httpServer.listen(PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${PORT}`);
            logger_1.logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            logger_1.logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=app.js.map
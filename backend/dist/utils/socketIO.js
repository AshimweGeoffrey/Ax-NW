"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIO = setupSocketIO;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./logger");
function setupSocketIO(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
        },
    });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.user = {
                id: decoded.userId,
                name: decoded.name,
                role: decoded.role,
            };
            next();
        }
        catch (error) {
            logger_1.logger.error("Socket authentication error:", error);
            next(new Error("Authentication error: Invalid token"));
        }
    });
    io.on("connection", (socket) => {
        logger_1.logger.info(`User connected: ${socket.user?.name} (${socket.id})`);
        if (socket.user?.role) {
            socket.join(socket.user.role);
            socket.join(`user_${socket.user.id}`);
        }
        socket.on("subscribe-inventory", () => {
            socket.join("inventory-updates");
            logger_1.logger.info(`${socket.user?.name} subscribed to inventory updates`);
        });
        socket.on("subscribe-sales", () => {
            socket.join("sales-updates");
            logger_1.logger.info(`${socket.user?.name} subscribed to sales updates`);
        });
        socket.on("subscribe-analytics", () => {
            socket.join("analytics-updates");
            logger_1.logger.info(`${socket.user?.name} subscribed to analytics updates`);
        });
        socket.on("subscribe-low-stock", () => {
            socket.join("low-stock-alerts");
            logger_1.logger.info(`${socket.user?.name} subscribed to low stock alerts`);
        });
        socket.on("disconnect", () => {
            logger_1.logger.info(`User disconnected: ${socket.user?.name} (${socket.id})`);
        });
        socket.on("error", (error) => {
            logger_1.logger.error(`Socket error for user ${socket.user?.name}:`, error);
        });
    });
    const emitToRole = (role, event, data) => {
        io.to(role).emit(event, data);
    };
    const emitToUser = (userId, event, data) => {
        io.to(`user_${userId}`).emit(event, data);
    };
    const emitToRoom = (room, event, data) => {
        io.to(room).emit(event, data);
    };
    io.emitToRole = emitToRole;
    io.emitToUser = emitToUser;
    io.emitToRoom = emitToRoom;
    return io;
}
//# sourceMappingURL=socketIO.js.map
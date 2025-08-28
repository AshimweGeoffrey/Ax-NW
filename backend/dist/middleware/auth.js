"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStaff = exports.requireManager = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../utils/database");
const errorHandler_1 = require("./errorHandler");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) {
            throw (0, errorHandler_1.createError)("Access token required", 401);
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await database_1.prisma.user.findUnique({
            where: { name: decoded.name },
        });
        if (!user) {
            throw (0, errorHandler_1.createError)("User not found", 401);
        }
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.accessControl || "Staff",
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next((0, errorHandler_1.createError)("Invalid token", 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user)
            return next((0, errorHandler_1.createError)("Authentication required", 401));
        if (!allowedRoles.includes(req.user.role))
            return next((0, errorHandler_1.createError)("Insufficient permissions", 403));
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(["Administrator"]);
exports.requireManager = (0, exports.requireRole)(["Administrator", "Sale_Manager"]);
exports.requireStaff = (0, exports.requireRole)([
    "Administrator",
    "Sale_Manager",
    "Staff",
]);
//# sourceMappingURL=auth.js.map
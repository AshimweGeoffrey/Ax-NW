"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const database_1 = require("../utils/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username is required"),
    password: zod_1.z.string().min(1, "Password is required"),
});
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(32),
    email: zod_1.z.string().email().max(32),
    password: zod_1.z.string().min(6).max(50),
    accessControl: zod_1.z
        .enum(["Administrator", "Sale_Manager", "Staff", "Auditor"])
        .optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6).max(50),
});
const generateTokens = (user) => {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtSecret || !jwtRefreshSecret) {
        throw new Error("JWT secrets not configured");
    }
    const accessPayload = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.accessControl,
    };
    const accessToken = jsonwebtoken_1.default.sign(accessPayload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });
    const refreshPayload = { userId: user.id };
    const refreshToken = jsonwebtoken_1.default.sign(refreshPayload, jwtRefreshSecret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
    return { accessToken, refreshToken };
};
router.post("/login", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = await database_1.prisma.user.findUnique({
        where: { name: username },
    });
    if (!user || !user.password) {
        throw (0, errorHandler_1.createError)("Invalid credentials", 401);
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw (0, errorHandler_1.createError)("Invalid credentials", 401);
    }
    const { accessToken, refreshToken } = generateTokens(user);
    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.accessControl,
            },
            accessToken,
            refreshToken,
        },
    });
}));
router.post("/register", auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (req.user?.role !== "Administrator") {
        throw (0, errorHandler_1.createError)("Access denied", 403);
    }
    const { name, email, password, accessControl } = registerSchema.parse(req.body);
    const existingUser = await database_1.prisma.user.findFirst({
        where: {
            OR: [{ name }, { email }],
        },
    });
    if (existingUser) {
        throw (0, errorHandler_1.createError)("User already exists", 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const user = await database_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            accessControl: accessControl || "Staff",
            id: (0, crypto_1.randomUUID)(),
        },
        select: {
            id: true,
            name: true,
            email: true,
            accessControl: true,
        },
    });
    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                accessControl: user.accessControl,
            },
        },
    });
}));
router.get("/me", auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { name: req.user.name },
    });
    res.json({
        success: true,
        data: {
            user: user && {
                id: user.id,
                name: user.name,
                email: user.email,
                accessControl: user.accessControl,
            },
        },
    });
}));
router.post("/change-password", auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await database_1.prisma.user.findUnique({
        where: { name: req.user.name },
    });
    if (!user || !user.password) {
        throw (0, errorHandler_1.createError)("User not found", 404);
    }
    const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw (0, errorHandler_1.createError)("Invalid current password", 400);
    }
    const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
    await database_1.prisma.user.update({
        where: { name: user.name },
        data: { password: hashedNewPassword },
    });
    res.json({
        success: true,
        message: "Password changed successfully",
    });
}));
router.post("/refresh-token", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw (0, errorHandler_1.createError)("Refresh token is required", 400);
    }
    try {
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!jwtRefreshSecret) {
            throw (0, errorHandler_1.createError)("JWT refresh secret not configured", 500);
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, jwtRefreshSecret);
        const user = await database_1.prisma.user.findFirst({
            where: { id: decoded.userId },
        });
        if (!user) {
            throw (0, errorHandler_1.createError)("User not found", 401);
        }
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken: newRefreshToken,
            },
        });
    }
    catch (error) {
        throw (0, errorHandler_1.createError)("Invalid refresh token", 401);
    }
}));
exports.default = router;
//# sourceMappingURL=auth.js.map
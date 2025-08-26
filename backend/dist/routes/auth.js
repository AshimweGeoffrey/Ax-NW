"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
    const accessToken = jsonwebtoken_1.default.sign({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.accessControl,
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "24h" });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" });
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
    if (!user.isActive) {
        throw (0, errorHandler_1.createError)("Account is deactivated", 401);
    }
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
    });
    const { accessToken, refreshToken } = generateTokens(user);
    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.accessControl,
                lastLogin: user.lastLogin,
            },
            accessToken,
            refreshToken,
        },
    });
}));
router.post("/register", auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (req.user?.role !== "Administrator") {
        throw (0, errorHandler_1.createError)("Only administrators can register new users", 403);
    }
    const { name, email, password, accessControl } = registerSchema.parse(req.body);
    const existingUser = await database_1.prisma.user.findFirst({
        where: {
            OR: [{ name }, { email }],
        },
    });
    if (existingUser) {
        throw (0, errorHandler_1.createError)("User with this username or email already exists", 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 12);
    const newUser = await database_1.prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            accessControl: accessControl || "Staff",
        },
    });
    res.status(201).json({
        success: true,
        data: {
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.accessControl,
            },
        },
    });
}));
router.get("/me", auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            accessControl: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
        },
    });
    res.json({
        success: true,
        data: { user },
    });
}));
router.put("/change-password", auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.user.id },
    });
    if (!user || !user.password) {
        throw (0, errorHandler_1.createError)("User not found", 404);
    }
    const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw (0, errorHandler_1.createError)("Current password is incorrect", 400);
    }
    const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 12);
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword },
    });
    res.json({
        success: true,
        message: "Password changed successfully",
    });
}));
router.post("/refresh", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw (0, errorHandler_1.createError)("Refresh token required", 401);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user || !user.isActive) {
            throw (0, errorHandler_1.createError)("User not found or inactive", 401);
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
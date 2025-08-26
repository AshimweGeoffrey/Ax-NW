"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const database_1 = require("../utils/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(32),
    email: zod_1.z.string().email().max(32),
    password: zod_1.z.string().min(6).max(50),
    accessControl: zod_1.z
        .enum(["Administrator", "Sale_Manager", "Staff", "Auditor"])
        .default("Staff"),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(32).optional(),
    email: zod_1.z.string().email().max(32).optional(),
    accessControl: zod_1.z
        .enum(["Administrator", "Sale_Manager", "Staff", "Auditor"])
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.get("/", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const role = req.query.role;
    const skip = (page - 1) * limit;
    const where = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
        ];
    }
    if (role) {
        where.accessControl = role;
    }
    const [users, total] = await Promise.all([
        database_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                accessControl: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        database_1.prisma.user.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
router.get("/:id", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
            id: true,
            name: true,
            email: true,
            accessControl: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
            salesWeekly: {
                take: 10,
                orderBy: { timeStamp: "desc" },
                select: {
                    id: true,
                    itemName: true,
                    quantity: true,
                    price: true,
                    timeStamp: true,
                },
            },
        },
    });
    if (!user) {
        throw (0, errorHandler_1.createError)("User not found", 404);
    }
    res.json({
        success: true,
        data: { user },
    });
}));
router.post("/", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = createUserSchema.parse(req.body);
    const existingUser = await database_1.prisma.user.findFirst({
        where: {
            OR: [{ name: validatedData.name }, { email: validatedData.email }],
        },
    });
    if (existingUser) {
        throw (0, errorHandler_1.createError)("User with this username or email already exists", 400);
    }
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    const user = await database_1.prisma.user.create({
        data: {
            ...validatedData,
            password: hashedPassword,
        },
        select: {
            id: true,
            name: true,
            email: true,
            accessControl: true,
            isActive: true,
            createdAt: true,
        },
    });
    res.status(201).json({
        success: true,
        data: { user },
    });
}));
router.put("/:id", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = updateUserSchema.parse(req.body);
    const existingUser = await database_1.prisma.user.findUnique({
        where: { id: req.params.id },
    });
    if (!existingUser) {
        throw (0, errorHandler_1.createError)("User not found", 404);
    }
    if (validatedData.name || validatedData.email) {
        const duplicateUser = await database_1.prisma.user.findFirst({
            where: {
                AND: [
                    { id: { not: req.params.id } },
                    {
                        OR: [
                            validatedData.name ? { name: validatedData.name } : {},
                            validatedData.email ? { email: validatedData.email } : {},
                        ],
                    },
                ],
            },
        });
        if (duplicateUser) {
            throw (0, errorHandler_1.createError)("User with this username or email already exists", 400);
        }
    }
    const user = await database_1.prisma.user.update({
        where: { id: req.params.id },
        data: validatedData,
        select: {
            id: true,
            name: true,
            email: true,
            accessControl: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    res.json({
        success: true,
        data: { user },
    });
}));
router.delete("/:id", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.params.id },
    });
    if (!user) {
        throw (0, errorHandler_1.createError)("User not found", 404);
    }
    if (user.accessControl === "Administrator") {
        const adminCount = await database_1.prisma.user.count({
            where: { accessControl: "Administrator", isActive: true },
        });
        if (adminCount <= 1) {
            throw (0, errorHandler_1.createError)("Cannot deactivate the last administrator", 400);
        }
    }
    await database_1.prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });
    res.json({
        success: true,
        message: "User deactivated successfully",
    });
}));
router.post("/:id/reset-password", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        throw (0, errorHandler_1.createError)("New password must be at least 6 characters long", 400);
    }
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.params.id },
    });
    if (!user) {
        throw (0, errorHandler_1.createError)("User not found", 404);
    }
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await database_1.prisma.user.update({
        where: { id: req.params.id },
        data: { password: hashedPassword },
    });
    res.json({
        success: true,
        message: "Password reset successfully",
    });
}));
exports.default = router;
//# sourceMappingURL=users.js.map
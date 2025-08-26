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
const createBranchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(16),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    managerId: zod_1.z.string().optional(),
});
const updateBranchSchema = createBranchSchema.partial();
router.get("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const branches = await database_1.prisma.branch.findMany({
        include: {
            manager: {
                select: { name: true, email: true },
            },
            outgoingStock: {
                take: 5,
                orderBy: { timeStamp: "desc" },
            },
        },
        orderBy: { name: "asc" },
    });
    res.json({
        success: true,
        data: { branches },
    });
}));
router.get("/:id", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const branch = await database_1.prisma.branch.findUnique({
        where: { id: req.params.id },
        include: {
            manager: {
                select: { name: true, email: true },
            },
            outgoingStock: {
                take: 10,
                orderBy: { timeStamp: "desc" },
                include: {
                    item: { select: { name: true } },
                    user: { select: { name: true } },
                },
            },
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
    if (!branch) {
        throw (0, errorHandler_1.createError)("Branch not found", 404);
    }
    res.json({
        success: true,
        data: { branch },
    });
}));
router.post("/", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = createBranchSchema.parse(req.body);
    const existingBranch = await database_1.prisma.branch.findUnique({
        where: { name: validatedData.name },
    });
    if (existingBranch) {
        throw (0, errorHandler_1.createError)("Branch with this name already exists", 400);
    }
    if (validatedData.managerId) {
        const manager = await database_1.prisma.user.findUnique({
            where: { id: validatedData.managerId },
        });
        if (!manager) {
            throw (0, errorHandler_1.createError)("Manager not found", 400);
        }
    }
    const branch = await database_1.prisma.branch.create({
        data: validatedData,
        include: {
            manager: {
                select: { name: true, email: true },
            },
        },
    });
    res.status(201).json({
        success: true,
        data: { branch },
    });
}));
router.put("/:id", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = updateBranchSchema.parse(req.body);
    const existingBranch = await database_1.prisma.branch.findUnique({
        where: { id: req.params.id },
    });
    if (!existingBranch) {
        throw (0, errorHandler_1.createError)("Branch not found", 404);
    }
    if (validatedData.name) {
        const duplicateBranch = await database_1.prisma.branch.findUnique({
            where: { name: validatedData.name },
        });
        if (duplicateBranch && duplicateBranch.id !== req.params.id) {
            throw (0, errorHandler_1.createError)("Branch with this name already exists", 400);
        }
    }
    if (validatedData.managerId) {
        const manager = await database_1.prisma.user.findUnique({
            where: { id: validatedData.managerId },
        });
        if (!manager) {
            throw (0, errorHandler_1.createError)("Manager not found", 400);
        }
    }
    const branch = await database_1.prisma.branch.update({
        where: { id: req.params.id },
        data: validatedData,
        include: {
            manager: {
                select: { name: true, email: true },
            },
        },
    });
    res.json({
        success: true,
        data: { branch },
    });
}));
router.delete("/:id", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const branch = await database_1.prisma.branch.findUnique({
        where: { id: req.params.id },
    });
    if (!branch) {
        throw (0, errorHandler_1.createError)("Branch not found", 404);
    }
    const [stockCount, salesCount] = await Promise.all([
        database_1.prisma.outgoingStock.count({ where: { branchName: branch.name } }),
        database_1.prisma.saleWeekly.count({ where: { branchId: branch.id } }),
    ]);
    if (stockCount > 0 || salesCount > 0) {
        throw (0, errorHandler_1.createError)("Cannot delete branch with existing stock movements or sales", 400);
    }
    await database_1.prisma.branch.delete({
        where: { id: req.params.id },
    });
    res.json({
        success: true,
        message: "Branch deleted successfully",
    });
}));
exports.default = router;
//# sourceMappingURL=branches.js.map
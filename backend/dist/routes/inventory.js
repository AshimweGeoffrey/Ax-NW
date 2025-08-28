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
const crypto_1 = require("crypto");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
const createInventorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(64),
    categoryName: zod_1.z.string().min(1).max(32),
    inventoryQuantity: zod_1.z.number().int().min(0).default(0),
});
const updateInventorySchema = zod_1.z.object({
    categoryName: zod_1.z.string().min(1).max(32).optional(),
    inventoryQuantity: zod_1.z.number().int().min(0).optional(),
});
const adjustSchema = zod_1.z.object({
    quantityChange: zod_1.z.number().int(),
    notes: zod_1.z.string().optional(),
});
router.get("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const search = req.query.search || "";
    const category = req.query.category || "";
    const lowStock = req.query.lowStock === "true";
    const skip = (page - 1) * limit;
    const where = {};
    if (search)
        where.name = { contains: search, mode: "insensitive" };
    if (category)
        where.categoryName = category;
    if (lowStock)
        where.inventoryQuantity = { lt: 3 };
    const [items, total] = await Promise.all([
        database_1.prisma.inventory.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
        }),
        database_1.prisma.inventory.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
router.get("/:name", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const item = await database_1.prisma.inventory.findUnique({
        where: { name: req.params.name },
    });
    if (!item) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    res.json({
        success: true,
        data: { item },
    });
}));
router.post("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = createInventorySchema.parse(req.body);
    const category = await database_1.prisma.category.findUnique({
        where: { name: data.categoryName },
    });
    if (!category) {
        throw (0, errorHandler_1.createError)("Category not found", 400);
    }
    const existing = await database_1.prisma.inventory.findUnique({
        where: { name: data.name },
    });
    if (existing) {
        throw (0, errorHandler_1.createError)("Item with this name already exists", 400);
    }
    const item = await database_1.prisma.inventory.create({
        data: {
            name: data.name,
            id: (0, crypto_1.randomUUID)(),
            categoryName: data.categoryName,
            inventoryQuantity: data.inventoryQuantity,
            incomingTimeStamp: new Date(),
        },
    });
    if (data.inventoryQuantity > 0) {
        await database_1.prisma.remark.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                timeStamp: new Date(),
                message: `Initial stock for ${item.name}: +${data.inventoryQuantity}${req.user ? ` by ${req.user.name}` : ""}`,
            },
        });
    }
    res.status(201).json({
        success: true,
        data: { item },
    });
}));
router.put("/:name", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const changes = updateInventorySchema.parse(req.body);
    const exist = await database_1.prisma.inventory.findUnique({
        where: { name: req.params.name },
    });
    if (!exist) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    const updated = await database_1.prisma.inventory.update({
        where: { name: req.params.name },
        data: changes,
    });
    res.json({
        success: true,
        data: { item: updated },
    });
}));
router.post("/:name/adjust", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { quantityChange, notes } = adjustSchema.parse(req.body);
    const item = await database_1.prisma.inventory.findUnique({
        where: { name: req.params.name },
    });
    if (!item) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    if (quantityChange < 0 && req.user?.role !== "Administrator") {
        throw (0, errorHandler_1.createError)("Only administrators can reduce stock (negative input)", 403);
    }
    const newQty = item.inventoryQuantity + quantityChange;
    if (newQty < 0) {
        throw (0, errorHandler_1.createError)("Resulting stock cannot be negative", 400);
    }
    const updated = await database_1.prisma.inventory.update({
        where: { name: item.name },
        data: { inventoryQuantity: newQty },
    });
    await database_1.prisma.remark.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            timeStamp: new Date(),
            message: `Adjust ${item.name}: ${quantityChange > 0 ? "+" : ""}${quantityChange} by ${req.user?.name || "system"}${notes ? ` (${notes})` : ""}`,
        },
    });
    res.json({
        success: true,
        data: { item: updated },
        message: "Stock adjusted successfully",
    });
}));
router.delete("/:name", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const item = await database_1.prisma.inventory.findUnique({
        where: { name: req.params.name },
    });
    if (!item) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    const salesCount = await database_1.prisma.saleWeekly.count({
        where: { itemName: item.name },
    });
    if (salesCount > 0) {
        throw (0, errorHandler_1.createError)("Cannot delete item with existing sales", 400);
    }
    await database_1.prisma.inventory.delete({
        where: { name: item.name },
    });
    res.json({
        success: true,
        message: "Item deleted successfully",
    });
}));
router.get("/reports/low-stock", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const items = await database_1.prisma.inventory.findMany({
        where: { inventoryQuantity: { lt: 3 } },
        orderBy: { inventoryQuantity: "asc" },
    });
    res.json({
        success: true,
        data: { items },
    });
}));
exports.default = router;
//# sourceMappingURL=inventory.js.map
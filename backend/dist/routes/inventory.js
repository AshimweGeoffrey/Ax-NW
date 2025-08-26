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
const createInventorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(64),
    sku: zod_1.z.string().optional(),
    categoryName: zod_1.z.string().min(1).max(32),
    inventoryQuantity: zod_1.z.number().int().min(0).default(0),
    unitCost: zod_1.z.number().min(0).default(0),
    sellingPrice: zod_1.z.number().min(0).default(0),
    minStockLevel: zod_1.z.number().int().min(0).default(5),
    maxStockLevel: zod_1.z.number().int().min(1).default(1000),
    supplier: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
});
const updateInventorySchema = createInventorySchema.partial();
const adjustStockSchema = zod_1.z.object({
    quantity: zod_1.z.number().int(),
    type: zod_1.z.enum(["adjustment", "restock"]),
    notes: zod_1.z.string().optional(),
});
router.get("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const category = req.query.category;
    const lowStock = req.query.lowStock === "true";
    const skip = (page - 1) * limit;
    const where = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
        ];
    }
    if (category) {
        where.categoryName = category;
    }
    if (lowStock) {
        where.inventoryQuantity = {
            lte: database_1.prisma.$queryRaw `inventory_quantity <= min_stock_level`,
        };
    }
    const [items, total] = await Promise.all([
        database_1.prisma.inventory.findMany({
            where,
            include: {
                category: true,
                creator: {
                    select: { name: true, email: true },
                },
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
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
router.get("/:id", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const item = await database_1.prisma.inventory.findUnique({
        where: { id: req.params.id },
        include: {
            category: true,
            creator: {
                select: { name: true, email: true },
            },
            stockMovements: {
                take: 10,
                orderBy: { movementDate: "desc" },
                include: {
                    user: {
                        select: { name: true },
                    },
                },
            },
        },
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
    const validatedData = createInventorySchema.parse(req.body);
    const category = await database_1.prisma.category.findUnique({
        where: { name: validatedData.categoryName },
    });
    if (!category) {
        throw (0, errorHandler_1.createError)("Category not found", 400);
    }
    const existingItem = await database_1.prisma.inventory.findUnique({
        where: { name: validatedData.name },
    });
    if (existingItem) {
        throw (0, errorHandler_1.createError)("Item with this name already exists", 400);
    }
    if (validatedData.sku) {
        const existingSku = await database_1.prisma.inventory.findUnique({
            where: { sku: validatedData.sku },
        });
        if (existingSku) {
            throw (0, errorHandler_1.createError)("Item with this SKU already exists", 400);
        }
    }
    const item = await database_1.prisma.inventory.create({
        data: {
            ...validatedData,
            createdBy: req.user.id,
            incomingTimeStamp: new Date(),
        },
        include: {
            category: true,
            creator: {
                select: { name: true, email: true },
            },
        },
    });
    if (validatedData.inventoryQuantity > 0) {
        await database_1.prisma.stockMovement.create({
            data: {
                itemId: item.id,
                movementType: "in",
                quantity: validatedData.inventoryQuantity,
                referenceType: "adjustment",
                notes: "Initial stock",
                userId: req.user.id,
            },
        });
    }
    res.status(201).json({
        success: true,
        data: { item },
    });
}));
router.put("/:id", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = updateInventorySchema.parse(req.body);
    const existingItem = await database_1.prisma.inventory.findUnique({
        where: { id: req.params.id },
    });
    if (!existingItem) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    if (validatedData.categoryName) {
        const category = await database_1.prisma.category.findUnique({
            where: { name: validatedData.categoryName },
        });
        if (!category) {
            throw (0, errorHandler_1.createError)("Category not found", 400);
        }
    }
    const item = await database_1.prisma.inventory.update({
        where: { id: req.params.id },
        data: validatedData,
        include: {
            category: true,
            creator: {
                select: { name: true, email: true },
            },
        },
    });
    res.json({
        success: true,
        data: { item },
    });
}));
router.post("/:id/adjust", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { quantity, type, notes } = adjustStockSchema.parse(req.body);
    const item = await database_1.prisma.inventory.findUnique({
        where: { id: req.params.id },
    });
    if (!item) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    const newQuantity = item.inventoryQuantity + quantity;
    if (newQuantity < 0) {
        throw (0, errorHandler_1.createError)("Insufficient stock for this adjustment", 400);
    }
    const updatedItem = await database_1.prisma.inventory.update({
        where: { id: req.params.id },
        data: { inventoryQuantity: newQuantity },
        include: { category: true },
    });
    await database_1.prisma.stockMovement.create({
        data: {
            itemId: item.id,
            movementType: quantity > 0 ? "in" : "out",
            quantity: Math.abs(quantity),
            referenceType: type,
            notes,
            userId: req.user.id,
        },
    });
    res.json({
        success: true,
        data: { item: updatedItem },
        message: "Stock adjusted successfully",
    });
}));
router.delete("/:id", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const item = await database_1.prisma.inventory.findUnique({
        where: { id: req.params.id },
    });
    if (!item) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    const [salesCount, movementsCount] = await Promise.all([
        database_1.prisma.saleWeekly.count({ where: { itemName: item.name } }),
        database_1.prisma.stockMovement.count({ where: { itemId: item.id } }),
    ]);
    if (salesCount > 0 || movementsCount > 0) {
        throw (0, errorHandler_1.createError)("Cannot delete item with existing sales or stock movements", 400);
    }
    await database_1.prisma.inventory.delete({
        where: { id: req.params.id },
    });
    res.json({
        success: true,
        message: "Item deleted successfully",
    });
}));
router.get("/reports/low-stock", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const items = await database_1.prisma.$queryRaw `
    SELECT i.*, c.name as categoryName, c.color_code as categoryColor
    FROM inventory i
    JOIN category c ON i.category_name = c.name
    WHERE i.inventory_quantity <= i.min_stock_level
    ORDER BY (i.inventory_quantity / i.min_stock_level) ASC
  `;
    res.json({
        success: true,
        data: { items },
    });
}));
exports.default = router;
//# sourceMappingURL=inventory.js.map
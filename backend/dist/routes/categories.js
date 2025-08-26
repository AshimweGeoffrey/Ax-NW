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
const createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(32),
    description: zod_1.z.string().optional(),
    profitPercentage: zod_1.z.number().min(0).default(0),
    colorCode: zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default("#3B82F6"),
});
const updateCategorySchema = createCategorySchema.partial();
router.get("/", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const categories = await database_1.prisma.category.findMany({
        include: {
            inventory: {
                select: {
                    id: true,
                    name: true,
                    inventoryQuantity: true,
                },
            },
            _count: {
                select: {
                    inventory: true,
                    salesWeekly: true,
                },
            },
        },
        orderBy: { name: "asc" },
    });
    res.json({
        success: true,
        data: { categories },
    });
}));
router.get("/:id", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const category = await database_1.prisma.category.findUnique({
        where: { id: req.params.id },
        include: {
            inventory: {
                orderBy: { name: "asc" },
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
                    userName: true,
                },
            },
            _count: {
                select: {
                    inventory: true,
                    salesWeekly: true,
                },
            },
        },
    });
    if (!category) {
        throw (0, errorHandler_1.createError)("Category not found", 404);
    }
    res.json({
        success: true,
        data: { category },
    });
}));
router.post("/", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = createCategorySchema.parse(req.body);
    const existingCategory = await database_1.prisma.category.findUnique({
        where: { name: validatedData.name },
    });
    if (existingCategory) {
        throw (0, errorHandler_1.createError)("Category with this name already exists", 400);
    }
    const category = await database_1.prisma.category.create({
        data: validatedData,
    });
    res.status(201).json({
        success: true,
        data: { category },
    });
}));
router.put("/:id", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = updateCategorySchema.parse(req.body);
    const existingCategory = await database_1.prisma.category.findUnique({
        where: { id: req.params.id },
    });
    if (!existingCategory) {
        throw (0, errorHandler_1.createError)("Category not found", 404);
    }
    if (validatedData.name) {
        const duplicateCategory = await database_1.prisma.category.findUnique({
            where: { name: validatedData.name },
        });
        if (duplicateCategory && duplicateCategory.id !== req.params.id) {
            throw (0, errorHandler_1.createError)("Category with this name already exists", 400);
        }
    }
    const category = await database_1.prisma.category.update({
        where: { id: req.params.id },
        data: validatedData,
    });
    res.json({
        success: true,
        data: { category },
    });
}));
router.delete("/:id", auth_1.requireManager, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const category = await database_1.prisma.category.findUnique({
        where: { id: req.params.id },
    });
    if (!category) {
        throw (0, errorHandler_1.createError)("Category not found", 404);
    }
    const inventoryCount = await database_1.prisma.inventory.count({
        where: { categoryName: category.name },
    });
    if (inventoryCount > 0) {
        throw (0, errorHandler_1.createError)("Cannot delete category with existing inventory items", 400);
    }
    await database_1.prisma.category.delete({
        where: { id: req.params.id },
    });
    res.json({
        success: true,
        message: "Category deleted successfully",
    });
}));
router.get("/:id/performance", (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const category = await database_1.prisma.category.findUnique({
        where: { id: req.params.id },
    });
    if (!category) {
        throw (0, errorHandler_1.createError)("Category not found", 404);
    }
    const timeRange = req.query.timeRange || "30d";
    const now = new Date();
    let startDate;
    switch (timeRange) {
        case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case "90d":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const [salesSummary, topItems, salesTrend] = await Promise.all([
        database_1.prisma.saleWeekly.aggregate({
            where: {
                category: category.name,
                timeStamp: { gte: startDate },
            },
            _sum: { quantity: true, price: true },
            _count: true,
        }),
        database_1.prisma.saleWeekly.groupBy({
            by: ["itemName"],
            where: {
                category: category.name,
                timeStamp: { gte: startDate },
            },
            _sum: { quantity: true, price: true },
            _count: true,
            orderBy: { _sum: { quantity: "desc" } },
            take: 5,
        }),
        database_1.prisma.$queryRaw `
      SELECT 
        DATE(time_stamp) as date,
        COUNT(*) as sales_count,
        SUM(price) as revenue,
        SUM(quantity) as quantity_sold
      FROM sale_weekly 
      WHERE category = ${category.name} AND time_stamp >= ${startDate}
      GROUP BY DATE(time_stamp)
      ORDER BY date ASC
    `,
    ]);
    res.json({
        success: true,
        data: {
            category,
            performance: {
                salesSummary,
                topItems,
                salesTrend,
                timeRange,
            },
        },
    });
}));
exports.default = router;
//# sourceMappingURL=categories.js.map
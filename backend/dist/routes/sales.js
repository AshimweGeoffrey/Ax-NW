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
const createSaleSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1).max(64),
    quantity: zod_1.z.number().int().min(1),
    price: zod_1.z.number().min(0),
    paymentMethod: zod_1.z.enum(["Cash", "Mobile Money", "Pos"]),
});
router.get("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const paymentMethod = req.query.paymentMethod;
    const product = req.query.product;
    const where = {};
    if (startDate && endDate)
        where.timeStamp = { gte: new Date(startDate), lte: new Date(endDate) };
    if (paymentMethod)
        where.paymentMethod = paymentMethod;
    if (product)
        where.itemName = product;
    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
        database_1.prisma.saleWeekly.findMany({ where, skip, take: limit, orderBy: { timeStamp: "desc" } }),
        database_1.prisma.saleWeekly.count({ where }),
    ]);
    res.json({ success: true, data: { sales, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}));
router.get("/:id", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const sale = await database_1.prisma.saleWeekly.findUnique({ where: { id: req.params.id } });
    if (!sale)
        throw (0, errorHandler_1.createError)("Sale not found", 404);
    res.json({ success: true, data: { sale } });
}));
router.post("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = createSaleSchema.parse(req.body);
    const item = await database_1.prisma.inventory.findUnique({ where: { name: data.itemName } });
    if (!item)
        throw (0, errorHandler_1.createError)("Item not found", 404);
    if (item.inventoryQuantity < data.quantity)
        throw (0, errorHandler_1.createError)(`Insufficient stock. Available: ${item.inventoryQuantity}`, 400);
    const pay = await database_1.prisma.paymentMethod.findUnique({ where: { name: data.paymentMethod } });
    if (!pay)
        throw (0, errorHandler_1.createError)("Payment method not found", 400);
    const sale = await database_1.prisma.saleWeekly.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            itemName: data.itemName,
            category: item.categoryName,
            quantity: data.quantity,
            price: Math.round(data.price),
            userName: req.user?.name || null,
            timeStamp: new Date(),
            paymentMethod: data.paymentMethod,
        },
    });
    res.status(201).json({ success: true, data: { sale }, message: "Sale created successfully" });
}));
router.get("/reports/summary", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 86400000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const [totalSales, totalRevenue, salesByPaymentMethod, salesByDay] = await Promise.all([
        database_1.prisma.saleWeekly.count({ where: { timeStamp: { gte: startDate, lte: endDate } } }),
        database_1.prisma.saleWeekly.aggregate({ where: { timeStamp: { gte: startDate, lte: endDate } }, _sum: { price: true } }),
        database_1.prisma.saleWeekly.groupBy({ by: ["paymentMethod"], where: { timeStamp: { gte: startDate, lte: endDate } }, _sum: { price: true }, _count: true }),
        database_1.prisma.$queryRaw `SELECT DATE(time_stamp) as date, COUNT(*) as sales_count, SUM(price) as total_revenue, SUM(quantity) as total_quantity FROM sale_weekly WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate} GROUP BY DATE(time_stamp) ORDER BY date ASC`,
    ]);
    res.json({ success: true, data: { summary: { totalSales, totalRevenue: totalRevenue._sum.price || 0, averageSaleValue: totalSales > 0 ? (totalRevenue._sum.price || 0) / totalSales : 0, dateRange: { startDate, endDate } }, salesByPaymentMethod, salesByDay } });
}));
exports.default = router;
//# sourceMappingURL=sales.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../utils/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get("/dashboard", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        case "1y":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const [totalRevenue, totalSales, totalItems, lowStockItems, revenueByMonth, salesByPaymentMethod, topCategories, recentSales,] = await Promise.all([
        database_1.prisma.saleWeekly.aggregate({
            where: { timeStamp: { gte: startDate } },
            _sum: { price: true },
        }),
        database_1.prisma.saleWeekly.count({
            where: { timeStamp: { gte: startDate } },
        }),
        database_1.prisma.inventory.count(),
        database_1.prisma.$queryRaw `SELECT COUNT(*) as count FROM inventory WHERE inventory_quantity < 3`,
        database_1.prisma.$queryRaw `
      SELECT 
        DATE_FORMAT(time_stamp, '%Y-%m') as month,
        SUM(price) as revenue,
        COUNT(*) as sales_count
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate}
      GROUP BY DATE_FORMAT(time_stamp, '%Y-%m')
      ORDER BY month ASC
    `,
        database_1.prisma.saleWeekly.groupBy({
            by: ["paymentMethod"],
            where: { timeStamp: { gte: startDate } },
            _sum: { price: true },
            _count: true,
        }),
        database_1.prisma.saleWeekly.groupBy({
            by: ["category"],
            where: { timeStamp: { gte: startDate } },
            _sum: { quantity: true, price: true },
            _count: true,
            orderBy: { _sum: { quantity: "desc" } },
            take: 5,
        }),
        database_1.prisma.saleWeekly.findMany({
            take: 10,
            orderBy: { timeStamp: "desc" },
            select: { id: true, itemName: true, quantity: true, price: true, timeStamp: true, userName: true },
        }),
    ]);
    res.json({
        success: true,
        data: {
            metrics: {
                totalRevenue: totalRevenue._sum.price || 0,
                totalSales,
                totalItems,
                lowStockItems: lowStockItems[0]?.count || 0,
            },
            charts: {
                revenueByMonth,
                salesByPaymentMethod,
                topCategories,
            },
            recentActivity: { recentSales },
            timeRange,
        },
    });
}));
router.get("/inventory", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [stockLevels, categoryDistribution] = await Promise.all([
        database_1.prisma.$queryRaw `SELECT 
        COUNT(CASE WHEN inventory_quantity = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN inventory_quantity < 3 AND inventory_quantity > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN inventory_quantity >= 3 THEN 1 END) as normal_stock
      FROM inventory`,
        database_1.prisma.inventory.groupBy({ by: ["categoryName"], _count: true, _sum: { inventoryQuantity: true } }),
    ]);
    res.json({ success: true, data: { stockLevels: stockLevels[0], categoryDistribution } });
}));
router.get("/sales", auth_1.requireAdmin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const timeRange = req.query.timeRange || "30d";
    const now = new Date();
    let startDate;
    switch (timeRange) {
        case "7d":
            startDate = new Date(now.getTime() - 7 * 86400000);
            break;
        case "30d":
            startDate = new Date(now.getTime() - 30 * 86400000);
            break;
        case "90d":
            startDate = new Date(now.getTime() - 90 * 86400000);
            break;
        default: startDate = new Date(now.getTime() - 30 * 86400000);
    }
    const [salesTrends, salesByHour, salesByDay, paymentBreakdown] = await Promise.all([
        database_1.prisma.$queryRaw `SELECT DATE(time_stamp) as date, COUNT(*) as sales_count, SUM(price) as revenue, SUM(quantity) as items_sold FROM sale_weekly WHERE time_stamp >= ${startDate} GROUP BY DATE(time_stamp) ORDER BY date ASC`,
        database_1.prisma.$queryRaw `SELECT HOUR(time_stamp) as hour, COUNT(*) as sales_count, SUM(price) as revenue FROM sale_weekly WHERE time_stamp >= ${startDate} GROUP BY HOUR(time_stamp) ORDER BY hour ASC`,
        database_1.prisma.$queryRaw `SELECT DAYNAME(time_stamp) as day_name, DAYOFWEEK(time_stamp) as day_number, COUNT(*) as sales_count, SUM(price) as revenue FROM sale_weekly WHERE time_stamp >= ${startDate} GROUP BY DAYOFWEEK(time_stamp), DAYNAME(time_stamp) ORDER BY day_number ASC`,
        database_1.prisma.saleWeekly.groupBy({ by: ["paymentMethod"], where: { timeStamp: { gte: startDate } }, _sum: { price: true }, _count: true }),
    ]);
    res.json({ success: true, data: { salesTrends, salesByHour, salesByDay, paymentBreakdown, timeRange } });
}));
exports.default = router;
//# sourceMappingURL=analytics.js.map
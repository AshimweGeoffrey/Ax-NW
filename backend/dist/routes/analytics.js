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
router.get("/dashboard", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        database_1.prisma.$queryRaw `
      SELECT COUNT(*) as count 
      FROM inventory 
      WHERE inventory_quantity <= min_stock_level
    `,
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
            include: {
                user: { select: { name: true } },
                item: { select: { name: true } },
            },
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
            recentActivity: {
                recentSales,
            },
            timeRange,
        },
    });
}));
router.get("/inventory", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [stockLevels, categoryDistribution, stockMovements, topMovingItems, stockValue,] = await Promise.all([
        database_1.prisma.$queryRaw `
      SELECT 
        COUNT(CASE WHEN inventory_quantity = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN inventory_quantity <= min_stock_level AND inventory_quantity > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN inventory_quantity > min_stock_level AND inventory_quantity < max_stock_level THEN 1 END) as normal_stock,
        COUNT(CASE WHEN inventory_quantity >= max_stock_level THEN 1 END) as overstock
      FROM inventory
    `,
        database_1.prisma.inventory.groupBy({
            by: ["categoryName"],
            _count: true,
            _sum: { inventoryQuantity: true },
        }),
        database_1.prisma.stockMovement.findMany({
            take: 20,
            orderBy: { movementDate: "desc" },
            include: {
                item: { select: { name: true } },
                user: { select: { name: true } },
            },
        }),
        database_1.prisma.stockMovement.groupBy({
            by: ["itemId"],
            _count: true,
            _sum: { quantity: true },
            orderBy: { _count: { itemId: "desc" } },
            take: 10,
        }),
        database_1.prisma.$queryRaw `
      SELECT 
        SUM(inventory_quantity * unit_cost) as total_cost_value,
        SUM(inventory_quantity * selling_price) as total_selling_value
      FROM inventory
    `,
    ]);
    res.json({
        success: true,
        data: {
            stockLevels: stockLevels[0],
            categoryDistribution,
            stockMovements,
            topMovingItems,
            stockValue: stockValue[0],
        },
    });
}));
router.get("/sales", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    const [salesTrends, topProducts, salesByHour, salesByDay, customerAnalysis, profitAnalysis,] = await Promise.all([
        database_1.prisma.$queryRaw `
      SELECT 
        DATE(time_stamp) as date,
        COUNT(*) as sales_count,
        SUM(price) as revenue,
        SUM(quantity) as items_sold
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate}
      GROUP BY DATE(time_stamp)
      ORDER BY date ASC
    `,
        database_1.prisma.saleWeekly.groupBy({
            by: ["itemName"],
            where: { timeStamp: { gte: startDate } },
            _sum: { quantity: true, price: true },
            _count: true,
            orderBy: { _sum: { quantity: "desc" } },
            take: 10,
        }),
        database_1.prisma.$queryRaw `
      SELECT 
        HOUR(time_stamp) as hour,
        COUNT(*) as sales_count,
        SUM(price) as revenue
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate}
      GROUP BY HOUR(time_stamp)
      ORDER BY hour ASC
    `,
        database_1.prisma.$queryRaw `
      SELECT 
        DAYNAME(time_stamp) as day_name,
        DAYOFWEEK(time_stamp) as day_number,
        COUNT(*) as sales_count,
        SUM(price) as revenue
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate}
      GROUP BY DAYOFWEEK(time_stamp), DAYNAME(time_stamp)
      ORDER BY day_number ASC
    `,
        database_1.prisma.saleWeekly.groupBy({
            by: ["customerName"],
            where: {
                timeStamp: { gte: startDate },
                customerName: { not: null },
            },
            _sum: { price: true, quantity: true },
            _count: true,
            orderBy: { _sum: { price: "desc" } },
            take: 10,
        }),
        database_1.prisma.$queryRaw `
      SELECT 
        s.category,
        SUM(s.quantity) as total_quantity,
        SUM(s.price) as total_revenue,
        SUM(s.quantity * i.unit_cost) as total_cost,
        SUM(s.price) - SUM(s.quantity * i.unit_cost) as profit
      FROM sale_weekly s
      JOIN inventory i ON s.item_name = i.name
      WHERE s.time_stamp >= ${startDate}
      GROUP BY s.category
      ORDER BY profit DESC
    `,
    ]);
    res.json({
        success: true,
        data: {
            salesTrends,
            topProducts,
            salesByHour,
            salesByDay,
            customerAnalysis,
            profitAnalysis,
            timeRange,
        },
    });
}));
router.get("/forecast", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const historicalData = await database_1.prisma.$queryRaw `
    SELECT 
      DATE(time_stamp) as date,
      SUM(quantity) as total_quantity,
      SUM(price) as total_revenue
    FROM sale_weekly 
    WHERE time_stamp >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY DATE(time_stamp)
    ORDER BY date ASC
  `;
    const forecast = [];
    const data = historicalData;
    if (data.length >= 7) {
        const lastWeekAvg = data
            .slice(-7)
            .reduce((sum, day) => sum + Number(day.total_quantity), 0) / 7;
        const revenueAvg = data
            .slice(-7)
            .reduce((sum, day) => sum + Number(day.total_revenue), 0) / 7;
        for (let i = 1; i <= 30; i++) {
            const forecastDate = new Date();
            forecastDate.setDate(forecastDate.getDate() + i);
            forecast.push({
                date: forecastDate.toISOString().split("T")[0],
                predicted_quantity: Math.round(lastWeekAvg),
                predicted_revenue: Math.round(revenueAvg),
                confidence: Math.max(0.5, 1 - i / 60),
            });
        }
    }
    res.json({
        success: true,
        data: {
            historicalData,
            forecast,
            metadata: {
                forecastMethod: "Simple Moving Average (7-day)",
                forecastPeriod: "30 days",
                dataPoints: data.length,
            },
        },
    });
}));
exports.default = router;
//# sourceMappingURL=analytics.js.map
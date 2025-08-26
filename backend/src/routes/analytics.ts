import express from "express";
import { prisma } from "../utils/database";
import { asyncHandler } from "../middleware/errorHandler";
import { authenticateToken, requireStaff } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/dashboard",
  requireStaff,
  asyncHandler(async (req: any, res: any) => {
    const timeRange = req.query.timeRange || "30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

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

    const [
      totalRevenue,
      totalSales,
      totalItems,
      lowStockItems,
      revenueByMonth,
      salesByPaymentMethod,
      topCategories,
      recentSales,
    ] = await Promise.all([
      // Total revenue
      prisma.saleWeekly.aggregate({
        where: { timeStamp: { gte: startDate } },
        _sum: { price: true },
      }),

      // Total sales count
      prisma.saleWeekly.count({
        where: { timeStamp: { gte: startDate } },
      }),

      // Total inventory items
      prisma.inventory.count(),

      // Low stock items
      prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM inventory 
      WHERE inventory_quantity <= min_stock_level
    `,

      // Revenue by month
      prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(time_stamp, '%Y-%m') as month,
        SUM(price) as revenue,
        COUNT(*) as sales_count
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate}
      GROUP BY DATE_FORMAT(time_stamp, '%Y-%m')
      ORDER BY month ASC
    `,

      // Sales by payment method
      prisma.saleWeekly.groupBy({
        by: ["paymentMethod"],
        where: { timeStamp: { gte: startDate } },
        _sum: { price: true },
        _count: true,
      }),

      // Top selling categories
      prisma.saleWeekly.groupBy({
        by: ["category"],
        where: { timeStamp: { gte: startDate } },
        _sum: { quantity: true, price: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),

      // Recent sales
      prisma.saleWeekly.findMany({
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
          lowStockItems: (lowStockItems as any)[0]?.count || 0,
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
  })
);

/**
 * @swagger
 * /analytics/inventory:
 *   get:
 *     summary: Get inventory analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/inventory",
  requireStaff,
  asyncHandler(async (req: any, res: any) => {
    const [
      stockLevels,
      categoryDistribution,
      stockMovements,
      topMovingItems,
      stockValue,
    ] = await Promise.all([
      // Stock levels overview
      prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN inventory_quantity = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN inventory_quantity <= min_stock_level AND inventory_quantity > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN inventory_quantity > min_stock_level AND inventory_quantity < max_stock_level THEN 1 END) as normal_stock,
        COUNT(CASE WHEN inventory_quantity >= max_stock_level THEN 1 END) as overstock
      FROM inventory
    `,

      // Inventory by category
      prisma.inventory.groupBy({
        by: ["categoryName"],
        _count: true,
        _sum: { inventoryQuantity: true },
      }),

      // Recent stock movements
      prisma.stockMovement.findMany({
        take: 20,
        orderBy: { movementDate: "desc" },
        include: {
          item: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),

      // Top moving items (most stock movements)
      prisma.stockMovement.groupBy({
        by: ["itemId"],
        _count: true,
        _sum: { quantity: true },
        orderBy: { _count: { _all: "desc" } },
        take: 10,
      }),

      // Total inventory value
      prisma.$queryRaw`
      SELECT 
        SUM(inventory_quantity * unit_cost) as total_cost_value,
        SUM(inventory_quantity * selling_price) as total_selling_value
      FROM inventory
    `,
    ]);

    res.json({
      success: true,
      data: {
        stockLevels: (stockLevels as any)[0],
        categoryDistribution,
        stockMovements,
        topMovingItems,
        stockValue: (stockValue as any)[0],
      },
    });
  })
);

/**
 * @swagger
 * /analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/sales",
  requireStaff,
  asyncHandler(async (req: any, res: any) => {
    const timeRange = req.query.timeRange || "30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

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

    const [
      salesTrends,
      topProducts,
      salesByHour,
      salesByDay,
      customerAnalysis,
      profitAnalysis,
    ] = await Promise.all([
      // Sales trends
      prisma.$queryRaw`
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

      // Top selling products
      prisma.saleWeekly.groupBy({
        by: ["itemName"],
        where: { timeStamp: { gte: startDate } },
        _sum: { quantity: true, price: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),

      // Sales by hour of day
      prisma.$queryRaw`
      SELECT 
        HOUR(time_stamp) as hour,
        COUNT(*) as sales_count,
        SUM(price) as revenue
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate}
      GROUP BY HOUR(time_stamp)
      ORDER BY hour ASC
    `,

      // Sales by day of week
      prisma.$queryRaw`
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

      // Customer analysis
      prisma.saleWeekly.groupBy({
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

      // Profit analysis
      prisma.$queryRaw`
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
  })
);

/**
 * @swagger
 * /analytics/forecast:
 *   get:
 *     summary: Get demand forecast data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/forecast",
  requireStaff,
  asyncHandler(async (req: any, res: any) => {
    // Simple moving average forecast for the next 30 days
    const historicalData = await prisma.$queryRaw`
    SELECT 
      DATE(time_stamp) as date,
      SUM(quantity) as total_quantity,
      SUM(price) as total_revenue
    FROM sale_weekly 
    WHERE time_stamp >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY DATE(time_stamp)
    ORDER BY date ASC
  `;

    // Calculate moving averages and trends
    const forecast = [];
    const data = historicalData as any[];

    if (data.length >= 7) {
      // Simple 7-day moving average for forecast
      const lastWeekAvg =
        data
          .slice(-7)
          .reduce((sum, day) => sum + Number(day.total_quantity), 0) / 7;
      const revenueAvg =
        data
          .slice(-7)
          .reduce((sum, day) => sum + Number(day.total_revenue), 0) / 7;

      // Generate forecast for next 30 days
      for (let i = 1; i <= 30; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);

        forecast.push({
          date: forecastDate.toISOString().split("T")[0],
          predicted_quantity: Math.round(lastWeekAvg),
          predicted_revenue: Math.round(revenueAvg),
          confidence: Math.max(0.5, 1 - i / 60), // Decreasing confidence over time
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
  })
);

export default router;

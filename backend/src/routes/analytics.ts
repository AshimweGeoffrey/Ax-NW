import express from "express";
import { prisma } from "../utils/database";
import { asyncHandler } from "../middleware/errorHandler";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper to map raw rows and aggregates to numbers
const toNum = (v: any) => (typeof v === "bigint" ? Number(v) : v ?? 0);

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
  requireAdmin,
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
      totalRevenueAgg,
      totalSales,
      totalItems,
      lowStockItemsRaw,
      revenueByMonthRaw,
      salesByPaymentMethodRaw,
      topCategoriesRaw,
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
      prisma.$queryRaw<any[]>`SELECT COUNT(*) as count FROM inventory WHERE inventory_quantity < 3`,

      // Revenue by month
      prisma.$queryRaw<any[]>`
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
        select: {
          id: true,
          itemName: true,
          quantity: true,
          price: true,
          timeStamp: true,
          userName: true,
        },
      }),
    ]);

    const totalRevenue = toNum(totalRevenueAgg._sum.price || 0);
    const lowStockItems = toNum(lowStockItemsRaw?.[0]?.count || 0);

    const revenueByMonth = (revenueByMonthRaw || []).map((r) => ({
      month: r.month,
      revenue: toNum((r as any).revenue),
      sales_count: toNum((r as any).sales_count),
    }));

    const salesByPaymentMethod = (salesByPaymentMethodRaw || []).map((r) => ({
      paymentMethod: r.paymentMethod || "Unknown",
      _sum: { price: toNum(r._sum?.price) },
      _count: toNum(r._count),
    }));

    const topCategories = (topCategoriesRaw || []).map((r) => ({
      category: r.category || "Unknown",
      _sum: {
        quantity: toNum(r._sum?.quantity),
        price: toNum(r._sum?.price),
      },
      _count: toNum(r._count),
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          totalRevenue,
          totalSales,
          totalItems,
          lowStockItems,
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
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const [stockLevelsRaw, categoryDistributionRaw] = await Promise.all([
      // Stock levels overview
      prisma.$queryRaw<any[]>`SELECT 
        COUNT(CASE WHEN inventory_quantity = 0 THEN 1 END) as out_of_stock,
        COUNT(CASE WHEN inventory_quantity < 3 AND inventory_quantity > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN inventory_quantity >= 3 THEN 1 END) as normal_stock
      FROM inventory`,

      // Inventory by category
      prisma.inventory.groupBy({
        by: ["categoryName"],
        _count: true,
        _sum: { inventoryQuantity: true },
      }),
    ]);

    const stockLevels = {
      out_of_stock: toNum(stockLevelsRaw?.[0]?.out_of_stock),
      low_stock: toNum(stockLevelsRaw?.[0]?.low_stock),
      normal_stock: toNum(stockLevelsRaw?.[0]?.normal_stock),
    };

    const categoryDistribution = (categoryDistributionRaw || []).map((r) => ({
      categoryName: r.categoryName,
      _count: toNum(r._count),
      _sum: { inventoryQuantity: toNum(r._sum?.inventoryQuantity) },
    }));

    res.json({
      success: true,
      data: { stockLevels, categoryDistribution },
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
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const timeRange = req.query.timeRange || "30d";
    const now = new Date();
    let startDate: Date;
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
      default:
        startDate = new Date(now.getTime() - 30 * 86400000);
    }

    const [salesTrendsRaw, salesByHourRaw, salesByDayRaw, paymentBreakdownRaw] =
      await Promise.all([
        prisma.$queryRaw<any[]>`SELECT DATE(time_stamp) as date, COUNT(*) as sales_count, SUM(price) as revenue, SUM(quantity) as items_sold FROM sale_weekly WHERE time_stamp >= ${startDate} GROUP BY DATE(time_stamp) ORDER BY date ASC`,
        prisma.$queryRaw<any[]>`SELECT HOUR(time_stamp) as hour, COUNT(*) as sales_count, SUM(price) as revenue FROM sale_weekly WHERE time_stamp >= ${startDate} GROUP BY HOUR(time_stamp) ORDER BY hour ASC`,
        prisma.$queryRaw<any[]>`SELECT DAYNAME(time_stamp) as day_name, DAYOFWEEK(time_stamp) as day_number, COUNT(*) as sales_count, SUM(price) as revenue FROM sale_weekly WHERE time_stamp >= ${startDate} GROUP BY DAYOFWEEK(time_stamp), DAYNAME(time_stamp) ORDER BY day_number ASC`,
        prisma.saleWeekly.groupBy({
          by: ["paymentMethod"],
          where: { timeStamp: { gte: startDate } },
          _sum: { price: true },
          _count: true,
        }),
      ]);

    const salesTrends = (salesTrendsRaw || []).map((r) => ({
      date: r.date,
      sales_count: toNum((r as any).sales_count),
      revenue: toNum((r as any).revenue),
      items_sold: toNum((r as any).items_sold),
    }));

    const salesByHour = (salesByHourRaw || []).map((r) => ({
      hour: toNum((r as any).hour),
      sales_count: toNum((r as any).sales_count),
      revenue: toNum((r as any).revenue),
    }));

    const salesByDay = (salesByDayRaw || []).map((r) => ({
      day_name: r.day_name,
      day_number: toNum((r as any).day_number),
      sales_count: toNum((r as any).sales_count),
      revenue: toNum((r as any).revenue),
    }));

    const paymentBreakdown = (paymentBreakdownRaw || []).map((r) => ({
      paymentMethod: r.paymentMethod || "Unknown",
      _sum: { price: toNum(r._sum?.price) },
      _count: toNum(r._count),
    }));

    res.json({
      success: true,
      data: {
        salesTrends,
        salesByHour,
        salesByDay,
        paymentBreakdown,
        timeRange,
      },
    });
  })
);

export default router;

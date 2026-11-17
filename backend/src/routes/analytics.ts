import express from "express";
import { prisma } from "../utils/database";
import { asyncHandler } from "../middleware/errorHandler";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper to map raw rows and aggregates to numbers
const toNum = (v: any) => (typeof v === "bigint" ? Number(v) : (v ?? 0));

// Get Monday of the current week (00:00:00)
const getStartOfCurrentWeekMonday = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon,...
  const diffToMonday = (day + 6) % 7; // Sun->6, Mon->0, Tue->1, ...
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diffToMonday,
    0,
    0,
    0,
    0
  );
  return monday;
};

// Parse ISO date (yyyy-mm-dd or ISO string). Returns Date or null
const parseDateParam = (value: any): Date | null => {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Normalize end date to end-of-day
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

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
    const timeRange = (req.query.timeRange as string) || "currentWeek";

    // Optional custom dates
    const startQ = parseDateParam(req.query.startDate);
    const endQ = parseDateParam(req.query.endDate);

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endQ ? endOfDay(endQ) : now;

    if (startQ) {
      startDate = startQ;
    } else {
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
        case "currentWeek":
          startDate = getStartOfCurrentWeekMonday();
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    if (startDate > endDate) {
      // swap if user provided inverted dates
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
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
        where: { timeStamp: { gte: startDate, lte: endDate } },
        _sum: { price: true },
      }),

      // Total sales count
      prisma.saleWeekly.count({
        where: { timeStamp: { gte: startDate, lte: endDate } },
      }),

      // Total inventory items
      prisma.inventory.count(),

      // Low stock items
      prisma.$queryRaw<
        any[]
      >`SELECT COUNT(*) as count FROM inventory WHERE inventory_quantity < 3`,

      // Revenue by month
      prisma.$queryRaw<any[]>`
      SELECT 
        DATE_FORMAT(time_stamp, '%Y-%m') as month,
        SUM(price) as revenue,
        COUNT(*) as sales_count
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate}
      GROUP BY DATE_FORMAT(time_stamp, '%Y-%m')
      ORDER BY month ASC
    `,

      // Sales by payment method (respect selected range)
      prisma.saleWeekly.groupBy({
        by: ["paymentMethod"],
        where: { timeStamp: { gte: startDate, lte: endDate } },
        _sum: { price: true },
        _count: true,
      }),

      // Top selling categories
      prisma.saleWeekly.groupBy({
        by: ["category"],
        where: { timeStamp: { gte: startDate, lte: endDate } },
        _sum: { quantity: true, price: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),

      // Recent sales
      prisma.saleWeekly.findMany({
        take: 10,
        orderBy: { timeStamp: "desc" },
        where: { timeStamp: { gte: startDate, lte: endDate } },
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
        startDate,
        endDate,
      },
    });
  })
);

// ---------- Insights (richer analytics) ----------
const num = (v: any) => Number(v ?? 0);

function resolveRange(q: any): { start: Date; end: Date } {
  const now = new Date();
  const startQ = parseDateParam(q.startDate);
  const endQ = parseDateParam(q.endDate);
  let end = endQ ? endOfDay(endQ) : now;
  let start: Date;
  if (startQ) start = startQ;
  else {
    const days: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
    if (q.timeRange === "currentWeek") start = getStartOfCurrentWeekMonday();
    else start = new Date(now.getTime() - (days[q.timeRange as string] || 30) * 86400000);
  }
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

router.get(
  "/insights",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const { start, end } = resolveRange(req.query);
    const span = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - span);
    const prevEnd = new Date(start.getTime() - 1);
    const q = <T = any>(sql: string, ...args: any[]) => prisma.$queryRawUnsafe<T[]>(sql, ...args);

    const kpiSql = `SELECT COALESCE(SUM(price),0) revenue, COUNT(*) sales, COALESCE(SUM(quantity),0) units,
                           COUNT(DISTINCT user_name) staff
                    FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ?`;

    const [cur, prev, daily, topItems, byCategory, byUser, byPayment, byWeekday, byHour,
      stockTotals, lowList, stockByCategory, slowMovers, outByBranch, outDaily, outTop] =
      await Promise.all([
        q(kpiSql, start, end),
        q(kpiSql, prevStart, prevEnd),
        q(`SELECT DATE_FORMAT(time_stamp,'%Y-%m-%d') day, SUM(price) revenue, COUNT(*) sales, SUM(quantity) units
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY day ORDER BY day`, start, end),
        q(`SELECT item_name name, SUM(quantity) units, SUM(price) revenue, COUNT(*) sales
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? AND item_name IS NOT NULL
           GROUP BY item_name ORDER BY revenue DESC LIMIT 10`, start, end),
        q(`SELECT COALESCE(category,'Unknown') name, SUM(quantity) units, SUM(price) revenue, COUNT(*) sales
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY category ORDER BY revenue DESC`, start, end),
        q(`SELECT COALESCE(user_name,'Unknown') name, COUNT(*) sales, SUM(quantity) units, SUM(price) revenue
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY user_name ORDER BY revenue DESC`, start, end),
        q(`SELECT COALESCE(payment_method,'Unknown') name, COUNT(*) sales, SUM(price) revenue
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY payment_method ORDER BY revenue DESC`, start, end),
        q(`SELECT DAYOFWEEK(time_stamp) dow, COUNT(*) sales, SUM(price) revenue
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY dow ORDER BY dow`, start, end),
        q(`SELECT HOUR(time_stamp) hour, COUNT(*) sales
           FROM sale_weekly WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY hour ORDER BY hour`, start, end),
        q(`SELECT COUNT(*) items, COALESCE(SUM(inventory_quantity),0) units,
                  SUM(inventory_quantity = 0) outOfStock, SUM(inventory_quantity > 0 AND inventory_quantity < 3) lowStock
           FROM inventory`),
        q(`SELECT name, category_name category, inventory_quantity quantity FROM inventory
           WHERE inventory_quantity < 3 ORDER BY inventory_quantity ASC, name ASC LIMIT 15`),
        q(`SELECT category_name name, COUNT(*) items, SUM(inventory_quantity) units
           FROM inventory GROUP BY category_name ORDER BY units DESC`),
        q(`SELECT i.name, i.category_name category, i.inventory_quantity quantity FROM inventory i
           WHERE i.inventory_quantity > 0 AND NOT EXISTS (
             SELECT 1 FROM sale_weekly s WHERE s.item_name = i.name AND s.time_stamp >= ? AND s.time_stamp <= ?)
           ORDER BY i.inventory_quantity DESC LIMIT 10`, start, end),
        q(`SELECT COALESCE(branch_name,'Unassigned') name, SUM(quantity) units, COUNT(*) movements
           FROM outgoing_stock WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY branch_name ORDER BY units DESC`, start, end),
        q(`SELECT DATE_FORMAT(time_stamp,'%Y-%m-%d') day, SUM(quantity) units
           FROM outgoing_stock WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY day ORDER BY day`, start, end),
        q(`SELECT item_name name, SUM(quantity) units FROM outgoing_stock
           WHERE time_stamp >= ? AND time_stamp <= ? GROUP BY item_name ORDER BY units DESC LIMIT 10`, start, end),
      ]);

    const k = (r: any) => ({ revenue: num(r?.revenue), sales: num(r?.sales), units: num(r?.units), staff: num(r?.staff) });
    const c = k(cur[0]);
    const p = k(prev[0]);
    const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : null) : ((a - b) / b) * 100);
    const norm = (rows: any[], keys: string[]) =>
      rows.map((r) => Object.fromEntries(Object.entries(r).map(([key, v]) => [key, keys.includes(key) ? num(v) : v])));

    res.json({
      success: true,
      data: {
        range: { start, end, previousStart: prevStart, previousEnd: prevEnd },
        kpis: {
          ...c,
          avgOrderValue: c.sales ? c.revenue / c.sales : 0,
          previous: p,
          change: {
            revenue: pct(c.revenue, p.revenue),
            sales: pct(c.sales, p.sales),
            units: pct(c.units, p.units),
          },
        },
        daily: norm(daily, ["revenue", "sales", "units"]),
        topItems: norm(topItems, ["units", "revenue", "sales"]),
        byCategory: norm(byCategory, ["units", "revenue", "sales"]),
        byUser: norm(byUser, ["units", "revenue", "sales"]),
        byPayment: norm(byPayment, ["revenue", "sales"]),
        byWeekday: norm(byWeekday, ["dow", "revenue", "sales"]),
        byHour: norm(byHour, ["hour", "sales"]),
        stock: {
          items: num(stockTotals[0]?.items),
          units: num(stockTotals[0]?.units),
          outOfStock: num(stockTotals[0]?.outOfStock),
          lowStock: num(stockTotals[0]?.lowStock),
          lowList: norm(lowList, ["quantity"]),
          byCategory: norm(stockByCategory, ["items", "units"]),
          slowMovers: norm(slowMovers, ["quantity"]),
        },
        outgoing: {
          byBranch: norm(outByBranch, ["units", "movements"]),
          daily: norm(outDaily, ["units"]),
          topItems: norm(outTop, ["units"]),
          totalUnits: outByBranch.reduce((a, r: any) => a + num(r.units), 0),
        },
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
    const timeRange = (req.query.timeRange as string) || "currentWeek";
    const week = (req.query.week as string) || undefined; // e.g. "current"

    const startQ = parseDateParam(req.query.startDate);
    const endQ = parseDateParam(req.query.endDate);

    const now = new Date();

    let startDate: Date;
    let endDate: Date = endQ ? endOfDay(endQ) : now;

    if (startQ) {
      startDate = startQ;
    } else {
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
        case "currentWeek":
          startDate = getStartOfCurrentWeekMonday();
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 86400000);
      }
    }

    if (week === "current") {
      startDate = getStartOfCurrentWeekMonday();
    }

    if (startDate > endDate) {
      const tmp = startDate;
      startDate = endDate;
      endDate = tmp;
    }

    const [salesTrendsRaw, salesByHourRaw, salesByDayRaw, paymentBreakdownRaw] =
      await Promise.all([
        prisma.$queryRaw<
          any[]
        >`SELECT DATE(time_stamp) as date, COUNT(*) as sales_count, SUM(price) as revenue, SUM(quantity) as items_sold FROM sale_weekly WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate} GROUP BY DATE(time_stamp) ORDER BY date ASC`,
        prisma.$queryRaw<
          any[]
        >`SELECT HOUR(time_stamp) as hour, COUNT(*) as sales_count, SUM(price) as revenue FROM sale_weekly WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate} GROUP BY HOUR(time_stamp) ORDER BY hour ASC`,
        prisma.$queryRaw<
          any[]
        >`SELECT DAYNAME(time_stamp) as day_name, DAYOFWEEK(time_stamp) as day_number, SUM(quantity) as items_count, SUM(price) as revenue FROM sale_weekly WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate} GROUP BY DAYOFWEEK(time_stamp), DAYNAME(time_stamp) ORDER BY day_number ASC`,
        prisma.saleWeekly.groupBy({
          by: ["paymentMethod"],
          where: { timeStamp: { gte: startDate, lte: endDate } },
          _sum: { price: true },
          _count: true,
        }),
      ]);

    const salesTrends = (salesTrendsRaw || []).map((r: any) => ({
      date: r.date,
      sales_count: toNum((r as any).sales_count),
      revenue: toNum((r as any).revenue),
      items_sold: toNum((r as any).items_sold),
    }));

    const salesByHour = (salesByHourRaw || []).map((r: any) => ({
      hour: toNum((r as any).hour),
      sales_count: toNum((r as any).sales_count),
      revenue: toNum((r as any).revenue),
    }));

    const rawByDay = (salesByDayRaw || []).map((r: any) => ({
      day_name: r.day_name as string,
      day_number: toNum((r as any).day_number) as number,
      items_count: toNum((r as any).items_count),
      revenue: toNum((r as any).revenue),
    }));

    // Normalize to Monday-Sunday for current week with zero fill
    const mondayFirst = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    let salesByDay = rawByDay as any[];
    if (timeRange === "currentWeek" || week === "current") {
      const map = new Map<string, { items_count: number; revenue: number }>();
      rawByDay.forEach((d: any) =>
        map.set(d.day_name, { items_count: d.items_count, revenue: d.revenue })
      );
      salesByDay = mondayFirst.map((name) => ({
        day_name: name,
        day_number: 0,
        items_count: map.get(name)?.items_count || 0,
        revenue: map.get(name)?.revenue || 0,
      }));
    }

    const paymentBreakdown = (paymentBreakdownRaw || []).map((r: any) => ({
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
        startDate,
        endDate,
      },
    });
  })
);

export default router;

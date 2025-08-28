import express, { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireStaff,
  AuthRequest,
} from "../middleware/auth";
import { randomUUID } from "crypto";

const router = express.Router();
router.use(authenticateToken);

const createSaleSchema = z.object({
  itemName: z.string().min(1).max(64),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  paymentMethod: z.enum(["Cash", "Mobile Money", "Pos"]),
});

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales with pagination and filters
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const paymentMethod = req.query.paymentMethod as string | undefined;
    const product = req.query.product as string | undefined;

    const where: any = {};
    if (startDate && endDate)
      where.timeStamp = { gte: new Date(startDate), lte: new Date(endDate) };
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (product) where.itemName = product;

    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      prisma.saleWeekly.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timeStamp: "desc" },
      }),
      prisma.saleWeekly.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sales,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sale = await prisma.saleWeekly.findUnique({
      where: { id: req.params.id },
    });
    if (!sale) throw createError("Sale not found", 404);
    res.json({ success: true, data: { sale } });
  })
);

/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Create new sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createSaleSchema.parse(req.body);

    const item = await prisma.inventory.findUnique({
      where: { name: data.itemName },
    });
    if (!item) throw createError("Item not found", 404);
    if (item.inventoryQuantity < data.quantity)
      throw createError(
        `Insufficient stock. Available: ${item.inventoryQuantity}`,
        400
      );

    const pay = await prisma.paymentMethod.findUnique({
      where: { name: data.paymentMethod },
    });
    if (!pay) throw createError("Payment method not found", 400);

    const sale = await prisma.saleWeekly.create({
      data: {
        id: randomUUID(),
        itemName: data.itemName,
        category: item.categoryName,
        quantity: data.quantity,
        price: Math.round(data.price),
        userName: req.user?.name || null,
        timeStamp: new Date(),
        paymentMethod: data.paymentMethod,
      },
    });

    res
      .status(201)
      .json({
        success: true,
        data: { sale },
        message: "Sale created successfully",
      });
  })
);

/**
 * @swagger
 * /sales/summary:
 *   get:
 *     summary: Get sales summary and statistics
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/reports/summary",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 86400000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const [totalSales, totalRevenueAgg, salesByPaymentMethodRaw, salesByDayRaw] =
      await Promise.all([
        prisma.saleWeekly.count({
          where: { timeStamp: { gte: startDate, lte: endDate } },
        }),
        prisma.saleWeekly.aggregate({
          where: { timeStamp: { gte: startDate, lte: endDate } },
          _sum: { price: true },
        }),
        prisma.saleWeekly.groupBy({
          by: ["paymentMethod"],
          where: { timeStamp: { gte: startDate, lte: endDate } },
          _sum: { price: true },
          _count: true,
        }),
        prisma.$queryRaw<any[]>`
          SELECT DATE(time_stamp) as date,
                 COUNT(*) as sales_count,
                 SUM(price) as total_revenue,
                 SUM(quantity) as total_quantity
          FROM sale_weekly
          WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate}
          GROUP BY DATE(time_stamp)
          ORDER BY date ASC
        `,
      ]);

    const totalRevenue = Number(totalRevenueAgg._sum.price || 0);

    const salesByPaymentMethod = (salesByPaymentMethodRaw || []).map((r) => ({
      paymentMethod: r.paymentMethod || "Unknown",
      _sum: { price: Number(r._sum?.price || 0) },
      _count: Number(r._count || 0),
    }));

    const salesByDay = (salesByDayRaw || []).map((r) => ({
      date: r.date,
      sales_count: Number((r as any).sales_count || 0),
      revenue: Number((r as any).total_revenue || 0),
      quantity_sold: Number((r as any).total_quantity || 0),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalRevenue,
          averageSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
          dateRange: { startDate, endDate },
        },
        salesByPaymentMethod,
        salesByDay,
      },
    });
  })
);

export default router;

import express from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireStaff,
  AuthRequest,
} from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const createSaleSchema = z.object({
  itemName: z.string().min(1).max(64),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  paymentMethod: z.enum(["Cash", "Mobile Money", "Pos"]),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  branchId: z.string().optional(),
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
  asyncHandler(async (req: any, res: any) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const paymentMethod = req.query.paymentMethod as string;
    const cashier = req.query.cashier as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (startDate && endDate) {
      where.timeStamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (cashier) {
      where.userName = cashier;
    }

    const [sales, total] = await Promise.all([
      prisma.saleWeekly.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true },
          },
          item: {
            select: { name: true, sku: true, sellingPrice: true },
          },
          categoryRel: {
            select: { name: true, colorCode: true },
          },
          payment: true,
          branch: {
            select: { name: true },
          },
        },
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
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
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
  asyncHandler(async (req: any, res: any) => {
    const sale = await prisma.saleWeekly.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { name: true, email: true },
        },
        item: {
          select: { name: true, sku: true, sellingPrice: true, unitCost: true },
        },
        categoryRel: {
          select: { name: true, colorCode: true },
        },
        payment: true,
        branch: {
          select: { name: true, address: true },
        },
      },
    });

    if (!sale) {
      throw createError("Sale not found", 404);
    }

    res.json({
      success: true,
      data: { sale },
    });
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
  asyncHandler(async (req: any, res: any) => {
    const validatedData = createSaleSchema.parse(req.body);

    // Check if item exists and has sufficient stock
    const item = await prisma.inventory.findUnique({
      where: { name: validatedData.itemName },
      include: { category: true },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    if (item.inventoryQuantity < validatedData.quantity) {
      throw createError(
        `Insufficient stock. Available: ${item.inventoryQuantity}`,
        400
      );
    }

    // Check if payment method exists
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { name: validatedData.paymentMethod },
    });

    if (!paymentMethod) {
      throw createError("Payment method not found", 400);
    }

    // Calculate total price
    const unitPrice = validatedData.price || item.sellingPrice;
    const totalPrice =
      Number(unitPrice) * validatedData.quantity -
      validatedData.discountAmount +
      validatedData.taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create sale record
    const sale = await prisma.saleWeekly.create({
      data: {
        invoiceNumber,
        itemName: validatedData.itemName,
        category: item.categoryName,
        quantity: validatedData.quantity,
        price: totalPrice,
        userName: req.user.name,
        paymentMethod: validatedData.paymentMethod,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        discountAmount: validatedData.discountAmount,
        taxAmount: validatedData.taxAmount,
        branchId: validatedData.branchId,
        timeStamp: new Date(),
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        item: {
          select: { name: true, sku: true, sellingPrice: true },
        },
        categoryRel: {
          select: { name: true, colorCode: true },
        },
        payment: true,
      },
    });

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        movementType: "out",
        quantity: validatedData.quantity,
        referenceId: sale.id,
        referenceType: "sale",
        notes: `Sale: ${invoiceNumber}`,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: { sale },
      message: "Sale created successfully",
    });
  })
);

/**
 * @swagger
 * /sales/{id}/return:
 *   post:
 *     summary: Process sale return
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/return",
  requireStaff,
  asyncHandler(async (req: any, res: any) => {
    const { quantity, reason } = req.body;

    const sale = await prisma.saleWeekly.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!sale) {
      throw createError("Sale not found", 404);
    }

    if (quantity > sale.quantity) {
      throw createError("Return quantity cannot exceed sale quantity", 400);
    }

    // Update inventory (add back returned items)
    if (sale.itemName) {
      await prisma.inventory.update({
        where: { name: sale.itemName },
        data: {
          inventoryQuantity: {
            increment: quantity,
          },
        },
      });
    }

    // Create stock movement record for return
    await prisma.stockMovement.create({
      data: {
        itemId: sale.item!.id,
        movementType: "in",
        quantity: quantity,
        referenceId: sale.id,
        referenceType: "adjustment",
        notes: `Return: ${reason || "Customer return"}`,
        userId: req.user.id,
      },
    });

    // Update sale record if partial return
    if (quantity < sale.quantity) {
      const newQuantity = sale.quantity - quantity;
      const newPrice = (sale.price / sale.quantity) * newQuantity;

      await prisma.saleWeekly.update({
        where: { id: sale.id },
        data: {
          quantity: newQuantity,
          price: newPrice,
        },
      });
    } else {
      // Full return - delete sale record
      await prisma.saleWeekly.delete({
        where: { id: sale.id },
      });
    }

    res.json({
      success: true,
      message: `Return processed successfully for ${quantity} items`,
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
  asyncHandler(async (req: any, res: any) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const [
      totalSales,
      totalRevenue,
      salesByPaymentMethod,
      salesByCategory,
      topSellingItems,
      salesByDay,
    ] = await Promise.all([
      prisma.saleWeekly.count({
        where: {
          timeStamp: { gte: startDate, lte: endDate },
        },
      }),
      prisma.saleWeekly.aggregate({
        where: {
          timeStamp: { gte: startDate, lte: endDate },
        },
        _sum: { price: true },
      }),
      prisma.saleWeekly.groupBy({
        by: ["paymentMethod"],
        where: {
          timeStamp: { gte: startDate, lte: endDate },
        },
        _sum: { price: true },
        _count: true,
      }),
      prisma.saleWeekly.groupBy({
        by: ["category"],
        where: {
          timeStamp: { gte: startDate, lte: endDate },
        },
        _sum: { price: true, quantity: true },
        _count: true,
      }),
      prisma.saleWeekly.groupBy({
        by: ["itemName"],
        where: {
          timeStamp: { gte: startDate, lte: endDate },
        },
        _sum: { quantity: true, price: true },
        _count: true,
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      prisma.$queryRaw`
      SELECT 
        DATE(time_stamp) as date,
        COUNT(*) as sales_count,
        SUM(price) as total_revenue,
        SUM(quantity) as total_quantity
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate}
      GROUP BY DATE(time_stamp)
      ORDER BY date ASC
    `,
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalRevenue: totalRevenue._sum.price || 0,
          averageSaleValue:
            totalSales > 0 ? (totalRevenue._sum.price || 0) / totalSales : 0,
          dateRange: { startDate, endDate },
        },
        salesByPaymentMethod,
        salesByCategory,
        topSellingItems,
        salesByDay,
      },
    });
  })
);

export default router;

import express from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { authenticateToken, requireManager } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(32),
  description: z.string().optional(),
  profitPercentage: z.number().min(0).default(0),
  colorCode: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#3B82F6"),
});

const updateCategorySchema = createCategorySchema.partial();

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  asyncHandler(async (req: any, res: any) => {
    const categories = await prisma.category.findMany({
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
  })
);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  asyncHandler(async (req: any, res: any) => {
    const category = await prisma.category.findUnique({
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
      throw createError("Category not found", 404);
    }

    res.json({
      success: true,
      data: { category },
    });
  })
);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = createCategorySchema.parse(req.body);

    // Check if category with same name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: validatedData.name },
    });

    if (existingCategory) {
      throw createError("Category with this name already exists", 400);
    }

    const category = await prisma.category.create({
      data: validatedData,
    });

    res.status(201).json({
      success: true,
      data: { category },
    });
  })
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = updateCategorySchema.parse(req.body);

    const existingCategory = await prisma.category.findUnique({
      where: { id: req.params.id },
    });

    if (!existingCategory) {
      throw createError("Category not found", 404);
    }

    // Check for duplicate name if being updated
    if (validatedData.name) {
      const duplicateCategory = await prisma.category.findUnique({
        where: { name: validatedData.name },
      });

      if (duplicateCategory && duplicateCategory.id !== req.params.id) {
        throw createError("Category with this name already exists", 400);
      }
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: validatedData,
    });

    res.json({
      success: true,
      data: { category },
    });
  })
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
    });

    if (!category) {
      throw createError("Category not found", 404);
    }

    // Check if category has any inventory items
    const inventoryCount = await prisma.inventory.count({
      where: { categoryName: category.name },
    });

    if (inventoryCount > 0) {
      throw createError(
        "Cannot delete category with existing inventory items",
        400
      );
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  })
);

/**
 * @swagger
 * /categories/{id}/performance:
 *   get:
 *     summary: Get category performance analytics
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/performance",
  asyncHandler(async (req: any, res: any) => {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
    });

    if (!category) {
      throw createError("Category not found", 404);
    }

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

    const [salesSummary, topItems, salesTrend] = await Promise.all([
      // Sales summary for this category
      prisma.saleWeekly.aggregate({
        where: {
          category: category.name,
          timeStamp: { gte: startDate },
        },
        _sum: { quantity: true, price: true },
        _count: true,
      }),

      // Top selling items in this category
      prisma.saleWeekly.groupBy({
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

      // Sales trend over time
      prisma.$queryRaw`
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
  })
);

export default router;

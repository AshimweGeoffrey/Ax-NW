import express, { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireStaff,
  requireAdmin,
  AuthRequest,
} from "../middleware/auth";
import { randomUUID } from "crypto";

const router = express.Router();

router.use(authenticateToken);

const createInventorySchema = z.object({
  name: z.string().min(1).max(64),
  categoryName: z.string().min(1).max(32),
  inventoryQuantity: z.number().int().min(0).default(0),
});

const updateInventorySchema = z.object({
  categoryName: z.string().min(1).max(32).optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
});

const adjustSchema = z.object({
  quantityChange: z.number().int(), // positive for restock, negative for reduction
  notes: z.string().optional(),
});

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get all inventory items with pagination and filters
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const search = (req.query.search as string) || "";
    const category = (req.query.category as string) || "";
    const lowStock = req.query.lowStock === "true";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (category) where.categoryName = category;
    if (lowStock) where.inventoryQuantity = { lt: 3 };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.inventory.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
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
 * /inventory/{name}:
 *   get:
 *     summary: Get inventory item by name
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:name",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    res.json({
      success: true,
      data: { item },
    });
  })
);

/**
 * @swagger
 * /inventory:
 *   post:
 *     summary: Create new inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createInventorySchema.parse(req.body);

    const category = await prisma.category.findUnique({
      where: { name: data.categoryName },
    });

    if (!category) {
      throw createError("Category not found", 400);
    }

    const existing = await prisma.inventory.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw createError("Item with this name already exists", 400);
    }

    const item = await prisma.inventory.create({
      data: {
        name: data.name,
        id: randomUUID(),
        categoryName: data.categoryName,
        inventoryQuantity: data.inventoryQuantity,
        incomingTimeStamp: new Date(),
      },
    });

    if (data.inventoryQuantity > 0) {
      await prisma.remark.create({
        data: {
          id: randomUUID(),
          timeStamp: new Date(),
          message: `Initial stock for ${item.name}: +${data.inventoryQuantity}${
            req.user ? ` by ${req.user.name}` : ""
          }`,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: { item },
    });
  })
);

/**
 * @swagger
 * /inventory/{name}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:name",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const changes = updateInventorySchema.parse(req.body);

    const exist = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!exist) {
      throw createError("Item not found", 404);
    }

    const updated = await prisma.inventory.update({
      where: { name: req.params.name },
      data: changes,
    });

    res.json({
      success: true,
      data: { item: updated },
    });
  })
);

/**
 * @swagger
 * /inventory/{name}/adjust:
 *   post:
 *     summary: Adjust inventory stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:name/adjust",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quantityChange, notes } = adjustSchema.parse(req.body);

    const item = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    if (quantityChange < 0 && req.user?.role !== "Administrator") {
      throw createError(
        "Only administrators can reduce stock (negative input)",
        403
      );
    }

    const newQty = item.inventoryQuantity + quantityChange;

    if (newQty < 0) {
      throw createError("Resulting stock cannot be negative", 400);
    }

    const updated = await prisma.inventory.update({
      where: { name: item.name },
      data: { inventoryQuantity: newQty },
    });

    await prisma.remark.create({
      data: {
        id: randomUUID(),
        timeStamp: new Date(),
        message: `Adjust ${item.name}: ${
          quantityChange > 0 ? "+" : ""
        }${quantityChange} by ${req.user?.name || "system"}${
          notes ? ` (${notes})` : ""
        }`,
      },
    });

    res.json({
      success: true,
      data: { item: updated },
      message: "Stock adjusted successfully",
    });
  })
);

/**
 * @swagger
 * /inventory/{name}:
 *   delete:
 *     summary: Delete inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:name",
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    const salesCount = await prisma.saleWeekly.count({
      where: { itemName: item.name },
    });

    if (salesCount > 0) {
      throw createError("Cannot delete item with existing sales", 400);
    }

    await prisma.inventory.delete({
      where: { name: item.name },
    });

    res.json({
      success: true,
      message: "Item deleted successfully",
    });
  })
);

/**
 * @swagger
 * /inventory/low-stock:
 *   get:
 *     summary: Get items with low stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/reports/low-stock",
  requireStaff,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const items = await prisma.inventory.findMany({
      where: { inventoryQuantity: { lt: 3 } },
      orderBy: { inventoryQuantity: "asc" },
    });

    res.json({
      success: true,
      data: { items },
    });
  })
);

export default router;

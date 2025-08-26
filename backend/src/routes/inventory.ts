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
const createInventorySchema = z.object({
  name: z.string().min(1).max(64),
  sku: z.string().optional(),
  categoryName: z.string().min(1).max(32),
  inventoryQuantity: z.number().int().min(0).default(0),
  unitCost: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  minStockLevel: z.number().int().min(0).default(5),
  maxStockLevel: z.number().int().min(1).default(1000),
  supplier: z.string().optional(),
  location: z.string().optional(),
});

const updateInventorySchema = createInventorySchema.partial();

const adjustStockSchema = z.object({
  quantity: z.number().int(),
  type: z.enum(["adjustment", "restock"]),
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
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const lowStock = req.query.lowStock === "true";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.categoryName = category;
    }

    if (lowStock) {
      where.inventoryQuantity = {
        lte: prisma.$queryRaw`inventory_quantity <= min_stock_level`,
      };
    }

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          category: true,
          creator: {
            select: { name: true, email: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
 * /inventory/{id}:
 *   get:
 *     summary: Get inventory item by ID
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res) => {
    const item = await prisma.inventory.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        creator: {
          select: { name: true, email: true },
        },
        stockMovements: {
          take: 10,
          orderBy: { movementDate: "desc" },
          include: {
            user: {
              select: { name: true },
            },
          },
        },
      },
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
  asyncHandler(async (req: AuthRequest, res) => {
    const validatedData = createInventorySchema.parse(req.body);

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { name: validatedData.categoryName },
    });

    if (!category) {
      throw createError("Category not found", 400);
    }

    // Check if item with same name already exists
    const existingItem = await prisma.inventory.findUnique({
      where: { name: validatedData.name },
    });

    if (existingItem) {
      throw createError("Item with this name already exists", 400);
    }

    // Check SKU uniqueness if provided
    if (validatedData.sku) {
      const existingSku = await prisma.inventory.findUnique({
        where: { sku: validatedData.sku },
      });

      if (existingSku) {
        throw createError("Item with this SKU already exists", 400);
      }
    }

    const item = await prisma.inventory.create({
      data: {
        ...validatedData,
        createdBy: req.user!.id,
        incomingTimeStamp: new Date(),
      },
      include: {
        category: true,
        creator: {
          select: { name: true, email: true },
        },
      },
    });

    // Create stock movement record
    if (validatedData.inventoryQuantity > 0) {
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          movementType: "in",
          quantity: validatedData.inventoryQuantity,
          referenceType: "adjustment",
          notes: "Initial stock",
          userId: req.user!.id,
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
 * /inventory/{id}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res) => {
    const validatedData = updateInventorySchema.parse(req.body);

    const existingItem = await prisma.inventory.findUnique({
      where: { id: req.params.id },
    });

    if (!existingItem) {
      throw createError("Item not found", 404);
    }

    // Check if category exists (if being updated)
    if (validatedData.categoryName) {
      const category = await prisma.category.findUnique({
        where: { name: validatedData.categoryName },
      });

      if (!category) {
        throw createError("Category not found", 400);
      }
    }

    const item = await prisma.inventory.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        category: true,
        creator: {
          select: { name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: { item },
    });
  })
);

/**
 * @swagger
 * /inventory/{id}/adjust:
 *   post:
 *     summary: Adjust inventory stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/adjust",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res) => {
    const { quantity, type, notes } = adjustStockSchema.parse(req.body);

    const item = await prisma.inventory.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    const newQuantity = item.inventoryQuantity + quantity;

    if (newQuantity < 0) {
      throw createError("Insufficient stock for this adjustment", 400);
    }

    // Update inventory quantity
    const updatedItem = await prisma.inventory.update({
      where: { id: req.params.id },
      data: { inventoryQuantity: newQuantity },
      include: { category: true },
    });

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        movementType: quantity > 0 ? "in" : "out",
        quantity: Math.abs(quantity),
        referenceType: type,
        notes,
        userId: req.user!.id,
      },
    });

    res.json({
      success: true,
      data: { item: updatedItem },
      message: "Stock adjusted successfully",
    });
  })
);

/**
 * @swagger
 * /inventory/{id}:
 *   delete:
 *     summary: Delete inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res) => {
    const item = await prisma.inventory.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    // Check if item has any sales or stock movements
    const [salesCount, movementsCount] = await Promise.all([
      prisma.saleWeekly.count({ where: { itemName: item.name } }),
      prisma.stockMovement.count({ where: { itemId: item.id } }),
    ]);

    if (salesCount > 0 || movementsCount > 0) {
      throw createError(
        "Cannot delete item with existing sales or stock movements",
        400
      );
    }

    await prisma.inventory.delete({
      where: { id: req.params.id },
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
  asyncHandler(async (req: AuthRequest, res) => {
    const items = await prisma.$queryRaw`
    SELECT i.*, c.name as categoryName, c.color_code as categoryColor
    FROM inventory i
    JOIN category c ON i.category_name = c.name
    WHERE i.inventory_quantity <= i.min_stock_level
    ORDER BY (i.inventory_quantity / i.min_stock_level) ASC
  `;

    res.json({
      success: true,
      data: { items },
    });
  })
);

export default router;

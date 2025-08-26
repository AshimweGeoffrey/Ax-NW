import express from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { authenticateToken, requireManager } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const createBranchSchema = z.object({
  name: z.string().min(1).max(16),
  address: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(),
});

const updateBranchSchema = createBranchSchema.partial();

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  asyncHandler(async (req: any, res: any) => {
    const branches = await prisma.branch.findMany({
      include: {
        manager: {
          select: { name: true, email: true },
        },
        outgoingStock: {
          take: 5,
          orderBy: { timeStamp: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: { branches },
    });
  })
);

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  asyncHandler(async (req: any, res: any) => {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        manager: {
          select: { name: true, email: true },
        },
        outgoingStock: {
          take: 10,
          orderBy: { timeStamp: "desc" },
          include: {
            item: { select: { name: true } },
            user: { select: { name: true } },
          },
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
          },
        },
      },
    });

    if (!branch) {
      throw createError("Branch not found", 404);
    }

    res.json({
      success: true,
      data: { branch },
    });
  })
);

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Create new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = createBranchSchema.parse(req.body);

    // Check if branch with same name already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { name: validatedData.name },
    });

    if (existingBranch) {
      throw createError("Branch with this name already exists", 400);
    }

    // Check if manager exists (if provided)
    if (validatedData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validatedData.managerId },
      });

      if (!manager) {
        throw createError("Manager not found", 400);
      }
    }

    const branch = await prisma.branch.create({
      data: validatedData,
      include: {
        manager: {
          select: { name: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { branch },
    });
  })
);

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: Update branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = updateBranchSchema.parse(req.body);

    const existingBranch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });

    if (!existingBranch) {
      throw createError("Branch not found", 404);
    }

    // Check for duplicate name if being updated
    if (validatedData.name) {
      const duplicateBranch = await prisma.branch.findUnique({
        where: { name: validatedData.name },
      });

      if (duplicateBranch && duplicateBranch.id !== req.params.id) {
        throw createError("Branch with this name already exists", 400);
      }
    }

    // Check if manager exists (if being updated)
    if (validatedData.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: validatedData.managerId },
      });

      if (!manager) {
        throw createError("Manager not found", 400);
      }
    }

    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        manager: {
          select: { name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: { branch },
    });
  })
);

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Delete branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });

    if (!branch) {
      throw createError("Branch not found", 404);
    }

    // Check if branch has any outgoing stock or sales
    const [stockCount, salesCount] = await Promise.all([
      prisma.outgoingStock.count({ where: { branchName: branch.name } }),
      prisma.saleWeekly.count({ where: { branchId: branch.id } }),
    ]);

    if (stockCount > 0 || salesCount > 0) {
      throw createError(
        "Cannot delete branch with existing stock movements or sales",
        400
      );
    }

    await prisma.branch.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Branch deleted successfully",
    });
  })
);

export default router;

import express from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { authenticateToken, requireManager } from "../middleware/auth";
import { randomUUID } from "crypto";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas (branch schema only has id & name in current Prisma model)
const createBranchSchema = z.object({
  name: z.string().min(1).max(16),
});

const updateBranchSchema = z.object({
  name: z.string().min(1).max(16).optional(),
});

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
        outgoingStock: {
          take: 5,
          orderBy: { timeStamp: "desc" },
          include: {
            item: { select: { name: true } },
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: { branches } });
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
    // Param may be branch id (non-unique column) or branch name (PK). Prefer exact name match first.
    let branch = await prisma.branch.findUnique({
      where: { name: req.params.id },
    });
    if (!branch) {
      branch = await prisma.branch.findFirst({ where: { id: req.params.id } });
    }
    if (!branch) throw createError("Branch not found", 404);

    const enriched = await prisma.branch.findUnique({
      where: { name: branch.name },
      include: {
        outgoingStock: {
          take: 10,
          orderBy: { timeStamp: "desc" },
          include: {
            item: { select: { name: true } },
            user: { select: { name: true } },
          },
        },
      },
    });

    res.json({ success: true, data: { branch: enriched } });
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
    const validated = createBranchSchema.parse(req.body);

    const existingByName = await prisma.branch.findUnique({
      where: { name: validated.name },
    });
    if (existingByName)
      throw createError("Branch with this name already exists", 400);

    const branch = await prisma.branch.create({
      data: { id: randomUUID(), name: validated.name },
    });

    res.status(201).json({ success: true, data: { branch } });
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
    const validated = updateBranchSchema.parse(req.body);

    // Locate branch
    let branch = await prisma.branch.findUnique({
      where: { name: req.params.id },
    });
    if (!branch)
      branch = await prisma.branch.findFirst({ where: { id: req.params.id } });
    if (!branch) throw createError("Branch not found", 404);

    // Duplicate name check
    if (validated.name && validated.name !== branch.name) {
      const dup = await prisma.branch.findUnique({
        where: { name: validated.name },
      });
      if (dup) throw createError("Branch with this name already exists", 400);
    }

    const updated = await prisma.branch.update({
      where: { name: branch.name },
      data: { name: validated.name ?? branch.name },
    });

    res.json({ success: true, data: { branch: updated } });
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
    let branch = await prisma.branch.findUnique({
      where: { name: req.params.id },
    });
    if (!branch)
      branch = await prisma.branch.findFirst({ where: { id: req.params.id } });
    if (!branch) throw createError("Branch not found", 404);

    // Check if branch has any outgoing stock
    const stockCount = await prisma.outgoingStock.count({
      where: { branchName: branch.name },
    });
    if (stockCount > 0) {
      throw createError(
        "Cannot delete branch with existing stock movements",
        400
      );
    }

    await prisma.branch.delete({ where: { name: branch.name } });
    res.json({ success: true, message: "Branch deleted successfully" });
  })
);

export default router;

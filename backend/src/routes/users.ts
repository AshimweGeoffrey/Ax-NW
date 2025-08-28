import express from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireAdmin,
  requireManager,
} from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1).max(32),
  email: z.string().email().max(32),
  password: z.string().min(6).max(50),
  accessControl: z
    .enum(["Administrator", "Sale_Manager", "Staff", "Auditor"])
    .default("Staff"),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  email: z.string().email().max(32).optional(),
  accessControl: z
    .enum(["Administrator", "Sale_Manager", "Staff", "Auditor"])
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.accessControl = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          accessControl: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
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

    if (!user) {
      throw createError("User not found", 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = createUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name: validatedData.name }, { email: validatedData.email }],
      },
    });

    if (existingUser) {
      throw createError("User with this username or email already exists", 400);
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { user },
    });
  })
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = updateUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existingUser) {
      throw createError("User not found", 404);
    }

    // Check for duplicate name or email if being updated
    if (validatedData.name || validatedData.email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: req.params.id } },
            {
              OR: [
                validatedData.name ? { name: validatedData.name } : {},
                validatedData.email ? { email: validatedData.email } : {},
              ],
            },
          ],
        },
      });

      if (duplicateUser) {
        throw createError(
          "User with this username or email already exists",
          400
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deactivate user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    // Don't allow deletion of the last administrator
    if (user.accessControl === "Administrator") {
      const adminCount = await prisma.user.count({
        where: { accessControl: "Administrator", isActive: true },
      });

      if (adminCount <= 1) {
        throw createError("Cannot deactivate the last administrator", 400);
      }
    }

    // Deactivate user instead of deleting
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  })
);

/**
 * @swagger
 * /users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/reset-password",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw createError("New password must be at least 6 characters long", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    // Hash new password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  })
);

export default router;

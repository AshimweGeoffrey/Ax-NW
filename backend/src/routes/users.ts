import express from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireAdmin,
  requireManager,
} from "../middleware/auth";
import { randomUUID } from "crypto";

const router = express.Router();
router.use(authenticateToken);

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
});

// Helper to resolve user by parameter (tries name primary key first, then id column)
async function resolveUser(param: string) {
  let user = await prisma.user.findUnique({ where: { name: param } });
  if (!user) user = await prisma.user.findFirst({ where: { id: param } });
  return user;
}

// List users
router.get(
  "/",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) where.accessControl = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, accessControl: true },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

// Get user
router.get(
  "/:id",
  requireManager,
  asyncHandler(async (req: any, res: any) => {
    const user = await resolveUser(req.params.id);
    if (!user) throw createError("User not found", 404);

    const detailed = await prisma.user.findUnique({
      where: { name: user.name },
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
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

    res.json({ success: true, data: { user: detailed } });
  })
);

// Create user
router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name: validatedData.name }, { email: validatedData.email }],
      },
    });
    if (existingUser)
      throw createError("User with this username or email already exists", 400);

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        accessControl: validatedData.accessControl,
      },
      select: { id: true, name: true, email: true, accessControl: true },
    });

    res.status(201).json({ success: true, data: { user } });
  })
);

// Update user
router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const validatedData = updateUserSchema.parse(req.body);
    const existingUser = await resolveUser(req.params.id);
    if (!existingUser) throw createError("User not found", 404);

    if (validatedData.name || validatedData.email) {
      const duplicate = await prisma.user.findFirst({
        where: {
          AND: [
            { name: { not: existingUser.name } },
            {
              OR: [
                validatedData.name ? { name: validatedData.name } : {},
                validatedData.email ? { email: validatedData.email } : {},
              ],
            },
          ],
        },
      });
      if (duplicate)
        throw createError(
          "User with this username or email already exists",
          400
        );
    }

    const user = await prisma.user.update({
      where: { name: existingUser.name },
      data: {
        name: validatedData.name ?? existingUser.name,
        email: validatedData.email ?? existingUser.email,
        accessControl:
          validatedData.accessControl ?? existingUser.accessControl,
      },
      select: { id: true, name: true, email: true, accessControl: true },
    });

    res.json({ success: true, data: { user } });
  })
);

// Deactivate (logical delete not supported by schema, so real delete forbidden) -> perform password nulling? We'll keep deletion blocked.
router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const existingUser = await resolveUser(req.params.id);
    if (!existingUser) throw createError("User not found", 404);

    if (existingUser.accessControl === "Administrator") {
      const adminCount = await prisma.user.count({
        where: { accessControl: "Administrator" },
      });
      if (adminCount <= 1)
        throw createError("Cannot remove the last administrator", 400);
    }

    // Hard delete is risky; instead return error (schema has no isActive). If needed, implement by clearing password.
    // For now block.
    throw createError("Deletion disabled; no soft-delete field in schema", 400);
  })
);

// Reset password
router.post(
  "/:id/reset-password",
  requireAdmin,
  asyncHandler(async (req: any, res: any) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      throw createError("New password must be at least 6 characters long", 400);

    const existingUser = await resolveUser(req.params.id);
    if (!existingUser) throw createError("User not found", 404);

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { name: existingUser.name },
      data: { password: hashedPassword },
    });
    res.json({ success: true, message: "Password reset successfully" });
  })
);

export default router;

import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(1).max(32),
  email: z.string().email().max(32),
  password: z.string().min(6).max(50),
  accessControl: z
    .enum(["Administrator", "Sale_Manager", "Staff", "Auditor"])
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(50),
});

// Helper function to generate tokens
const generateTokens = (user: any) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.accessControl,
    },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken };
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { name: username },
    });

    if (!user || !user.password) {
      throw createError("Invalid credentials", 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      throw createError("Account is deactivated", 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.accessControl,
          lastLogin: user.lastLogin,
        },
        accessToken,
        refreshToken,
      },
    });
  })
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/register",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    // Only administrators can register new users
    if (req.user?.role !== "Administrator") {
      throw createError("Only administrators can register new users", 403);
    }

    const { name, email, password, accessControl } = registerSchema.parse(
      req.body
    );

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name }, { email }],
      },
    });

    if (existingUser) {
      throw createError("User with this username or email already exists", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        accessControl: accessControl || "Staff",
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.accessControl,
        },
      },
    });
  })
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
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
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/change-password",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.password) {
      throw createError("User not found", 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw createError("Current password is incorrect", 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  })
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError("Refresh token required", 401);
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw createError("User not found or inactive", 401);
      }

      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(user);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      throw createError("Invalid refresh token", 401);
    }
  })
);

export default router;

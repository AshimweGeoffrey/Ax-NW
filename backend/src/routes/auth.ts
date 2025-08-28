import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { randomUUID } from "crypto";
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

const generateTokens = (user: any) => {
  const jwtSecret = process.env.JWT_SECRET as Secret;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as Secret;

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error("JWT secrets not configured");
  }

  const accessPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.accessControl,
  };
  const accessToken = jwt.sign(accessPayload, jwtSecret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || "24h",
  });

  const refreshPayload = { userId: user.id };
  const refreshToken = jwt.sign(refreshPayload, jwtRefreshSecret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || "7d",
  });

  return { accessToken, refreshToken };
};

router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { name: username },
    });

    if (!user || !user.password) {
      throw createError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError("Invalid credentials", 401);
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.accessControl,
        },
        accessToken,
        refreshToken,
      },
    });
  })
);

router.post(
  "/register",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== "Administrator") {
      throw createError("Access denied", 403);
    }

    const { name, email, password, accessControl } = registerSchema.parse(
      req.body
    );

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name }, { email }],
      },
    });

    if (existingUser) {
      throw createError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        accessControl: accessControl || "Staff",
        id: randomUUID(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accessControl: user.accessControl,
        },
      },
    });
  })
);

router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { name: req.user!.name },
    });

    res.json({
      success: true,
      data: {
        user: user && {
          id: user.id,
          name: user.name,
          email: user.email,
          accessControl: user.accessControl,
        },
      },
    });
  })
);

router.post(
  "/change-password",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const user = await prisma.user.findUnique({
      where: { name: req.user!.name },
    });

    if (!user || !user.password) {
      throw createError("User not found", 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw createError("Invalid current password", 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { name: user.name },
      data: { password: hashedNewPassword },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  })
);

router.post(
  "/refresh-token",
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError("Refresh token is required", 400);
    }

    try {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as Secret;
      if (!jwtRefreshSecret) {
        throw createError("JWT refresh secret not configured", 500);
      }

      const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as {
        userId: string;
      };

      const user = await prisma.user.findFirst({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw createError("User not found", 401);
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

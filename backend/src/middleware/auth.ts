import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/database";
import { createError } from "./errorHandler";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throw createError("Access token required", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        accessControl: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw createError("User not found or inactive", 401);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.accessControl || "staff",
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError("Invalid token", 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createError("Insufficient permissions", 403));
    }

    next();
  };
};

export const requireAdmin = requireRole(["Administrator"]);
export const requireManager = requireRole(["Administrator", "Sale_Manager"]);
export const requireStaff = requireRole([
  "Administrator",
  "Sale_Manager",
  "Staff",
]);

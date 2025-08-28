import express, { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireStaff,
  AuthRequest,
} from "../middleware/auth";
import { randomUUID } from "crypto";

const router = express.Router();

router.use(authenticateToken);

const createRemarkSchema = z.object({
  message: z.string().min(1).max(1000),
});

/**
 * @swagger
 * /remarks:
 *   get:
 *     summary: List remarks (daily notices) ordered by date desc
 *     tags: [Remarks]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  requireStaff,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const items = await prisma.remark.findMany({
      orderBy: { timeStamp: "desc" },
    });
    res.json({ success: true, data: { items } });
  })
);

/**
 * @swagger
 * /remarks:
 *   post:
 *     summary: Create a new remark (daily notice)
 *     tags: [Remarks]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message } = createRemarkSchema.parse(req.body);
    const remark = await prisma.remark.create({
      data: {
        id: randomUUID(),
        timeStamp: new Date(),
        message,
      },
    });
    res.status(201).json({ success: true, data: { remark } });
  })
);

export default router;

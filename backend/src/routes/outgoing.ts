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

const createOutgoingSchema = z.object({
  itemName: z.string().min(1).max(64),
  quantity: z.number().int().min(1),
  branchName: z.string().min(1).max(16).optional(),
});

router.get(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const product = req.query.product as string | undefined;

    const where: any = {};
    if (startDate && endDate)
      where.timeStamp = { gte: new Date(startDate), lte: new Date(endDate) };
    if (product) where.itemName = product;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.outgoingStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timeStamp: "desc" },
      }),
      prisma.outgoingStock.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

router.post(
  "/",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createOutgoingSchema.parse(req.body);
    const item = await prisma.inventory.findUnique({
      where: { name: data.itemName },
    });
    if (!item) throw createError("Item not found", 404);
    if (item.inventoryQuantity < data.quantity)
      throw createError(
        `Insufficient stock. Available: ${item.inventoryQuantity}`,
        400
      );

    const record = await prisma.outgoingStock.create({
      data: {
        id: randomUUID(),
        itemName: data.itemName,
        categoryName: item.categoryName,
        userName: req.user?.name || null,
        branchName: data.branchName || null,
        quantity: data.quantity,
        timeStamp: new Date(),
      },
    });

    res
      .status(201)
      .json({ success: true, data: { record }, message: "Outgoing recorded" });
  })
);

router.delete(
  "/:id",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const rec = await prisma.outgoingStock.findUnique({
      where: { id: req.params.id },
    });
    if (!rec) throw createError("Record not found", 404);
    await prisma.outgoingStock.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Outgoing removed" });
  })
);

export default router;

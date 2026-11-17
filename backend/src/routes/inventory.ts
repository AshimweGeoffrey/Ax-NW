import express, { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/database";
import { asyncHandler, createError } from "../middleware/errorHandler";
import {
  authenticateToken,
  requireStaff,
  requireManager,
  requireAdmin,
  AuthRequest,
} from "../middleware/auth";
import { randomUUID } from "crypto";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";

const router = express.Router();

router.use(authenticateToken);

// ---------- CSV import / template ----------
const MAX_IMPORT_ROWS = 5000;
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /\.csv$/i.test(file.originalname) ? cb(null, true) : cb(new Error("Only .csv files are allowed")),
});

const HEADER_ALIASES: Record<string, string> = {
  name: "name", item: "name", "item name": "name", item_name: "name",
  category: "category", category_name: "category", "category name": "category",
  quantity: "quantity", qty: "quantity", inventory_quantity: "quantity", stock: "quantity",
};

router.get(
  "/template",
  requireStaff,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const cats = await prisma.category.findMany({ orderBy: { name: "asc" }, take: 2 });
    const c1 = cats[0]?.name || "General";
    const c2 = cats[1]?.name || c1;
    const csv = ["name,category,quantity", `Sample Item A,${c1},10`, `Sample Item B,${c2},25`].join("\r\n") + "\r\n";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory_template.csv"');
    res.send(csv);
  })
);

router.post(
  "/import",
  requireManager,
  (req, res, next) =>
    csvUpload.single("file")(req, res, (err: any) =>
      err ? next(createError(err.message || "Upload failed", 400)) : next()
    ),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw createError("Attach a CSV file in the 'file' field", 400);
    const mode = req.body?.mode === "skip" ? "skip" : "add"; // add = add quantity to existing items

    const rows: Record<string, string>[] = await new Promise((resolve, reject) => {
      const out: Record<string, string>[] = [];
      Readable.from(file.buffer)
        .pipe(
          csvParser({
            mapHeaders: ({ header }: { header: string }) =>
              HEADER_ALIASES[header.replace(/^\uFEFF/, "").trim().toLowerCase()] || null,
          })
        )
        .on("data", (r: Record<string, string>) => out.push(r))
        .on("end", () => resolve(out))
        .on("error", reject);
    });

    if (rows.length === 0) throw createError("CSV has no data rows (expected columns: name, category, quantity)", 400);
    if (rows.length > MAX_IMPORT_ROWS) throw createError(`Too many rows (max ${MAX_IMPORT_ROWS})`, 400);
    if (!("name" in rows[0]) || !("category" in rows[0]) || !("quantity" in rows[0]))
      throw createError("CSV must have columns: name, category, quantity", 400);

    const cats = await prisma.category.findMany();
    const catByLower = new Map(cats.map((c) => [c.name.toLowerCase(), c.name]));
    const existing = await prisma.inventory.findMany({ select: { name: true } });
    const itemByLower = new Map<string, string>();
    for (const i of existing) {
      const key = i.name.trim().toLowerCase(); // tolerate legacy names with stray spaces
      if (!itemByLower.has(key)) itemByLower.set(key, i.name);
    }

    const result = { created: 0, updated: 0, skipped: 0, errors: [] as { row: number; message: string }[] };
    const now = new Date();
    const seen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNo = i + 2; // header is row 1
      const name = (rows[i].name || "").trim();
      const catRaw = (rows[i].category || "").trim();
      const qtyRaw = (rows[i].quantity || "").trim();
      const fail = (message: string) => result.errors.push({ row: rowNo, message });

      if (!name && !catRaw && !qtyRaw) continue; // blank line
      if (!name || name.length > 64) { fail("Name is required (max 64 chars)"); continue; }
      const category = catByLower.get(catRaw.toLowerCase());
      if (!category) { fail(`Unknown category "${catRaw}" (create it on the Categories page first)`); continue; }
      if (!/^\d+$/.test(qtyRaw)) { fail(`Quantity must be a whole number >= 0 (got "${qtyRaw}")`); continue; }
      const qty = parseInt(qtyRaw, 10);
      if (seen.has(name.toLowerCase())) { fail(`Duplicate item "${name}" in file`); continue; }
      seen.add(name.toLowerCase());

      try {
        const existingName = itemByLower.get(name.toLowerCase());
        if (existingName) {
          if (mode === "skip") { result.skipped++; continue; }
          await prisma.inventory.update({
            where: { name: existingName },
            data: { inventoryQuantity: { increment: qty }, incomingTimeStamp: qty > 0 ? now : undefined },
          });
          if (qty > 0) {
            await prisma.$executeRawUnsafe(
              "UPDATE `inventory` SET `recent_entry` = ?, `recent_entry_at` = ? WHERE `name` = ?",
              qty, now, existingName
            );
          }
          result.updated++;
        } else {
          await prisma.inventory.create({
            data: { id: randomUUID(), name, categoryName: category, inventoryQuantity: qty, incomingTimeStamp: now },
          });
          if (qty > 0) {
            await prisma.$executeRawUnsafe(
              "UPDATE `inventory` SET `recent_entry` = ?, `recent_entry_at` = ? WHERE `name` = ?",
              qty, now, name
            );
          }
          result.created++;
        }
      } catch (e: any) {
        fail(e?.message?.split("\n").pop() || "Failed to save row");
      }
    }

    await prisma.remark.create({
      data: {
        id: randomUUID(),
        timeStamp: now,
        message: `CSV import by ${req.user?.name || "unknown"}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
      },
    });

    res.json({ success: true, data: result });
  })
);

const createInventorySchema = z.object({
  name: z.string().min(1).max(64),
  categoryName: z.string().min(1).max(32),
  inventoryQuantity: z.number().int().min(0).default(0),
});

const updateInventorySchema = z.object({
  categoryName: z.string().min(1).max(32).optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
});

const adjustSchema = z.object({
  quantityChange: z.number().int(), // positive for restock, negative for reduction
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "100");
    const search = (req.query.search as string) || "";
    const category = (req.query.category as string) || "";
    const lowStock = req.query.lowStock === "true";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) where.name = { contains: search };
    if (category) where.categoryName = category;
    if (lowStock) where.inventoryQuantity = { lt: 3 };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
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
 * /inventory/{name}:
 *   get:
 *     summary: Get inventory item by name
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:name",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = await prisma.inventory.findUnique({
      where: { name: req.params.name },
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createInventorySchema.parse(req.body);

    const category = await prisma.category.findUnique({
      where: { name: data.categoryName },
    });

    if (!category) {
      throw createError("Category not found", 400);
    }

    const existing = await prisma.inventory.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw createError("Item with this name already exists", 400);
    }

    const now = new Date();
    const item = await prisma.inventory.create({
      data: {
        name: data.name,
        id: randomUUID(),
        categoryName: data.categoryName,
        inventoryQuantity: data.inventoryQuantity,
        incomingTimeStamp: now,
      },
    });

    // Set recent_entry via raw SQL to avoid Prisma client mismatches
    if (data.inventoryQuantity > 0) {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE `inventory` SET `recent_entry` = ?, `recent_entry_at` = ? WHERE `name` = ?",
          data.inventoryQuantity,
          now,
          item.name
        );
      } catch {
        // Ignore if column doesn't exist yet
      }

      await prisma.remark.create({
        data: {
          id: randomUUID(),
          timeStamp: now,
          message: `Initial stock for ${item.name}: +${data.inventoryQuantity}${
            req.user ? ` by ${req.user.name}` : ""
          }`,
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
 * /inventory/{name}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:name",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const changes = updateInventorySchema.parse(req.body);

    const exist = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!exist) {
      throw createError("Item not found", 404);
    }

    const updateData: any = {};
    let positiveDelta: number | null = null;

    if (typeof changes.categoryName === "string") {
      updateData.categoryName = changes.categoryName;
    }

    if (typeof changes.inventoryQuantity === "number") {
      const newQty = changes.inventoryQuantity;
      if (newQty < 0) throw createError("Quantity cannot be negative", 400);
      const delta = newQty - exist.inventoryQuantity;
      if (delta < 0 && req.user?.role !== "Administrator") {
        throw createError(
          "Only administrators can reduce stock (negative input)",
          403
        );
      }
      updateData.inventoryQuantity = newQty;
      if (delta > 0) positiveDelta = delta;
    }

    if (Object.keys(updateData).length === 0) {
      throw createError("No changes to apply", 400);
    }

    const updated = await prisma.inventory.update({
      where: { name: req.params.name },
      data: updateData,
    });

    // If this PUT increased quantity, set recent_entry fields and add a remark
    if (positiveDelta && positiveDelta > 0) {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE `inventory` SET `recent_entry` = ?, `recent_entry_at` = ? WHERE `name` = ?",
          positiveDelta,
          new Date(),
          updated.name
        );
      } catch {
        // non-critical notification failure
      }

      await prisma.remark.create({
        data: {
          id: randomUUID(),
          timeStamp: new Date(),
          message: `Adjust ${updated.name}: +${positiveDelta} by ${
            req.user?.name || "system"
          } (absolute update)`,
        },
      });
    }

    res.json({
      success: true,
      data: { item: updated },
    });
  })
);

/**
 * @swagger
 * /inventory/{name}/adjust:
 *   post:
 *     summary: Adjust inventory stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:name/adjust",
  requireStaff,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quantityChange, notes } = adjustSchema.parse(req.body);

    const item = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    if (quantityChange < 0 && req.user?.role !== "Administrator") {
      throw createError(
        "Only administrators can reduce stock (negative input)",
        403
      );
    }

    const newQty = item.inventoryQuantity + quantityChange;

    if (newQty < 0) {
      throw createError("Resulting stock cannot be negative", 400);
    }

    const updated = await prisma.inventory.update({
      where: { name: item.name },
      data: { inventoryQuantity: newQty },
    });

    // Update recent_entry via raw SQL on positive additions
    if (quantityChange > 0) {
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE `inventory` SET `recent_entry` = ?, `recent_entry_at` = ? WHERE `name` = ?",
          quantityChange,
          new Date(),
          item.name
        );
      } catch {
        // Ignore if column doesn't exist yet
      }
    }

    await prisma.remark.create({
      data: {
        id: randomUUID(),
        timeStamp: new Date(),
        message: `Adjust ${item.name}: ${
          quantityChange > 0 ? "+" : ""
        }${quantityChange} by ${req.user?.name || "system"}${
          notes ? ` (${notes})` : ""
        }`,
      },
    });

    res.json({
      success: true,
      data: { item: updated },
      message: "Stock adjusted successfully",
    });
  })
);

/**
 * @swagger
 * /inventory/{name}:
 *   delete:
 *     summary: Delete inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:name",
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = await prisma.inventory.findUnique({
      where: { name: req.params.name },
    });

    if (!item) {
      throw createError("Item not found", 404);
    }

    const salesCount = await prisma.saleWeekly.count({
      where: { itemName: item.name },
    });

    if (salesCount > 0) {
      throw createError("Cannot delete item with existing sales", 400);
    }

    await prisma.inventory.delete({
      where: { name: item.name },
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
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const items = await prisma.inventory.findMany({
      where: { inventoryQuantity: { lt: 3 } },
      orderBy: { inventoryQuantity: "asc" },
    });

    res.json({
      success: true,
      data: { items },
    });
  })
);

export default router;

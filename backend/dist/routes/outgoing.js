"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const database_1 = require("../utils/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const crypto_1 = require("crypto");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
const createOutgoingSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1).max(64),
    quantity: zod_1.z.number().int().min(1),
    branchName: zod_1.z.string().min(1).max(16).optional(),
});
router.get("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const product = req.query.product;
    const where = {};
    if (startDate && endDate)
        where.timeStamp = { gte: new Date(startDate), lte: new Date(endDate) };
    if (product)
        where.itemName = product;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        database_1.prisma.outgoingStock.findMany({ where, skip, take: limit, orderBy: { timeStamp: "desc" } }),
        database_1.prisma.outgoingStock.count({ where }),
    ]);
    res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}));
router.post("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = createOutgoingSchema.parse(req.body);
    const item = await database_1.prisma.inventory.findUnique({ where: { name: data.itemName } });
    if (!item)
        throw (0, errorHandler_1.createError)("Item not found", 404);
    if (item.inventoryQuantity < data.quantity)
        throw (0, errorHandler_1.createError)(`Insufficient stock. Available: ${item.inventoryQuantity}`, 400);
    const record = await database_1.prisma.outgoingStock.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            itemName: data.itemName,
            categoryName: item.categoryName,
            userName: req.user?.name || null,
            branchName: data.branchName || null,
            quantity: data.quantity,
            timeStamp: new Date(),
        },
    });
    res.status(201).json({ success: true, data: { record }, message: "Outgoing recorded" });
}));
router.delete("/:id", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rec = await database_1.prisma.outgoingStock.findUnique({ where: { id: req.params.id } });
    if (!rec)
        throw (0, errorHandler_1.createError)("Record not found", 404);
    await database_1.prisma.outgoingStock.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Outgoing removed" });
}));
exports.default = router;
//# sourceMappingURL=outgoing.js.map
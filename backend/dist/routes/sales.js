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
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
const createSaleSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1).max(64),
    quantity: zod_1.z.number().int().min(1),
    price: zod_1.z.number().min(0),
    paymentMethod: zod_1.z.enum(["Cash", "Mobile Money", "Pos"]),
    customerName: zod_1.z.string().optional(),
    customerPhone: zod_1.z.string().optional(),
    discountAmount: zod_1.z.number().min(0).default(0),
    taxAmount: zod_1.z.number().min(0).default(0),
    branchId: zod_1.z.string().optional(),
});
router.get("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const paymentMethod = req.query.paymentMethod;
    const cashier = req.query.cashier;
    const skip = (page - 1) * limit;
    const where = {};
    if (startDate && endDate) {
        where.timeStamp = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }
    if (paymentMethod) {
        where.paymentMethod = paymentMethod;
    }
    if (cashier) {
        where.userName = cashier;
    }
    const [sales, total] = await Promise.all([
        database_1.prisma.saleWeekly.findMany({
            where,
            include: {
                user: {
                    select: { name: true, email: true },
                },
                item: {
                    select: { name: true, sku: true, sellingPrice: true },
                },
                categoryRel: {
                    select: { name: true, colorCode: true },
                },
                payment: true,
                branch: {
                    select: { name: true },
                },
            },
            skip,
            take: limit,
            orderBy: { timeStamp: "desc" },
        }),
        database_1.prisma.saleWeekly.count({ where }),
    ]);
    res.json({
        success: true,
        data: {
            sales,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
router.get("/:id", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const sale = await database_1.prisma.saleWeekly.findUnique({
        where: { id: req.params.id },
        include: {
            user: {
                select: { name: true, email: true },
            },
            item: {
                select: { name: true, sku: true, sellingPrice: true, unitCost: true },
            },
            categoryRel: {
                select: { name: true, colorCode: true },
            },
            payment: true,
            branch: {
                select: { name: true, address: true },
            },
        },
    });
    if (!sale) {
        throw (0, errorHandler_1.createError)("Sale not found", 404);
    }
    res.json({
        success: true,
        data: { sale },
    });
}));
router.post("/", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = createSaleSchema.parse(req.body);
    const item = await database_1.prisma.inventory.findUnique({
        where: { name: validatedData.itemName },
        include: { category: true },
    });
    if (!item) {
        throw (0, errorHandler_1.createError)("Item not found", 404);
    }
    if (item.inventoryQuantity < validatedData.quantity) {
        throw (0, errorHandler_1.createError)(`Insufficient stock. Available: ${item.inventoryQuantity}`, 400);
    }
    const paymentMethod = await database_1.prisma.paymentMethod.findUnique({
        where: { name: validatedData.paymentMethod },
    });
    if (!paymentMethod) {
        throw (0, errorHandler_1.createError)("Payment method not found", 400);
    }
    const unitPrice = validatedData.price || item.sellingPrice;
    const totalPrice = Number(unitPrice) * validatedData.quantity -
        validatedData.discountAmount +
        validatedData.taxAmount;
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sale = await database_1.prisma.saleWeekly.create({
        data: {
            invoiceNumber,
            itemName: validatedData.itemName,
            category: item.categoryName,
            quantity: validatedData.quantity,
            price: totalPrice,
            userName: req.user.name,
            paymentMethod: validatedData.paymentMethod,
            customerName: validatedData.customerName,
            customerPhone: validatedData.customerPhone,
            discountAmount: validatedData.discountAmount,
            taxAmount: validatedData.taxAmount,
            branchId: validatedData.branchId,
            timeStamp: new Date(),
        },
        include: {
            user: {
                select: { name: true, email: true },
            },
            item: {
                select: { name: true, sku: true, sellingPrice: true },
            },
            categoryRel: {
                select: { name: true, colorCode: true },
            },
            payment: true,
        },
    });
    await database_1.prisma.stockMovement.create({
        data: {
            itemId: item.id,
            movementType: "out",
            quantity: validatedData.quantity,
            referenceId: sale.id,
            referenceType: "sale",
            notes: `Sale: ${invoiceNumber}`,
            userId: req.user.id,
        },
    });
    res.status(201).json({
        success: true,
        data: { sale },
        message: "Sale created successfully",
    });
}));
router.post("/:id/return", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { quantity, reason } = req.body;
    const sale = await database_1.prisma.saleWeekly.findUnique({
        where: { id: req.params.id },
        include: { item: true },
    });
    if (!sale) {
        throw (0, errorHandler_1.createError)("Sale not found", 404);
    }
    if (quantity > sale.quantity) {
        throw (0, errorHandler_1.createError)("Return quantity cannot exceed sale quantity", 400);
    }
    await database_1.prisma.inventory.update({
        where: { name: sale.itemName },
        data: {
            inventoryQuantity: {
                increment: quantity,
            },
        },
    });
    await database_1.prisma.stockMovement.create({
        data: {
            itemId: sale.item.id,
            movementType: "in",
            quantity: quantity,
            referenceId: sale.id,
            referenceType: "adjustment",
            notes: `Return: ${reason || "Customer return"}`,
            userId: req.user.id,
        },
    });
    if (quantity < sale.quantity) {
        const newQuantity = sale.quantity - quantity;
        const newPrice = (sale.price / sale.quantity) * newQuantity;
        await database_1.prisma.saleWeekly.update({
            where: { id: sale.id },
            data: {
                quantity: newQuantity,
                price: newPrice,
            },
        });
    }
    else {
        await database_1.prisma.saleWeekly.delete({
            where: { id: sale.id },
        });
    }
    res.json({
        success: true,
        message: `Return processed successfully for ${quantity} items`,
    });
}));
router.get("/reports/summary", auth_1.requireStaff, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
        ? new Date(req.query.endDate)
        : new Date();
    const [totalSales, totalRevenue, salesByPaymentMethod, salesByCategory, topSellingItems, salesByDay,] = await Promise.all([
        database_1.prisma.saleWeekly.count({
            where: {
                timeStamp: { gte: startDate, lte: endDate },
            },
        }),
        database_1.prisma.saleWeekly.aggregate({
            where: {
                timeStamp: { gte: startDate, lte: endDate },
            },
            _sum: { price: true },
        }),
        database_1.prisma.saleWeekly.groupBy({
            by: ["paymentMethod"],
            where: {
                timeStamp: { gte: startDate, lte: endDate },
            },
            _sum: { price: true },
            _count: true,
        }),
        database_1.prisma.saleWeekly.groupBy({
            by: ["category"],
            where: {
                timeStamp: { gte: startDate, lte: endDate },
            },
            _sum: { price: true, quantity: true },
            _count: true,
        }),
        database_1.prisma.saleWeekly.groupBy({
            by: ["itemName"],
            where: {
                timeStamp: { gte: startDate, lte: endDate },
            },
            _sum: { quantity: true, price: true },
            _count: true,
            orderBy: { _sum: { quantity: "desc" } },
            take: 10,
        }),
        database_1.prisma.$queryRaw `
      SELECT 
        DATE(time_stamp) as date,
        COUNT(*) as sales_count,
        SUM(price) as total_revenue,
        SUM(quantity) as total_quantity
      FROM sale_weekly 
      WHERE time_stamp >= ${startDate} AND time_stamp <= ${endDate}
      GROUP BY DATE(time_stamp)
      ORDER BY date ASC
    `,
    ]);
    res.json({
        success: true,
        data: {
            summary: {
                totalSales,
                totalRevenue: totalRevenue._sum.price || 0,
                averageSaleValue: totalSales > 0 ? (totalRevenue._sum.price || 0) / totalSales : 0,
                dateRange: { startDate, endDate },
            },
            salesByPaymentMethod,
            salesByCategory,
            topSellingItems,
            salesByDay,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=sales.js.map
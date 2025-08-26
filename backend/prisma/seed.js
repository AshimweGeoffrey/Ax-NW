"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting database seeding...");
    console.log("📊 Creating payment methods...");
    await prisma.paymentMethod.createMany({
        data: [
            { paymentId: "PM001", name: "Mobile Money", totalWeekly: 0 },
            { paymentId: "PM002", name: "Pos", totalWeekly: 0 },
            { paymentId: "PM003", name: "Cash", totalWeekly: 0 },
        ],
        skipDuplicates: true,
    });
    console.log("📁 Creating categories...");
    const categories = [
        { name: "General", description: "General items", colorCode: "#3B82F6" },
        {
            name: "Basic needs",
            description: "Essential items",
            colorCode: "#10B981",
        },
        { name: "Shoes", description: "Footwear", colorCode: "#F59E0B" },
        {
            name: "General Clothes",
            description: "Clothing items",
            colorCode: "#EF4444",
        },
        { name: "Bag", description: "Bags and accessories", colorCode: "#8B5CF6" },
        {
            name: "Football",
            description: "Football equipment",
            colorCode: "#06B6D4",
        },
        {
            name: "Basketball",
            description: "Basketball equipment",
            colorCode: "#F97316",
        },
        { name: "Tennis", description: "Tennis equipment", colorCode: "#84CC16" },
        {
            name: "Volleyball",
            description: "Volleyball equipment",
            colorCode: "#EC4899",
        },
        {
            name: "Swimming",
            description: "Swimming equipment",
            colorCode: "#6366F1",
        },
        {
            name: "General Mechanics",
            description: "Mechanical items",
            colorCode: "#64748B",
        },
    ];
    for (const category of categories) {
        await prisma.category.upsert({
            where: { name: category.name },
            update: {},
            create: {
                name: category.name,
                description: category.description,
                percentage: "0%",
                profitPercentage: 0,
                colorCode: category.colorCode,
            },
        });
    }
    console.log("🏢 Creating branches...");
    const branches = [
        { name: "Town", address: "Downtown Area", phone: "+250123456789" },
        { name: "Csk", address: "CSK Area", phone: "+250123456790" },
        { name: "Eto_Gesi", address: "Eto Gesi Area", phone: "+250123456791" },
    ];
    for (const branch of branches) {
        await prisma.branch.upsert({
            where: { name: branch.name },
            update: {},
            create: branch,
        });
    }
    console.log("👤 Creating default users...");
    const hashedPassword = await bcryptjs_1.default.hash("admin123", 12);
    await prisma.user.upsert({
        where: { name: "admin" },
        update: {},
        create: {
            name: "admin",
            email: "admin@axstock.com",
            password: hashedPassword,
            accessControl: "Administrator",
            isActive: true,
        },
    });
    const existingUsers = [
        {
            name: "Ashimwe_Geoffrey",
            email: "ashimwegeoffrey@gmail.com",
            password: await bcryptjs_1.default.hash("Geoffrey@2024", 12),
            accessControl: "Administrator",
        },
        {
            name: "Muvunyi_Jimmy",
            email: "muvunyijdieu1@gmail.com",
            password: await bcryptjs_1.default.hash("Jimmy@2024", 12),
            accessControl: "Sale_Manager",
        },
        {
            name: "Sibomana_Eugene",
            email: "sibomanaeugene69@gmail.com",
            password: await bcryptjs_1.default.hash("Eugene@2024", 12),
            accessControl: "Auditor",
        },
    ];
    for (const user of existingUsers) {
        await prisma.user.upsert({
            where: { name: user.name },
            update: {},
            create: user,
        });
    }
    console.log("📦 Creating sample inventory...");
    const sampleItems = [
        {
            name: "Nike Air Max",
            sku: "NK-AM-001",
            categoryName: "Shoes",
            inventoryQuantity: 50,
            unitCost: 25000,
            sellingPrice: 35000,
            minStockLevel: 5,
            maxStockLevel: 100,
            supplier: "Nike Supplier",
            location: "Warehouse A",
        },
        {
            name: "Adidas T-Shirt",
            sku: "AD-TS-001",
            categoryName: "General Clothes",
            inventoryQuantity: 75,
            unitCost: 8000,
            sellingPrice: 12000,
            minStockLevel: 10,
            maxStockLevel: 150,
            supplier: "Adidas Supplier",
            location: "Warehouse B",
        },
        {
            name: "Football Size 5",
            sku: "FB-S5-001",
            categoryName: "Football",
            inventoryQuantity: 30,
            unitCost: 15000,
            sellingPrice: 22000,
            minStockLevel: 5,
            maxStockLevel: 50,
            supplier: "Sports Supplier",
            location: "Warehouse C",
        },
        {
            name: "School Backpack",
            sku: "SB-BP-001",
            categoryName: "Bag",
            inventoryQuantity: 25,
            unitCost: 12000,
            sellingPrice: 18000,
            minStockLevel: 3,
            maxStockLevel: 40,
            supplier: "Bag Supplier",
            location: "Warehouse A",
        },
    ];
    const adminUser = await prisma.user.findUnique({ where: { name: "admin" } });
    for (const item of sampleItems) {
        await prisma.inventory.upsert({
            where: { name: item.name },
            update: {},
            create: {
                ...item,
                createdBy: adminUser?.id,
                incomingTimeStamp: new Date(),
            },
        });
    }
    console.log("⚙️ Creating system settings...");
    const settings = [
        {
            keyName: "company_name",
            value: "AX Stock Management",
            description: "Company name",
            category: "general",
        },
        {
            keyName: "currency",
            value: "RWF",
            description: "Default currency",
            category: "general",
        },
        {
            keyName: "tax_rate",
            value: "18",
            description: "Default tax rate percentage",
            category: "financial",
        },
        {
            keyName: "low_stock_threshold",
            value: "5",
            description: "Default low stock threshold",
            category: "inventory",
        },
        {
            keyName: "auto_backup",
            value: "true",
            description: "Enable automatic database backup",
            category: "system",
        },
    ];
    for (const setting of settings) {
        await prisma.settings.upsert({
            where: { keyName: setting.keyName },
            update: {},
            create: {
                ...setting,
                updatedBy: adminUser?.id,
            },
        });
    }
    console.log("✅ Database seeding completed successfully!");
}
main()
    .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
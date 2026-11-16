import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding (idempotent)...");

  for (const name of ["Mobile Money", "Card", "Cash"]) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: {},
      create: { name, paymentId: randomUUID(), totalWeekly: 0 },
    });
  }

  for (const name of ["Town", "Csk", "Eto_Gesi"]) {
    await prisma.branch.upsert({
      where: { name },
      update: {},
      create: { name, id: randomUUID() },
    });
  }

  for (const name of ["General", "Shoes", "Bag", "Football"]) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, id: randomUUID(), percentage: "0%" },
    });
  }

  const existing = await prisma.user.findUnique({ where: { name: "admin" } });
  if (existing) {
    console.log("👤 admin already exists, leaving it untouched");
  } else {
    const password = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
    await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "admin",
        email: "admin@example.com",
        password: await bcrypt.hash(password, 12),
        accessControl: "Administrator",
      },
    });
    console.log(
      process.env.SEED_ADMIN_PASSWORD
        ? "👤 Created admin (password from SEED_ADMIN_PASSWORD)"
        : `👤 Created admin with generated password: ${password}`
    );
  }
  console.log("✅ Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

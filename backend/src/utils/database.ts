import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });
  }
  prisma = global.__prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");

    // Ensure MySQL session uses local time zone for this connection
    // Prefer explicit offset to avoid reliance on timezone tables in the container
    const tzOffset =
      process.env.DB_TZ_OFFSET || process.env.TZ_OFFSET || "+02:00"; // Africa/Kigali
    try {
      await prisma.$executeRawUnsafe(`SET time_zone = '${tzOffset}'`);
      const [{ session_tz, now }] = (await prisma.$queryRawUnsafe<any[]>(
        "SELECT @@session.time_zone AS session_tz, NOW() AS now"
      )) as any[];
      logger.info(
        `🕒 MySQL session time_zone set to ${session_tz} (server NOW: ${new Date(now).toISOString()})`
      );
    } catch (err) {
      logger.warn(
        "⚠️ Failed to set MySQL session time_zone; times may be UTC",
        err as any
      );
    }
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info("✅ Database disconnected successfully");
  } catch (error) {
    logger.error("❌ Database disconnection failed:", error);
    throw error;
  }
}

export { prisma };

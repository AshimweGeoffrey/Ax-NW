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

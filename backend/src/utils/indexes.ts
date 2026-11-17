import { prisma } from "./database";
import { logger } from "./logger";

// Date columns drive every analytics query and "newest first" list, but the
// original schema has no index on them. Created once, idempotently, at start.
const INDEXES: { table: string; name: string; column: string }[] = [
  { table: "sale_weekly", name: "idx_sale_time", column: "time_stamp" },
  { table: "outgoing_stock", name: "idx_outgoing_time", column: "time_stamp" },
  { table: "remark", name: "idx_remark_time", column: "time_stamp" },
];

export async function ensureIndexes() {
  for (const ix of INDEXES) {
    try {
      const found = await prisma.$queryRawUnsafe<any[]>(
        "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
        ix.table,
        ix.name
      );
      if (found.length === 0) {
        await prisma.$executeRawUnsafe(`CREATE INDEX \`${ix.name}\` ON \`${ix.table}\` (\`${ix.column}\`)`);
        logger.info(`Created index ${ix.name} on ${ix.table}`);
      }
    } catch (e: any) {
      logger.warn(`Could not ensure index ${ix.name}`, { error: e?.message });
    }
  }
}

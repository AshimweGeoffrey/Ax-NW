import express from "express";
import { prisma } from "../utils/database";
import { asyncHandler } from "../middleware/errorHandler";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole(["Administrator", "Auditor"]));

const toNum = (v: any) => (typeof v === "bigint" ? Number(v) : Number(v ?? 0));

router.get(
  "/",
  asyncHandler(async (req: any, res: any) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const where: string[] = [];
    const args: any[] = [];

    if (req.query.user) { where.push("user_name = ?"); args.push(String(req.query.user)); }
    if (req.query.method) { where.push("method = ?"); args.push(String(req.query.method).toUpperCase()); }
    if (req.query.outcome === "failed") where.push("status >= 400");
    if (req.query.outcome === "success") where.push("status < 400");
    if (req.query.search) {
      where.push("(path LIKE ? OR details LIKE ? OR user_name LIKE ?)");
      const q = `%${req.query.search}%`;
      args.push(q, q, q);
    }
    if (req.query.from) { where.push("time_stamp >= ?"); args.push(new Date(req.query.from)); }
    if (req.query.to) {
      const d = new Date(req.query.to); d.setHours(23, 59, 59, 999);
      where.push("time_stamp <= ?"); args.push(d);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows, totalRows, users, stats] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT id, time_stamp AS timeStamp, user_name AS userName, role, method, path, status, ip, details
         FROM audit_log ${clause} ORDER BY time_stamp DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        ...args
      ),
      prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) AS c FROM audit_log ${clause}`, ...args),
      prisma.$queryRawUnsafe<any[]>("SELECT DISTINCT user_name AS u FROM audit_log WHERE user_name IS NOT NULL ORDER BY u"),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS total,
                SUM(status >= 400) AS failed,
                SUM(path LIKE '%/auth/login' AND status >= 400) AS failedLogins,
                COUNT(DISTINCT user_name) AS activeUsers
         FROM audit_log WHERE time_stamp >= NOW() - INTERVAL 24 HOUR`
      ),
    ]);

    const total = toNum(totalRows[0]?.c);
    res.json({
      success: true,
      data: {
        items: rows.map((r) => ({ ...r, status: toNum(r.status) })),
        users: users.map((u) => u.u),
        last24h: {
          total: toNum(stats[0]?.total),
          failed: toNum(stats[0]?.failed),
          failedLogins: toNum(stats[0]?.failedLogins),
          activeUsers: toNum(stats[0]?.activeUsers),
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  })
);

export default router;

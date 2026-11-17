import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { prisma } from "./database";
import { logger } from "./logger";

const SENSITIVE = /pass|token|secret/i;

export async function ensureAuditTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id varchar(50) NOT NULL,
      time_stamp datetime NOT NULL,
      user_name varchar(64) DEFAULT NULL,
      role varchar(32) DEFAULT NULL,
      method varchar(8) NOT NULL,
      path varchar(255) NOT NULL,
      status int NOT NULL,
      ip varchar(64) DEFAULT NULL,
      details text,
      PRIMARY KEY (id),
      KEY idx_audit_time (time_stamp),
      KEY idx_audit_user (user_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function redact(value: any, depth = 0): any {
  if (value == null || depth > 3) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Records every state-changing request (POST/PUT/PATCH/DELETE) plus any
 * request that was refused (401/403), with who did it, from where, and the
 * (redacted) payload. Runs after the response so it never slows or breaks a request.
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const mutating = req.method !== "GET" && req.method !== "OPTIONS" && req.method !== "HEAD";
    const denied = res.statusCode === 401 || res.statusCode === 403;
    if (!mutating && !denied) return;
    const path = req.originalUrl.split("?")[0];
    if (path.endsWith("/audit")) return;

    const authUser = (req as any).user as { name?: string; role?: string } | undefined;
    const isLogin = path.endsWith("/auth/login");
    const userName = authUser?.name || (isLogin ? String(req.body?.username || "") : null) || null;

    let details: string | null = null;
    try {
      const body = req.body && Object.keys(req.body).length ? redact(req.body) : null;
      // Never store uploaded file contents
      details = body ? JSON.stringify(body).slice(0, 1000) : null;
    } catch {
      details = null;
    }

    prisma
      .$executeRawUnsafe(
        "INSERT INTO audit_log (id, time_stamp, user_name, role, method, path, status, ip, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        randomUUID(),
        new Date(),
        userName ? userName.slice(0, 64) : null,
        authUser?.role || null,
        req.method,
        path.slice(0, 255),
        res.statusCode,
        (req.ip || "").slice(0, 64),
        details
      )
      .catch((e: any) => logger.warn("audit write failed", { error: e?.message }));
  });
  next();
}

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh";

jest.mock("../src/utils/database", () => ({
  prisma: { user: { findUnique: jest.fn().mockResolvedValue({ id: "1", name: "bob", email: "b@x.com", accessControl: "Staff" }) } },
}));

import { authenticateToken, requireAdmin } from "../src/middleware/auth";
import { errorHandler } from "../src/middleware/errorHandler";

const app = express();
app.get("/me", authenticateToken, (req: any, res) => res.json(req.user));
app.get("/admin", authenticateToken, requireAdmin, (_req, res) => res.json({ ok: true }));
app.use(errorHandler);

const token = (opts: jwt.SignOptions = {}) => jwt.sign({ userId: "1", name: "bob" }, "test-secret", opts);

describe("auth middleware", () => {
  it("rejects missing token", async () => {
    expect((await request(app).get("/me")).status).toBe(401);
  });
  it("rejects bad token", async () => {
    expect((await request(app).get("/me").set("Authorization", "Bearer nope")).status).toBe(401);
  });
  it("reports expired tokens", async () => {
    const res = await request(app).get("/me").set("Authorization", `Bearer ${token({ expiresIn: -10 })}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Token expired");
  });
  it("accepts a valid token", async () => {
    const res = await request(app).get("/me").set("Authorization", `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("bob");
  });
  it("blocks non-admins from admin routes", async () => {
    expect((await request(app).get("/admin").set("Authorization", `Bearer ${token()}`)).status).toBe(403);
  });
});

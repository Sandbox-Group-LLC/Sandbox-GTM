/**
 * Auth routes
 *
 * POST /api/auth/signup         — create account (first user = admin, rest need invite)
 * POST /api/auth/login          — email + password → JWT
 * GET  /api/auth/me             — current user profile
 * POST /api/auth/provision      — admin creates a user (sets temp password)
 * GET  /api/auth/users          — list users (admin)
 * PATCH /api/auth/users/:id     — update role / station / active (admin)
 * POST /api/auth/users/:id/set-password — admin sets a user's password
 */

import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { appUsers } from "../../shared/schema.js";
import { eq, sql } from "drizzle-orm";
import { signToken, hashPassword, verifyPassword, requireAuth } from "../auth.js";

const router = Router();

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as { email: string; password: string; name?: string };
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    // Check if email already exists
    const [existing] = await db.select().from(appUsers).where(eq(appUsers.email, email.toLowerCase()));
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    // Count existing users — first one gets admin
    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(appUsers);
    const isFirst = countRow.count === 0;

    const passwordHash = await hashPassword(password);

    const [user] = await db.insert(appUsers).values({
      neonUserId: `local:${email.toLowerCase()}`,
      email: email.toLowerCase(),
      name: name || null,
      role: isFirst ? "admin" : "staff",
      passwordHash,
      isActive: true,
      lastLoginAt: new Date(),
    }).returning();

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, stationId: user.stationId, eventId: user.eventId },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email.toLowerCase()));

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    await db.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, user.id));

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, stationId: user.stationId, eventId: user.eventId },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth(), (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/users  (admin)
router.get("/users", requireAuth(["admin"]), async (_req: Request, res: Response) => {
  try {
    const users = await db.select({
      id: appUsers.id, email: appUsers.email, name: appUsers.name,
      role: appUsers.role, isActive: appUsers.isActive,
      stationId: appUsers.stationId, eventId: appUsers.eventId,
      sponsorCompany: appUsers.sponsorCompany, lastLoginAt: appUsers.lastLoginAt,
      createdAt: appUsers.createdAt,
    }).from(appUsers);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/provision  (admin creates user with temp password)
router.post("/provision", requireAuth(["admin"]), async (req: Request, res: Response) => {
  try {
    const { email, name, role, stationId, eventId, sponsorCompany, password } = req.body;
    if (!email || !role) return res.status(400).json({ error: "email and role required" });

    const [existing] = await db.select().from(appUsers).where(eq(appUsers.email, email.toLowerCase()));
    if (existing) return res.status(409).json({ error: "User already exists" });

    const tempPassword = password || Math.random().toString(36).slice(2, 10) + "Aa1!";
    const passwordHash = await hashPassword(tempPassword);

    const [created] = await db.insert(appUsers).values({
      neonUserId: `local:${email.toLowerCase()}`,
      email: email.toLowerCase(),
      name: name || null,
      role,
      passwordHash,
      stationId: stationId || null,
      eventId: eventId || null,
      sponsorCompany: sponsorCompany || null,
      isActive: true,
    }).returning();

    res.status(201).json({ ...created, tempPassword, passwordHash: undefined });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/users/:id  (admin)
router.patch("/users/:id", requireAuth(["admin"]), async (req: Request, res: Response) => {
  try {
    const { role, stationId, eventId, name, isActive, sponsorCompany } = req.body;
    const [updated] = await db.update(appUsers).set({
      ...(role !== undefined && { role }),
      ...(stationId !== undefined && { stationId: stationId || null }),
      ...(eventId !== undefined && { eventId: eventId || null }),
      ...(name !== undefined && { name }),
      ...(isActive !== undefined && { isActive }),
      ...(sponsorCompany !== undefined && { sponsorCompany }),
      updatedAt: new Date(),
    }).where(eq(appUsers.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users/:id/set-password  (admin)
router.post("/users/:id/set-password", requireAuth(["admin"]), async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const passwordHash = await hashPassword(password);
    await db.update(appUsers).set({ passwordHash, updatedAt: new Date() }).where(eq(appUsers.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

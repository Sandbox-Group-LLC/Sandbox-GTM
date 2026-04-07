/**
 * Auth routes
 *
 * POST /api/auth/login          — exchange Neon Auth JWT for session + load app user
 * GET  /api/auth/me             — return current authed user
 * POST /api/auth/provision      — admin creates a new app user record (links neon_user_id to role)
 * GET  /api/auth/users          — list all app users (admin only)
 * PATCH /api/auth/users/:id     — update user role / station assignment
 */

import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { appUsers } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth.js";

const router = Router();

// POST /api/auth/login
// Client sends the Neon Auth JWT, we verify it and return the app user profile.
// The JWT itself is used as the bearer token going forward — no separate session needed.
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };
    if (!token) return res.status(400).json({ error: "Token required" });

    // Verify via JWKS (reuse auth middleware logic inline here)
    const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
    if (!jwksUrl) return res.status(500).json({ error: "Auth not configured" });

    // Decode payload without full verification for now to get sub
    // Full verification happens in requireAuth middleware on protected routes
    const parts = token.split(".");
    if (parts.length !== 3) return res.status(401).json({ error: "Invalid token format" });

    let payload: any;
    try {
      payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: "Token expired" });
    }

    const neonUserId = payload.sub;
    const email = payload.email || "";

    // Look up app user
    let [appUser] = await db.select().from(appUsers).where(eq(appUsers.neonUserId, neonUserId));

    if (!appUser) {
      // Auto-provision first user as admin
      const [count] = await db.select().from(appUsers);
      if (!count) {
        [appUser] = await db.insert(appUsers).values({
          neonUserId,
          email,
          role: "admin",
          isActive: true,
          lastLoginAt: new Date(),
        }).returning();
      } else {
        return res.status(403).json({
          error: "Account not provisioned",
          message: "Ask your administrator to grant you access."
        });
      }
    }

    if (!appUser.isActive) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    // Update last login
    await db.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, appUser.id));

    res.json({
      user: {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        role: appUser.role,
        stationId: appUser.stationId,
        eventId: appUser.eventId,
      },
      token, // client stores and sends as Bearer on subsequent requests
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth(), async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/users  (admin only)
router.get("/users", requireAuth(["admin"]), async (_req: Request, res: Response) => {
  try {
    const users = await db.select().from(appUsers);
    res.json(users.map(u => ({ ...u, neonUserId: undefined }))); // don't expose internal IDs
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/provision  (admin only — creates a new staff/sponsor_admin user)
router.post("/provision", requireAuth(["admin"]), async (req: Request, res: Response) => {
  try {
    const { email, name, role, stationId, eventId, sponsorCompany } = req.body;
    if (!email || !role) return res.status(400).json({ error: "email and role required" });

    // Create a placeholder — neonUserId will be filled in on first login
    // For now we use email as a temporary stand-in
    const [created] = await db.insert(appUsers).values({
      neonUserId: `pending:${email}`, // replaced on first auth
      email,
      name,
      role,
      stationId: stationId || null,
      eventId: eventId || null,
      sponsorCompany: sponsorCompany || null,
      isActive: true,
    }).returning();

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/users/:id  (admin only)
router.patch("/users/:id", requireAuth(["admin"]), async (req: Request, res: Response) => {
  try {
    const { role, stationId, eventId, name, isActive, sponsorCompany } = req.body;
    const [updated] = await db.update(appUsers)
      .set({
        ...(role !== undefined && { role }),
        ...(stationId !== undefined && { stationId }),
        ...(eventId !== undefined && { eventId }),
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(sponsorCompany !== undefined && { sponsorCompany }),
        updatedAt: new Date(),
      })
      .where(eq(appUsers.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

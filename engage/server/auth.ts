/**
 * Auth — self-managed bcrypt + JWT
 *
 * We issue our own JWTs signed with a secret stored in JWT_SECRET env var.
 * Passwords are hashed with bcrypt and stored in app_users.password_hash.
 *
 * This keeps auth fully in our control — no external SDK dependencies,
 * no project ID requirements, no black boxes.
 *
 * Neon Auth JWKS URL is kept as an env var for future SSO integration if needed.
 */

import { Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { appUsers } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "engage-jwt-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/engage_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Extend Express Request
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stationId: string | null;
  eventId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function requireAuth(allowedRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const payload = await verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Invalid or expired token" });

    const userId = payload.sub as string;
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.id, userId));

    if (!appUser) return res.status(403).json({ error: "User not found" });
    if (!appUser.isActive) return res.status(403).json({ error: "Account is inactive" });
    if (allowedRoles && !allowedRoles.includes(appUser.role || "")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    req.user = {
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role || "staff",
      stationId: appUser.stationId,
      eventId: appUser.eventId,
    };

    next();
  };
}

export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();
    try {
      const payload = await verifyToken(token);
      if (payload) {
        const [appUser] = await db.select().from(appUsers).where(eq(appUsers.id, payload.sub as string));
        if (appUser?.isActive) {
          req.user = {
            id: appUser.id,
            email: appUser.email,
            name: appUser.name,
            role: appUser.role || "staff",
            stationId: appUser.stationId,
            eventId: appUser.eventId,
          };
        }
      }
    } catch { /* continue unauthenticated */ }
    next();
  };
}

/**
 * Auth — hardened
 *
 * Security posture:
 *   - bcrypt cost 12 for password hashing
 *   - Access token: HS256 JWT, 1h expiry, httpOnly + Secure + SameSite=Strict cookie
 *   - Refresh token: HS256 JWT, 30d expiry, httpOnly + Secure + SameSite=Strict cookie
 *   - Rate limiting on auth routes (handled in server/index.ts)
 *   - Tokens stored in httpOnly cookies — not accessible to JS, eliminates XSS token theft
 *   - requireAuth reads from httpOnly cookie or Authorization header (for API clients)
 */

import { Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { appUsers } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_TTL  = "1h";
const REFRESH_TOKEN_TTL = "30d";
const ACCESS_COOKIE     = "engage_access";
const REFRESH_COOKIE    = "engage_refresh";

const IS_PROD = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be at least 32 chars");
  return new TextEncoder().encode(s);
}

export async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret());
}

export async function signRefreshToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const BASE_COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "strict" as const,
  path: "/",
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...BASE_COOKIE_OPTS,
    maxAge: 60 * 60 * 1000, // 1h
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...BASE_COOKIE_OPTS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
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
// Token extraction — httpOnly cookie first, then Authorization header
// ---------------------------------------------------------------------------

function extractAccessToken(req: Request): string | null {
  // httpOnly cookie (browser)
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
  // Authorization header (API clients / mobile)
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function extractRefreshToken(req: Request): string | null {
  return req.cookies?.[REFRESH_COOKIE] || null;
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
// Core user loader
// ---------------------------------------------------------------------------

async function loadUser(userId: string): Promise<AuthUser | null> {
  const [u] = await db.select().from(appUsers).where(eq(appUsers.id, userId));
  if (!u || !u.isActive) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role || "staff", stationId: u.stationId, eventId: u.eventId };
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function requireAuth(allowedRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let token = extractAccessToken(req);

    // If access token missing or expired, try silent refresh via refresh token
    if (!token) {
      const refresh = extractRefreshToken(req);
      if (refresh) {
        const rPayload = await verifyToken(refresh);
        if (rPayload?.type === "refresh" && rPayload.sub) {
          const user = await loadUser(rPayload.sub as string);
          if (user) {
            const newAccess = await signAccessToken({ sub: user.id, role: user.role });
            res.cookie(ACCESS_COOKIE, newAccess, { ...BASE_COOKIE_OPTS, maxAge: 60 * 60 * 1000 });
            req.user = user;
            if (allowedRoles && !allowedRoles.includes(user.role)) {
              return res.status(403).json({ error: "Insufficient permissions" });
            }
            return next();
          }
        }
      }
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return res.status(401).json({ error: "Invalid or expired token" });

    const user = await loadUser(payload.sub as string);
    if (!user) return res.status(403).json({ error: "User not found or inactive" });

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    req.user = user;
    next();
  };
}

export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractAccessToken(req);
    if (!token) return next();
    try {
      const payload = await verifyToken(token);
      if (payload?.sub) {
        const user = await loadUser(payload.sub as string);
        if (user) req.user = user;
      }
    } catch { /* continue */ }
    next();
  };
}

/**
 * Auth middleware — verifies JWTs issued by Neon Auth (Stack Auth)
 *
 * Neon Auth issues EdDSA-signed JWTs. We verify them against the
 * JWKS endpoint without a DB call on every request.
 *
 * JWT payload shape from Neon Auth:
 *   sub          — Neon Auth user ID
 *   email        — user email
 *   exp          — expiry
 *   iat          — issued at
 *
 * We extend req with:
 *   req.user     — { neonUserId, email, role, id, stationId, eventId }
 */

import { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import { appUsers } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// JWKS key cache — fetched once, refreshed if verification fails
// ---------------------------------------------------------------------------

interface JWK {
  kty: string;
  crv?: string;
  x?: string;
  kid?: string;
  alg?: string;
  use?: string;
}

let cachedKeys: JWK[] = [];
let keysFetchedAt = 0;
const KEY_TTL_MS = 10 * 60 * 1000; // 10 min

async function getJWKS(): Promise<JWK[]> {
  if (cachedKeys.length > 0 && Date.now() - keysFetchedAt < KEY_TTL_MS) {
    return cachedKeys;
  }
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) throw new Error("NEON_AUTH_JWKS_URL not configured");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const data = await res.json() as { keys: JWK[] };
  cachedKeys = data.keys || [];
  keysFetchedAt = Date.now();
  return cachedKeys;
}

// ---------------------------------------------------------------------------
// Minimal EdDSA JWT verification (no external lib needed)
// Neon Auth uses EdDSA (Ed25519) — we verify using Web Crypto API
// ---------------------------------------------------------------------------

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

async function verifyEdDSAJWT(token: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg: string; kid?: string };
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }

  if (header.alg !== "EdDSA") return null;

  const keys = await getJWKS();
  const jwk = header.kid
    ? keys.find(k => k.kid === header.kid)
    : keys[0];

  if (!jwk || !jwk.x) return null;

  try {
    const keyData = base64urlDecode(jwk.x);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData.buffer.slice(keyData.byteOffset, keyData.byteOffset + keyData.byteLength) as ArrayBuffer, { name: "Ed25519" }, false, ["verify"]
    );

    const message = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlDecode(sigB64);

    const sigBuffer = signature.buffer.slice(signature.byteOffset, signature.byteOffset + signature.byteLength) as ArrayBuffer;
    const valid = await crypto.subtle.verify("Ed25519", cryptoKey, sigBuffer, message);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract token from request
// ---------------------------------------------------------------------------

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  // Also check cookie for browser sessions
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/engage_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Extend Express Request
// ---------------------------------------------------------------------------

export interface AuthUser {
  neonUserId: string;
  email: string;
  id: string;           // our appUsers.id
  role: string;         // admin | staff | sponsor_admin
  stationId: string | null;
  eventId: string | null;
  name: string | null;
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

/**
 * requireAuth — verifies JWT, loads app user from DB, attaches to req.user
 * If allowedRoles provided, also enforces role check.
 */
export function requireAuth(allowedRoles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = await verifyEdDSAJWT(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const neonUserId = payload.sub as string;

    // Load our app user record
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.neonUserId, neonUserId));

    if (!appUser) {
      return res.status(403).json({ error: "User not provisioned. Contact your administrator." });
    }

    if (!appUser.isActive) {
      return res.status(403).json({ error: "Account is inactive." });
    }

    if (allowedRoles && !allowedRoles.includes(appUser.role || "")) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }

    req.user = {
      neonUserId,
      email: payload.email as string || appUser.email,
      id: appUser.id,
      role: appUser.role || "staff",
      stationId: appUser.stationId,
      eventId: appUser.eventId,
      name: appUser.name,
    };

    next();
  };
}

/**
 * optionalAuth — attaches user if token present, continues either way
 * Useful for endpoints that behave differently for authed vs anon users
 */
export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();
    try {
      const payload = await verifyEdDSAJWT(token);
      if (payload) {
        const neonUserId = payload.sub as string;
        const [appUser] = await db.select().from(appUsers).where(eq(appUsers.neonUserId, neonUserId));
        if (appUser?.isActive) {
          req.user = {
            neonUserId,
            email: payload.email as string || appUser.email,
            id: appUser.id,
            role: appUser.role || "staff",
            stationId: appUser.stationId,
            eventId: appUser.eventId,
            name: appUser.name,
          };
        }
      }
    } catch { /* continue unauthenticated */ }
    next();
  };
}

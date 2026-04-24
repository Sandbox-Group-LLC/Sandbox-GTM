import { createClerkClient } from '@clerk/express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';

const MemoryStoreSession = MemoryStore(session);

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
});

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET!,
    store: new MemoryStoreSession({ checkPeriod: 86400000 }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

// Custom Clerk middleware that accepts BOTH session cookies AND Authorization: Bearer tokens.
// This avoids the cross-origin cookie problem: when the Clerk production instance isn't wired
// to a CNAME on sandbox-gtm.com, the session cookie never reaches our server. The frontend
// ClerkTokenSync already attaches a Bearer JWT to every fetch — this middleware validates it.
async function customClerkMiddleware(req: any, _res: any, next: any) {
  try {
    // Reconstruct a full URL for Clerk — req.url is just the path, which fails to parse.
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

    // Build a Fetch-style Request for Clerk. Copy headers and method from the Express req.
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else if (typeof value === 'string') {
        headers.set(key, value);
      }
    }
    const fetchReq = new Request(fullUrl, {
      method: req.method,
      headers,
    });

    const requestState = await clerkClient.authenticateRequest(fetchReq, {
      acceptsToken: 'any',
    });

    if (requestState.isSignedIn) {
      const auth = requestState.toAuth();
      req.auth = auth;
    } else {
      req.auth = { userId: null };
    }
  } catch (err) {
    // If Clerk rejects the token (expired, invalid, wrong instance), fall through with no auth.
    // isAuthenticated below will return 401. Don't 500 on bad tokens.
    console.error('[clerkAuth] authenticateRequest failed:', err instanceof Error ? err.message : err);
    req.auth = { userId: null };
  }
  next();
}

// Helper that mirrors @clerk/express's getAuth but reads from our attached req.auth
function getAuth(req: any): { userId: string | null } {
  return req.auth || { userId: null };
}

export async function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  // Session used only for super-admin org switching context
  app.use(getSession());
  // Custom Clerk middleware that accepts both cookies and Bearer tokens
  app.use(customClerkMiddleware);

  // Login/logout redirect to Clerk hosted UI
  app.get('/api/login', (req, res) => {
    res.redirect('/sign-in');
  });

  app.get('/api/callback', (req, res) => {
    res.redirect('/');
  });

  app.get('/api/logout', async (req, res) => {
    try {
      // Destroy the server-side session (super-admin context)
      req.session.destroy(() => {});
    } catch (_) { /* ignore */ }
    // Redirect to Clerk's sign-out page
    res.redirect('/sign-in');
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Ensure user exists in our DB; lazy-sync from Clerk on first encounter
  let dbUser = await storage.getUser(userId);
  if (!dbUser) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      dbUser = await storage.upsertUser({
        id: userId,
        email,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
      });
    } catch (err) {
      console.error('[clerkAuth] Failed to lazy-sync user from Clerk:', err instanceof Error ? err.message : err);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  // Attach req.user in the same shape existing routes expect
  (req as any).user = {
    claims: {
      sub: userId,
      email: dbUser?.email ?? null,
    },
  };

  return next();
};

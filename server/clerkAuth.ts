import { clerkMiddleware, getAuth, createClerkClient } from '@clerk/express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';

const MemoryStoreSession = MemoryStore(session);

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
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

export async function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  // Session used only for super-admin org switching context
  app.use(getSession());
  // Clerk validates JWT on every request
  app.use(clerkMiddleware());

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

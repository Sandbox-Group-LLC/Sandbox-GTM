import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, registerPublicTrackingRoute } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logInfo, logError } from "./logger";
import { seedThoughtLeadershipArticles } from "./seed-articles";

// Global error handlers to prevent crashes from circular reference JSON serialization errors
process.on('uncaughtException', (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  console.error('[process] Uncaught exception:', message);
  if (stack) console.error('[process] Stack:', stack);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';
  console.error('[process] Unhandled rejection:', message);
  if (stack) console.error('[process] Stack:', stack);
});

process.on('exit', (code) => {
  console.error(`[process] Exiting with code: ${code}`);
});

process.on('SIGTERM', () => {
  console.error('[process] Received SIGTERM');
});

process.on('SIGINT', () => {
  console.error('[process] Received SIGINT');
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  logInfo(message, source);
}

// Health check endpoint - registered early so it responds even during startup
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Diagnostic endpoint to check if API routes are reachable
app.get("/api/ping", (_req, res) => {
  res.status(200).json({ message: "pong", env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// Test route for debugging production routing
app.get("/api/public/test", (_req, res) => {
  res.status(200).json({ message: "public test works", env: process.env.NODE_ENV });
});

// ForgeOS iframe preview: mints a short-lived Clerk sign-in token for a fixed user id,
// returns a URL the ForgeOS shell loads in the iframe so the app is fully authenticated.
// Gated by X-ForgeOS-Secret header matching FORGEOS_PREVIEW_SECRET env var.
app.get("/api/forgeos/preview-url", async (req, res) => {
  try {
    const expectedSecret = process.env.FORGEOS_PREVIEW_SECRET;
    if (!expectedSecret) {
      return res.status(403).json({ error: "preview disabled" });
    }

    const providedSecret = req.header("X-ForgeOS-Secret");
    if (!providedSecret || providedSecret !== expectedSecret) {
      return res.status(403).json({ error: "forbidden" });
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      return res.status(500).json({ error: "clerk not configured" });
    }

    // Hardcoded to Brian's Clerk user id — this is intentional, the preview is always "sign in as me".
    const userId = process.env.FORGEOS_PREVIEW_USER_ID || "user_3Amq2LZfInpaXAW5TLrfoowkrtJ";

    const clerkResp = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        expires_in_seconds: 300,
      }),
    });

    if (!clerkResp.ok) {
      const errText = await clerkResp.text().catch(() => "");
      console.error("[forgeos/preview-url] Clerk sign_in_tokens failed:", clerkResp.status, errText);
      return res.status(502).json({ error: "clerk token mint failed" });
    }

    const tokenBody = await clerkResp.json().catch(() => null) as any;
    const token = tokenBody?.token;
    if (!token) {
      console.error("[forgeos/preview-url] Clerk response missing token:", tokenBody);
      return res.status(502).json({ error: "clerk token malformed" });
    }

    const url = `https://sandbox-gtm.com/?__clerk_ticket=${encodeURIComponent(token)}&__clerk_status=sign_in`;
    return res.status(200).json({ url });
  } catch (err) {
    console.error("[forgeos/preview-url] error:", err);
    return res.status(500).json({ error: "internal error" });
  }
});

// Parse JSON bodies early so all routes can access req.body
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Register public tracking route early (before async initialization)
// This ensures activation links work even if auth/session initialization has issues
registerPublicTrackingRoute(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          // Safely stringify response, handling circular references
          const seen = new WeakSet();
          const safeJson = JSON.stringify(capturedJsonResponse, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
            }
            return value;
          });
          // Truncate long responses
          logLine += ` :: ${safeJson.length > 500 ? safeJson.substring(0, 500) + '...' : safeJson}`;
        } catch {
          logLine += ` :: [Response not serializable]`;
        }
      }

      log(logLine);
    }
  });

  next();
});

const port = parseInt(process.env.PORT || "5000", 10);

// Start server immediately so health checks pass
httpServer.listen(port, "0.0.0.0", () => {
  log(`Server listening on port ${port}`);
});

// Initialize routes and other middleware asynchronously
(async () => {
  try {
    log("Initializing application...");
    
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

    await seedThoughtLeadershipArticles();

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      logError(err, "express");
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
      log("Static files configured for production");
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      log("Vite dev server configured");
    }

    log("Application initialized successfully");
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), "startup");
    log(`Startup error: ${error instanceof Error ? error.message : String(error)}`);
    // Don't exit - keep server running for health checks while we debug
  }
})();

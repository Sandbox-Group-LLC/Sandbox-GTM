import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, registerPublicTrackingRoute } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logInfo, logError } from "./logger";

// Global error handlers to prevent crashes from circular reference JSON serialization errors
process.on('uncaughtException', (error) => {
  // Safely log the error message without trying to stringify the full error object
  const message = error instanceof Error ? error.message : String(error);
  console.error('[process] Uncaught exception:', message);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason) => {
  // Safely log the rejection reason
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error('[process] Unhandled rejection:', message);
  // Don't exit - keep server running
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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

const port = parseInt(process.env.PORT || "5000", 10);

// Start server immediately so health checks pass
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`Server listening on port ${port}`);
  },
);

// Initialize routes and other middleware asynchronously
(async () => {
  try {
    log("Initializing application...");
    
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

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

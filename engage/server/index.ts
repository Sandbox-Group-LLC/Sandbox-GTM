import express from "express";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import path from "path";
import { rateLimit } from "express-rate-limit";
import { pool } from "./db.js";
import eventsRouter from "./routes/events.js";
import attendeesRouter from "./routes/attendees.js";
import checkInRouter from "./routes/checkin.js";
import momentsRouter from "./routes/moments.js";
import interactionsRouter from "./routes/interactions.js";
import meetingsRouter from "./routes/meetings.js";
import intentRouter from "./routes/intent.js";
import authRouter from "./routes/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === "production";

const app = express();

// ── Security headers ───────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (IS_PROD) res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  next();
});

app.use(express.json());
app.use(cookieParser());

// ── Rate limiting ──────────────────────────────────────────────────────────

// Auth routes: 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failures
});

// General API: 300 req/min per IP (generous, covers normal app use)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: "Too many requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/", apiLimiter);

// ── Neon SQL Relay ─────────────────────────────────────────────────────────
app.post("/api/admin/relay", express.json({ limit: "500kb" }), async (req, res) => {
  const { adminPassword, query, values } = req.body;
  if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }
  try {
    const result = await pool.query(query, values || []);
    return res.json({ success: true, rows: result.rows, rowCount: result.rowCount });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Auth routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);

// ── App routes ─────────────────────────────────────────────────────────────
app.use("/api", eventsRouter);
app.use("/api/events/:eventId/attendees", attendeesRouter);
app.use("/api/events/:eventId/checkin", checkInRouter);
app.use("/api/events/:eventId/moments", momentsRouter);
app.use("/api/moments", momentsRouter);
app.use("/api/events/:eventId", interactionsRouter);
app.use("/api/stations", interactionsRouter);
app.use("/api/events/:eventId/meetings", meetingsRouter);
app.use("/api/meetings", meetingsRouter);
app.use("/api/events/:eventId/intent", intentRouter);

// Health (exempt from rate limit)
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "engage" }));

// ── Static (production) ────────────────────────────────────────────────────
if (IS_PROD) {
  const publicPath = path.join(__dirname, "../../dist/public");
  const { default: sirv } = await import("sirv");
  app.use(sirv(publicPath, { single: true }));
}

const PORT = parseInt(process.env.PORT || "3001");
app.listen(PORT, () => {
  console.log(`Engage server running on port ${PORT} [${IS_PROD ? "production" : "development"}]`);
});

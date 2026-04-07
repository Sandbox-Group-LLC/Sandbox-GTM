import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "./db.js";
import eventsRouter from "./routes/events.js";
import attendeesRouter from "./routes/attendees.js";
import checkInRouter from "./routes/checkin.js";
import momentsRouter from "./routes/moments.js";
import interactionsRouter from "./routes/interactions.js";
import meetingsRouter from "./routes/meetings.js";
import intentRouter from "./routes/intent.js";
import authRouter from "./routes/auth.js";
import sirv from "sirv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(cookieParser());

// ── Rate limiting ──────────────────────────────────────────────────────────────
// Tight limit on auth endpoints — 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true, // only count failures
});

// General API limit — 300 req/min per IP (generous, blocks scrapers)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);

// ── Neon SQL Relay ─────────────────────────────────────────────────────────────
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

// Auth routes
app.use("/api/auth", authRouter);

// API routes
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

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "engage" }));

// Serve Vite-built client in production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "../../dist/public");
  app.use(sirv(publicPath, { single: true }));
}

const PORT = parseInt(process.env.PORT || "3001");
app.listen(PORT, () => {
  console.log(`Engage server running on port ${PORT}`);
});

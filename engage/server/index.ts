import express from "express";
import session from "express-session";
import { fileURLToPath } from "url";
import path from "path";
import { pool } from "./db.js";
import eventsRouter from "./routes/events.js";
import attendeesRouter from "./routes/attendees.js";
import checkInRouter from "./routes/checkin.js";
import momentsRouter from "./routes/moments.js";
import interactionsRouter from "./routes/interactions.js";
import meetingsRouter from "./routes/meetings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "engage-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

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

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "engage" }));

// Serve Vite-built client in production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "../../dist/public");
  const { default: sirv } = await import("sirv");
  app.use(sirv(publicPath, { single: true }));
}

const PORT = parseInt(process.env.PORT || "3001");
app.listen(PORT, () => {
  console.log(`Engage server running on port ${PORT}`);
});

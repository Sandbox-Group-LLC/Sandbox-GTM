/**
 * Product Interactions (lead capture) routes
 *
 * GET  /api/events/:eventId/interactions
 * POST /api/events/:eventId/interactions
 * GET  /api/events/:eventId/interactions/stats
 *
 * GET  /api/events/:eventId/stations
 * POST /api/events/:eventId/stations
 * PATCH /api/stations/:stationId
 * DELETE /api/stations/:stationId
 */

import { Router } from "express";
import { db } from "../db.js";
import { productInteractions, demoStations } from "../../shared/schema.js";
import { eq, and, count, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Product Interactions
// ---------------------------------------------------------------------------

// GET /api/events/:eventId/interactions
router.get("/interactions", async (req, res) => {
  try {
    const rows = await db.select().from(productInteractions)
      .where(eq(productInteractions.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/interactions
router.post("/interactions", async (req, res) => {
  try {
    const [created] = await db.insert(productInteractions)
      .values({ ...req.body, eventId: req.params.eventId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/interactions/stats
router.get("/interactions/stats", async (req, res) => {
  try {
    const { eventId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total] = await db.select({ count: count() }).from(productInteractions)
      .where(eq(productInteractions.eventId, eventId));
    const [todayCount] = await db.select({ count: count() }).from(productInteractions)
      .where(and(eq(productInteractions.eventId, eventId), sql`${productInteractions.createdAt} >= ${today}`));
    const [qrCount] = await db.select({ count: count() }).from(productInteractions)
      .where(and(eq(productInteractions.eventId, eventId), eq(productInteractions.captureMethod, "qr_scan")));
    const [manualCount] = await db.select({ count: count() }).from(productInteractions)
      .where(and(eq(productInteractions.eventId, eventId), eq(productInteractions.captureMethod, "manual")));

    res.json({
      totalInteractions: total.count,
      interactionsToday: todayCount.count,
      badgeScans: qrCount.count,
      manualInteractions: manualCount.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Demo Stations
// ---------------------------------------------------------------------------

// GET /api/events/:eventId/stations
router.get("/stations", async (req, res) => {
  try {
    const rows = await db.select().from(demoStations).where(eq(demoStations.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/stations
router.post("/stations", async (req, res) => {
  try {
    const [created] = await db.insert(demoStations)
      .values({ ...req.body, eventId: req.params.eventId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/stations/:stationId
router.patch("/stations/:stationId", async (req, res) => {
  try {
    const [updated] = await db.update(demoStations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(demoStations.id, req.params.stationId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Station not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stations/:stationId
router.delete("/stations/:stationId", async (req, res) => {
  try {
    await db.delete(demoStations).where(eq(demoStations.id, req.params.stationId));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

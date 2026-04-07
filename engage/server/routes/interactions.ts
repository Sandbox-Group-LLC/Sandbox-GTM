import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { productInteractions, demoStations } from "../../shared/schema.js";
import { eq, and, count, sql } from "drizzle-orm";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Product Interactions
// ---------------------------------------------------------------------------

router.get("/interactions", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(productInteractions)
      .where(eq(productInteractions.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/interactions", async (req: Request<EP>, res: Response) => {
  try {
    const [created] = await db.insert(productInteractions)
      .values({ ...req.body, eventId: req.params.eventId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/interactions/stats", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total] = await db.select({ count: count() }).from(productInteractions).where(eq(productInteractions.eventId, eventId));
    const [todayCount] = await db.select({ count: count() }).from(productInteractions)
      .where(and(eq(productInteractions.eventId, eventId), sql`${productInteractions.createdAt} >= ${today}`));
    const [qrCount] = await db.select({ count: count() }).from(productInteractions)
      .where(and(eq(productInteractions.eventId, eventId), eq(productInteractions.captureMethod, "qr_scan")));
    const [manualCount] = await db.select({ count: count() }).from(productInteractions)
      .where(and(eq(productInteractions.eventId, eventId), eq(productInteractions.captureMethod, "manual")));
    res.json({ totalInteractions: total.count, interactionsToday: todayCount.count, badgeScans: qrCount.count, manualInteractions: manualCount.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Demo Stations
// ---------------------------------------------------------------------------

router.get("/stations", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(demoStations).where(eq(demoStations.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/stations", async (req: Request<EP>, res: Response) => {
  try {
    const [created] = await db.insert(demoStations)
      .values({ ...req.body, eventId: req.params.eventId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/stations/:stationId", async (req: Request<EP & { stationId: string }>, res: Response) => {
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

router.delete("/stations/:stationId", async (req: Request<EP & { stationId: string }>, res: Response) => {
  try {
    await db.delete(demoStations).where(eq(demoStations.id, req.params.stationId));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

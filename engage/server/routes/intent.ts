/**
 * Intent scoring routes
 *
 * POST /api/events/:eventId/intent/recompute       run full batch recompute
 * GET  /api/events/:eventId/intent/history         recompute changelog
 * GET  /api/events/:eventId/intent/attendees       scored attendee list with filters
 * GET  /api/events/:eventId/intent/summary         KPI summary (follow-up readiness)
 */

import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { attendees, intentRecomputeHistory } from "../../shared/schema.js";
import { eq, and, desc, or } from "drizzle-orm";
import { recomputeEventIntent } from "../intentScoring.js";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

// POST /api/events/:eventId/intent/recompute
router.post("/recompute", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { triggeredBy = "manual" } = req.body;
    const history = await recomputeEventIntent(eventId, triggeredBy);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/intent/history
router.get("/history", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(intentRecomputeHistory)
      .where(eq(intentRecomputeHistory.eventId, req.params.eventId))
      .orderBy(desc(intentRecomputeHistory.recomputedAt))
      .limit(20);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/intent/attendees?status=hot_lead|high_intent|engaged|none&salesReady=true
router.get("/attendees", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, salesReady } = req.query as Record<string, string>;

    const conditions: any[] = [eq(attendees.eventId, eventId)];
    if (status && status !== "all") conditions.push(eq(attendees.intentStatus, status));
    if (salesReady === "true") conditions.push(eq(attendees.salesReady, true));

    const rows = await db.select().from(attendees)
      .where(and(...conditions))
      .orderBy(desc(attendees.momentumScore));

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/intent/summary
router.get("/summary", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;

    const all = await db.select({
      id: attendees.id,
      intentStatus: attendees.intentStatus,
      salesReady: attendees.salesReady,
      momentumScore: attendees.momentumScore,
    }).from(attendees).where(eq(attendees.eventId, eventId));

    const hotLeads   = all.filter(a => a.intentStatus === "hot_lead").length;
    const highIntent = all.filter(a => a.intentStatus === "high_intent").length;
    const engaged    = all.filter(a => a.intentStatus === "engaged").length;
    const salesReady = all.filter(a => a.salesReady).length;
    const followUpReadiness = hotLeads + highIntent; // the KPI

    // Last recompute
    const [lastRun] = await db.select().from(intentRecomputeHistory)
      .where(eq(intentRecomputeHistory.eventId, eventId))
      .orderBy(desc(intentRecomputeHistory.recomputedAt))
      .limit(1);

    res.json({
      followUpReadiness,
      hotLeads,
      highIntent,
      engaged,
      salesReady,
      total: all.length,
      lastRecomputedAt: lastRun?.recomputedAt || null,
      lastDeltaHotLeads: lastRun?.deltaHotLeads || 0,
      lastDeltaHighIntent: lastRun?.deltaHighIntent || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

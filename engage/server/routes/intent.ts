import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { eventAttendees, orgAttendees, intentRecomputeHistory, events } from "../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { recomputeEventIntent } from "../intentScoring.js";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

router.post("/recompute", async (req: Request<EP>, res: Response) => {
  try {
    const { triggeredBy = "manual" } = req.body;
    const history = await recomputeEventIntent(req.params.eventId, triggeredBy);
    res.json(history);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/history", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(intentRecomputeHistory)
      .where(eq(intentRecomputeHistory.eventId, req.params.eventId))
      .orderBy(desc(intentRecomputeHistory.recomputedAt)).limit(20);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/attendees", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query as { status?: string };

    const rows = await db.select({
      id: eventAttendees.id,
      eventIntentStatus: eventAttendees.eventIntentStatus,
      eventMomentumScore: eventAttendees.eventMomentumScore,
      eventSalesReady: eventAttendees.eventSalesReady,
      eventIntentNarrative: eventAttendees.eventIntentNarrative,
      eventIntentSources: eventAttendees.eventIntentSources,
      checkedIn: eventAttendees.checkedIn,
      firstName: orgAttendees.firstName,
      lastName: orgAttendees.lastName,
      company: orgAttendees.company,
      jobTitle: orgAttendees.jobTitle,
      email: orgAttendees.email,
      lifetimeIntentStatus: orgAttendees.lifetimeIntentStatus,
      lifetimeMomentumScore: orgAttendees.lifetimeMomentumScore,
    }).from(eventAttendees)
      .innerJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
      .where(
        status && status !== "all"
          ? and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.eventIntentStatus, status))
          : eq(eventAttendees.eventId, eventId)
      ).orderBy(desc(eventAttendees.eventMomentumScore));

    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/summary", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const [ev] = await db.select({ orgId: events.orgId }).from(events).where(eq(events.id, eventId));
    if (!ev) return res.status(404).json({ error: "Event not found" });

    const all = await db.select({
      eventIntentStatus: eventAttendees.eventIntentStatus,
      eventSalesReady: eventAttendees.eventSalesReady,
    }).from(eventAttendees).where(eq(eventAttendees.eventId, eventId));

    const hotLeads   = all.filter(a => a.eventIntentStatus === "hot_lead").length;
    const highIntent = all.filter(a => a.eventIntentStatus === "high_intent").length;
    const engaged    = all.filter(a => a.eventIntentStatus === "engaged").length;
    const salesReady = all.filter(a => a.eventSalesReady).length;

    const [lastRun] = await db.select().from(intentRecomputeHistory)
      .where(eq(intentRecomputeHistory.eventId, eventId))
      .orderBy(desc(intentRecomputeHistory.recomputedAt)).limit(1);

    res.json({
      followUpReadiness: hotLeads + highIntent,
      hotLeads, highIntent, engaged, salesReady,
      total: all.length,
      lastRecomputedAt: lastRun?.recomputedAt || null,
      lastDeltaHotLeads: lastRun?.deltaHotLeads || 0,
      lastDeltaHighIntent: lastRun?.deltaHighIntent || 0,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

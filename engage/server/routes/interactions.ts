import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { productInteractions, demoStations, eventAttendees, orgAttendees } from "../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

// GET /api/events/:eventId/interactions
router.get("/interactions", async (req: Request<EP>, res: Response) => {
  try {
    const { staffId } = req.query as { staffId?: string };
    const rows = await db.select({
      id: productInteractions.id,
      eventAttendeeId: productInteractions.eventAttendeeId,
      interactionType: productInteractions.interactionType,
      intentLevel: productInteractions.intentLevel,
      outcome: productInteractions.outcome,
      opportunityPotential: productInteractions.opportunityPotential,
      nextStep: productInteractions.nextStep,
      station: productInteractions.station,
      tags: productInteractions.tags,
      notes: productInteractions.notes,
      captureMethod: productInteractions.captureMethod,
      createdAt: productInteractions.createdAt,
      firstName: orgAttendees.firstName,
      lastName: orgAttendees.lastName,
      company: orgAttendees.company,
      jobTitle: orgAttendees.jobTitle,
    }).from(productInteractions)
      .leftJoin(eventAttendees, eq(productInteractions.eventAttendeeId, eventAttendees.id))
      .leftJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
      .where(eq(productInteractions.eventId, req.params.eventId))
      .orderBy(desc(productInteractions.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/events/:eventId/interactions
router.post("/interactions", async (req: Request<EP>, res: Response) => {
  try {
    const {
      eventAttendeeId, interactionType, intentLevel, outcome,
      opportunityPotential, nextStep, station, tags, notes,
      unmatchedFirstName, unmatchedLastName, unmatchedEmail, unmatchedCompany, unmatchedJobTitle,
    } = req.body;
    if (!interactionType || !intentLevel || !outcome) {
      return res.status(400).json({ error: "interactionType, intentLevel, and outcome required" });
    }
    const [pi] = await db.insert(productInteractions).values({
      eventId: req.params.eventId,
      eventAttendeeId: eventAttendeeId || null,
      interactionType, intentLevel, outcome,
      opportunityPotential, nextStep, station,
      tags: tags || [],
      notes,
      unmatchedFirstName, unmatchedLastName, unmatchedEmail,
      unmatchedCompany, unmatchedJobTitle,
      captureMethod: "manual",
    }).returning();
    res.status(201).json(pi);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/events/:eventId/interactions/stats
router.get("/interactions/stats", async (req: Request<EP>, res: Response) => {
  try {
    const all = await db.select({ id: productInteractions.id, createdAt: productInteractions.createdAt })
      .from(productInteractions).where(eq(productInteractions.eventId, req.params.eventId));
    const today = new Date(); today.setHours(0,0,0,0);
    res.json({
      totalInteractions: all.length,
      interactionsToday: all.filter(i => i.createdAt && new Date(i.createdAt) >= today).length,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/stations
router.get("/stations", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(demoStations).where(eq(demoStations.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/stations
router.post("/stations", async (req: Request<EP>, res: Response) => {
  try {
    const { stationName, stationLocation, stationPresenter, productFocus } = req.body;
    if (!stationName || !stationLocation) return res.status(400).json({ error: "stationName and stationLocation required" });
    const [s] = await db.insert(demoStations).values({
      eventId: req.params.eventId, stationName, stationLocation, stationPresenter,
      productFocus: productFocus || [], isActive: true,
    }).returning();
    res.status(201).json(s);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/events/:eventId/stations/:stationId — single station detail
router.get("/stations/:stationId", async (req: Request<EP & { stationId: string }>, res: Response) => {
  try {
    const [station] = await db.select().from(demoStations)
      .where(and(eq(demoStations.id, req.params.stationId), eq(demoStations.eventId, req.params.eventId)));
    if (!station) return res.status(404).json({ error: "Station not found" });
    res.json(station);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

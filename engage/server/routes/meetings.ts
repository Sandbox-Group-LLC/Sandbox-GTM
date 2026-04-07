import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { meetings, eventAttendees, orgAttendees } from "../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

const withPII = {
  id: meetings.id, eventId: meetings.eventId, eventAttendeeId: meetings.eventAttendeeId,
  hostName: meetings.hostName, hostEmail: meetings.hostEmail,
  intentType: meetings.intentType, intentStrength: meetings.intentStrength,
  status: meetings.status, startTime: meetings.startTime, endTime: meetings.endTime,
  room: meetings.room, message: meetings.message,
  outcomeType: meetings.outcomeType, outcomeConfidence: meetings.outcomeConfidence,
  dealRange: meetings.dealRange, timeline: meetings.timeline, outcomeNotes: meetings.outcomeNotes,
  createdAt: meetings.createdAt,
  firstName: orgAttendees.firstName, lastName: orgAttendees.lastName,
  email: orgAttendees.email, company: orgAttendees.company, jobTitle: orgAttendees.jobTitle,
};

router.get("/", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select(withPII).from(meetings)
      .innerJoin(eventAttendees, eq(meetings.eventAttendeeId, eventAttendees.id))
      .innerJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
      .where(eq(meetings.eventId, req.params.eventId))
      .orderBy(desc(meetings.startTime));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req: Request<EP>, res: Response) => {
  try {
    const { eventAttendeeId, hostName, hostEmail, intentType, startTime, endTime, room, message } = req.body;
    if (!eventAttendeeId) return res.status(400).json({ error: "eventAttendeeId required" });
    const [m] = await db.insert(meetings).values({
      eventId: req.params.eventId, eventAttendeeId,
      hostName, hostEmail, intentType, status: "pending",
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      room, message,
    }).returning();
    res.status(201).json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/outcome", async (req: Request<EP & { id: string }>, res: Response) => {
  try {
    const { outcomeType, outcomeConfidence, dealRange, timeline, outcomeNotes } = req.body;
    const [m] = await db.update(meetings).set({
      outcomeType, outcomeConfidence, dealRange, timeline, outcomeNotes,
      status: "completed", updatedAt: new Date(),
    }).where(and(eq(meetings.id, req.params.id), eq(meetings.eventId, req.params.eventId))).returning();
    if (!m) return res.status(404).json({ error: "Meeting not found" });
    res.json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/status", async (req: Request<EP & { id: string }>, res: Response) => {
  try {
    const { status } = req.body;
    const [m] = await db.update(meetings).set({ status, updatedAt: new Date() })
      .where(and(eq(meetings.id, req.params.id), eq(meetings.eventId, req.params.eventId))).returning();
    if (!m) return res.status(404).json({ error: "Meeting not found" });
    res.json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/stats", async (req: Request<EP>, res: Response) => {
  try {
    const all = await db.select({ status: meetings.status, outcomeType: meetings.outcomeType })
      .from(meetings).where(eq(meetings.eventId, req.params.eventId));
    res.json({
      totalMeetings: all.length,
      completed: all.filter(m => m.status === "completed").length,
      outcomesCaptured: all.filter(m => m.outcomeType).length,
      pending: all.filter(m => m.status === "pending").length,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

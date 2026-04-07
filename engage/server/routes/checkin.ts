import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { eventAttendees, orgAttendees, sessions, sessionCheckIns } from "../../shared/schema.js";
import { eq, and, or, ilike } from "drizzle-orm";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

async function getEventAttendeeWithPII(id: string) {
  const [row] = await db.select({
    id: eventAttendees.id,
    orgAttendeeId: eventAttendees.orgAttendeeId,
    badgeCode: eventAttendees.badgeCode,
    checkedIn: eventAttendees.checkedIn,
    checkInTime: eventAttendees.checkInTime,
    registrationStatus: eventAttendees.registrationStatus,
    firstName: orgAttendees.firstName,
    lastName: orgAttendees.lastName,
    email: orgAttendees.email,
    company: orgAttendees.company,
    jobTitle: orgAttendees.jobTitle,
  }).from(eventAttendees)
    .innerJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
    .where(eq(eventAttendees.id, id));
  return row;
}

// GET stats
router.get("/stats", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const all = await db.select({ id: eventAttendees.id, checkedIn: eventAttendees.checkedIn })
      .from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
    const checkedIn = all.filter(a => a.checkedIn).length;
    res.json({ totalAttendees: all.length, checkedIn, pending: all.length - checkedIn,
      checkInRate: all.length > 0 ? Math.round((checkedIn / all.length) * 100) : 0 });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST scan badge
router.post("/scan", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { code, mode = "program", sessionId } = req.body as { code: string; mode?: string; sessionId?: string };
    if (!code) return res.status(400).json({ error: "Badge code required" });

    const [ea] = await db.select().from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.badgeCode, code.toUpperCase())));

    if (!ea) return res.status(404).json({ error: "Badge not found" });

    if (mode === "program") {
      await db.update(eventAttendees).set({ checkedIn: true, checkInTime: new Date(), updatedAt: new Date() })
        .where(eq(eventAttendees.id, ea.id));
    }

    if (mode === "session" && sessionId) {
      const existing = await db.select().from(sessionCheckIns)
        .where(and(eq(sessionCheckIns.sessionId, sessionId), eq(sessionCheckIns.eventAttendeeId, ea.id)));
      if (existing.length === 0) {
        await db.insert(sessionCheckIns).values({
          eventId, sessionId, eventAttendeeId: ea.id, checkInMethod: "scan" });
      }
    }

    const attendee = await getEventAttendeeWithPII(ea.id);
    res.json({ success: true, attendee, alreadyCheckedIn: mode === "program" && ea.checkedIn });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST manual check-in by search
router.post("/manual", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { eventAttendeeId, attendeeId, mode = "program", sessionId } = req.body as { eventAttendeeId?: string; attendeeId?: string; mode?: string; sessionId?: string };
    const resolvedId = eventAttendeeId || attendeeId;

    const [ea] = await db.select().from(eventAttendees)
      .where(and(eq(eventAttendees.id, resolvedId!), eq(eventAttendees.eventId, eventId)));
    if (!ea) return res.status(404).json({ error: "Attendee not found" });

    if (mode === "program") {
      await db.update(eventAttendees).set({ checkedIn: true, checkInTime: new Date(), updatedAt: new Date() })
        .where(eq(eventAttendees.id, ea.id));
    }

    if (mode === "session" && sessionId) {
      const existing = await db.select().from(sessionCheckIns)
        .where(and(eq(sessionCheckIns.sessionId, sessionId), eq(sessionCheckIns.eventAttendeeId, ea.id)));
      if (existing.length === 0) {
        await db.insert(sessionCheckIns).values({ eventId, sessionId, eventAttendeeId: ea.id, checkInMethod: "manual" });
      }
    }

    const attendee = await getEventAttendeeWithPII(ea.id);
    res.json({ success: true, attendee });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET search attendees
router.get("/search", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { q } = req.query as { q?: string };
    if (!q || q.length < 2) return res.json([]);

    const rows = await db.select({
      id: eventAttendees.id, badgeCode: eventAttendees.badgeCode,
      checkedIn: eventAttendees.checkedIn,
      firstName: orgAttendees.firstName, lastName: orgAttendees.lastName,
      email: orgAttendees.email, company: orgAttendees.company, jobTitle: orgAttendees.jobTitle,
    }).from(eventAttendees)
      .innerJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
      .where(and(
        eq(eventAttendees.eventId, eventId),
        or(
          ilike(orgAttendees.firstName, `%${q}%`),
          ilike(orgAttendees.lastName, `%${q}%`),
          ilike(orgAttendees.email, `%${q}%`),
          ilike(eventAttendees.badgeCode, `%${q}%`),
          ilike(orgAttendees.company, `%${q}%`)
        )
      )).limit(10);

    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET sessions
router.get("/sessions", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

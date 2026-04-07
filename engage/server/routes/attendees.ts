import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { orgAttendees, eventAttendees } from "../../shared/schema.js";
import { eq, or, ilike, and } from "drizzle-orm";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

// GET /api/events/:eventId/attendees
router.get("/", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { q } = req.query as { q?: string };

    const rows = await db
      .select({
        id: eventAttendees.id,
        eventId: eventAttendees.eventId,
        orgAttendeeId: eventAttendees.orgAttendeeId,
        externalId: eventAttendees.externalId,
        badgeCode: eventAttendees.badgeCode,
        registrationType: eventAttendees.registrationType,
        registrationStatus: eventAttendees.registrationStatus,
        checkedIn: eventAttendees.checkedIn,
        checkInTime: eventAttendees.checkInTime,
        eventIntentStatus: eventAttendees.eventIntentStatus,
        eventMomentumScore: eventAttendees.eventMomentumScore,
        eventSalesReady: eventAttendees.eventSalesReady,
        eventIntentNarrative: eventAttendees.eventIntentNarrative,
        // PII from org_attendees
        firstName: orgAttendees.firstName,
        lastName: orgAttendees.lastName,
        email: orgAttendees.email,
        company: orgAttendees.company,
        jobTitle: orgAttendees.jobTitle,
        phone: orgAttendees.phone,
      })
      .from(eventAttendees)
      .innerJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
      .where(
        q
          ? and(
              eq(eventAttendees.eventId, eventId),
              or(
                ilike(orgAttendees.firstName, `%${q}%`),
                ilike(orgAttendees.lastName, `%${q}%`),
                ilike(orgAttendees.email, `%${q}%`),
                ilike(eventAttendees.badgeCode, `%${q}%`),
                ilike(orgAttendees.company, `%${q}%`)
              )
            )
          : eq(eventAttendees.eventId, eventId)
      );

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/attendees/:id
router.get("/:id", async (req: Request<EP & { id: string }>, res: Response) => {
  try {
    const [row] = await db
      .select({
        id: eventAttendees.id,
        eventId: eventAttendees.eventId,
        orgAttendeeId: eventAttendees.orgAttendeeId,
        badgeCode: eventAttendees.badgeCode,
        registrationStatus: eventAttendees.registrationStatus,
        checkedIn: eventAttendees.checkedIn,
        checkInTime: eventAttendees.checkInTime,
        eventIntentStatus: eventAttendees.eventIntentStatus,
        eventMomentumScore: eventAttendees.eventMomentumScore,
        eventIntentNarrative: eventAttendees.eventIntentNarrative,
        firstName: orgAttendees.firstName,
        lastName: orgAttendees.lastName,
        email: orgAttendees.email,
        company: orgAttendees.company,
        jobTitle: orgAttendees.jobTitle,
        phone: orgAttendees.phone,
        lifetimeIntentStatus: orgAttendees.lifetimeIntentStatus,
        lifetimeMomentumScore: orgAttendees.lifetimeMomentumScore,
      })
      .from(eventAttendees)
      .innerJoin(orgAttendees, eq(eventAttendees.orgAttendeeId, orgAttendees.id))
      .where(eq(eventAttendees.id, req.params.id));

    if (!row) return res.status(404).json({ error: "Attendee not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/attendees/sync  (trigger sync from adapter)
router.post("/sync", async (req: Request<EP>, res: Response) => {
  res.json({ message: "Sync triggered — connect platform and run sync from the Connect page." });
});

export default router;

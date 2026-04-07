import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { attendees, sessions, sessionCheckIns, events, platformConnections } from "../../shared/schema.js";
import { eq, and, count, sql } from "drizzle-orm";
import { createAdapter } from "../integrations/adapter-factory.js";
import type { AdapterType } from "../integrations/adapter-factory.js";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

router.post("/scan", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { code, mode = "program", sessionId } = req.body as {
      code: string;
      mode: "program" | "session" | "lead";
      sessionId?: string;
    };

    if (!code) return res.status(400).json({ error: "code is required" });

    let [attendee] = await db.select().from(attendees)
      .where(and(eq(attendees.eventId, eventId), eq(attendees.badgeCode, code.toUpperCase())));

    if (!attendee) {
      const [eventRow] = await db
        .select({ event: events, conn: platformConnections })
        .from(events)
        .innerJoin(platformConnections, eq(events.connectionId, platformConnections.id))
        .where(eq(events.id, eventId));

      if (eventRow) {
        const { event, conn } = eventRow;
        const adapter = createAdapter(conn.adapter as AdapterType, {
          apiUrl: conn.apiUrl || undefined,
          apiKey: conn.apiKey || "",
          profileId: conn.profileId || undefined,
        });
        const ext = await adapter.lookupAttendee(event.externalId, { badgeCode: code });
        if (ext) {
          const [inserted] = await db.insert(attendees).values({
            eventId,
            externalId: ext.externalId,
            firstName: ext.firstName,
            lastName: ext.lastName,
            email: ext.email,
            company: ext.company,
            jobTitle: ext.jobTitle,
            phone: ext.phone,
            badgeCode: ext.badgeCode,
            registrationType: ext.registrationType,
            registrationStatus: ext.registrationStatus,
            metaJson: ext.meta,
            lastSyncedAt: new Date(),
          }).onConflictDoUpdate({
            target: [attendees.eventId, attendees.externalId],
            set: { lastSyncedAt: new Date(), updatedAt: new Date() },
          }).returning();
          attendee = inserted;
        }
      }
    }

    if (!attendee) return res.status(404).json({ error: "Attendee not found for this code" });

    if (mode === "program") {
      if (attendee.checkedIn) return res.json({ message: "Already checked in", attendee });
      const [updated] = await db.update(attendees)
        .set({ checkedIn: true, checkInTime: new Date(), updatedAt: new Date() })
        .where(eq(attendees.id, attendee.id))
        .returning();
      return res.json({ message: "Checked in", attendee: updated });
    }

    if (mode === "session") {
      if (!sessionId) return res.status(400).json({ error: "sessionId required for session mode" });
      const [existing] = await db.select().from(sessionCheckIns)
        .where(and(eq(sessionCheckIns.sessionId, sessionId), eq(sessionCheckIns.attendeeId, attendee.id)));
      if (existing) return res.status(409).json({ error: "Already checked in to this session", attendee });
      const [checkIn] = await db.insert(sessionCheckIns).values({
        eventId, sessionId, attendeeId: attendee.id, checkInMethod: "qr_scan", sourceCode: code,
      }).returning();
      return res.json({ message: "Session check-in recorded", attendee, sessionCheckIn: checkIn });
    }

    if (mode === "lead") {
      return res.json({
        message: "Attendee found",
        attendee,
        attendeeData: {
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          email: attendee.email,
          company: attendee.company,
          phone: attendee.phone,
          jobTitle: attendee.jobTitle,
        },
      });
    }

    res.status(400).json({ error: "Invalid mode" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/manual", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { attendeeId, sessionId, mode = "program" } = req.body;

    if (!attendeeId) return res.status(400).json({ error: "attendeeId required" });

    if (mode === "session") {
      if (!sessionId) return res.status(400).json({ error: "sessionId required" });
      const [existing] = await db.select().from(sessionCheckIns)
        .where(and(eq(sessionCheckIns.sessionId, sessionId), eq(sessionCheckIns.attendeeId, attendeeId)));
      if (existing) return res.status(409).json({ error: "Already checked in to this session" });
      const [checkIn] = await db.insert(sessionCheckIns)
        .values({ eventId, sessionId, attendeeId, checkInMethod: "manual" })
        .returning();
      return res.json(checkIn);
    }

    const [updated] = await db.update(attendees)
      .set({ checkedIn: true, checkInTime: new Date(), updatedAt: new Date() })
      .where(and(eq(attendees.id, attendeeId), eq(attendees.eventId, eventId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Attendee not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { mode = "program" } = req.query as { mode: string };

    if (mode === "program") {
      const [total] = await db.select({ count: count() }).from(attendees).where(eq(attendees.eventId, eventId));
      const [checkedInCount] = await db.select({ count: count() }).from(attendees)
        .where(and(eq(attendees.eventId, eventId), eq(attendees.checkedIn, true)));
      const t = total.count, c = checkedInCount.count;
      return res.json({ totalAttendees: t, checkedIn: c, pending: t - c, checkInRate: t > 0 ? Math.round((c / t) * 100) : 0 });
    }

    if (mode === "session") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [total] = await db.select({ count: count() }).from(sessionCheckIns).where(eq(sessionCheckIns.eventId, eventId));
      const [todayCount] = await db.select({ count: count() }).from(sessionCheckIns)
        .where(and(eq(sessionCheckIns.eventId, eventId), sql`${sessionCheckIns.checkedInAt} >= ${today}`));
      const [uniqueCount] = await db.select({ count: sql<number>`count(distinct ${sessionCheckIns.attendeeId})` })
        .from(sessionCheckIns).where(eq(sessionCheckIns.eventId, eventId));
      const [sessionCount] = await db.select({ count: sql<number>`count(distinct ${sessionCheckIns.sessionId})` })
        .from(sessionCheckIns).where(eq(sessionCheckIns.eventId, eventId));
      return res.json({ sessionAttendance: total.count, checkInsToday: todayCount.count, uniqueAttendees: uniqueCount.count, sessionsCovered: sessionCount.count });
    }

    res.status(400).json({ error: "Invalid mode" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

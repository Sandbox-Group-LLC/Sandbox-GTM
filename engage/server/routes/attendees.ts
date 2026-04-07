import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { attendees, events, platformConnections } from "../../shared/schema.js";
import { eq, and, or, ilike } from "drizzle-orm";
import { createAdapter } from "../integrations/adapter-factory.js";
import type { AdapterType } from "../integrations/adapter-factory.js";
import type { RainfocusAdapter } from "../integrations/rainfocus.js";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

router.get("/", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { search, limit = "200", offset = "0" } = req.query as Record<string, string>;

    const rows = await db.select().from(attendees)
      .where(
        search
          ? and(
              eq(attendees.eventId, eventId),
              or(
                ilike(attendees.firstName, `%${search}%`),
                ilike(attendees.lastName, `%${search}%`),
                ilike(attendees.email, `%${search}%`),
                ilike(attendees.badgeCode, `%${search}%`)
              )
            )
          : eq(attendees.eventId, eventId)
      )
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { incremental = false } = req.body as { incremental?: boolean };

    const [row] = await db
      .select({ event: events, conn: platformConnections })
      .from(events)
      .innerJoin(platformConnections, eq(events.connectionId, platformConnections.id))
      .where(eq(events.id, eventId));

    if (!row) return res.status(404).json({ error: "Event not found" });

    const { event, conn } = row;
    const adapter = createAdapter(conn.adapter as AdapterType, {
      apiUrl: conn.apiUrl || undefined,
      apiKey: conn.apiKey || "",
      profileId: conn.profileId || undefined,
      extra: (conn.configJson as Record<string, string>) || undefined,
    });

    let externalAttendees;
    let nextTimestamp: string | undefined;

    if (incremental && conn.adapter === "rainfocus") {
      const rfAdapter = adapter as RainfocusAdapter;
      const sinceTimestamp = (event.metaJson as any)?.rfSyncTimestamp;
      const result = await rfAdapter.getAttendeesIncremental(event.externalId, sinceTimestamp);
      externalAttendees = result.attendees;
      nextTimestamp = result.nextTimestamp;
    } else {
      externalAttendees = await adapter.getAttendees(event.externalId);
    }

    let upserted = 0;
    for (const ext of externalAttendees) {
      if (!ext.externalId) continue;
      await db.insert(attendees).values({
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
        set: {
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
          updatedAt: new Date(),
        },
      });
      upserted++;
    }

    const updatedMeta = {
      ...((event.metaJson as Record<string, unknown>) || {}),
      ...(nextTimestamp ? { rfSyncTimestamp: nextTimestamp } : {}),
    };

    await db.update(events)
      .set({ lastSyncedAt: new Date(), metaJson: updatedMeta })
      .where(eq(events.id, eventId));

    res.json({ synced: upserted, incremental, nextTimestamp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/lookup", async (req: Request<EP>, res: Response) => {
  try {
    const { eventId } = req.params;
    const { badgeCode, email } = req.query as Record<string, string>;

    if (!badgeCode && !email) {
      return res.status(400).json({ error: "Provide badgeCode or email" });
    }

    const conditions: any[] = [eq(attendees.eventId, eventId)];
    if (badgeCode) conditions.push(eq(attendees.badgeCode, badgeCode));
    else if (email) conditions.push(ilike(attendees.email, email));

    const [local] = await db.select().from(attendees).where(and(...conditions));
    if (local) return res.json(local);

    const [row] = await db
      .select({ event: events, conn: platformConnections })
      .from(events)
      .innerJoin(platformConnections, eq(events.connectionId, platformConnections.id))
      .where(eq(events.id, eventId));

    if (!row) return res.status(404).json({ error: "Event not found" });

    const { event, conn } = row;
    const adapter = createAdapter(conn.adapter as AdapterType, {
      apiUrl: conn.apiUrl || undefined,
      apiKey: conn.apiKey || "",
      profileId: conn.profileId || undefined,
    });

    const ext = await adapter.lookupAttendee(event.externalId, { badgeCode, email });
    if (!ext) return res.status(404).json({ error: "Attendee not found" });

    const [upserted] = await db.insert(attendees).values({
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

    res.json(upserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

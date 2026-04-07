/**
 * Attendees routes
 *
 * GET  /api/events/:eventId/attendees             list from local mirror (search + filter)
 * POST /api/events/:eventId/attendees/sync        full sync OR incremental (since-timestamp)
 * GET  /api/events/:eventId/attendees/lookup      real-time badge/email lookup
 */

import { Router } from "express";
import { db } from "../db.js";
import { attendees, events, platformConnections } from "../../shared/schema.js";
import { eq, and, or, ilike } from "drizzle-orm";
import { createAdapter } from "../integrations/adapter-factory.js";
import type { AdapterType } from "../integrations/adapter-factory.js";
import type { RainfocusAdapter } from "../integrations/rainfocus.js";

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// GET /api/events/:eventId/attendees
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, limit = "200", offset = "0" } = req.query as Record<string, string>;

    const rows = await db
      .select()
      .from(attendees)
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

// ---------------------------------------------------------------------------
// POST /api/events/:eventId/attendees/sync
//
// Body (optional):
//   { incremental: true }   — only pull records changed since last sync
//                             uses Rainfocus `since` timestamp mechanism
//   {}                      — full pull (default)
//
// The `since` timestamp from Rainfocus is stored in events.metaJson.rfSyncTimestamp
// and passed back on the next incremental call.
// ---------------------------------------------------------------------------
router.post("/sync", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { incremental = false } = req.body as { incremental?: boolean };

    // Load event + connection in one join
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

    // Use incremental sync if requested and adapter supports it
    if (incremental && conn.adapter === "rainfocus") {
      const rfAdapter = adapter as RainfocusAdapter;
      const sinceTimestamp = (event.metaJson as any)?.rfSyncTimestamp;

      const result = await rfAdapter.getAttendeesIncremental(event.externalId, sinceTimestamp);
      externalAttendees = result.attendees;
      nextTimestamp = result.nextTimestamp;
    } else {
      externalAttendees = await adapter.getAttendees(event.externalId);
    }

    // Upsert all attendees into local mirror
    let upserted = 0;
    for (const ext of externalAttendees) {
      if (!ext.externalId) continue;

      await db
        .insert(attendees)
        .values({
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
        })
        .onConflictDoUpdate({
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

    // Persist the new Rainfocus timestamp so next incremental pull is scoped correctly
    const updatedMeta = {
      ...((event.metaJson as Record<string, unknown>) || {}),
      ...(nextTimestamp ? { rfSyncTimestamp: nextTimestamp } : {}),
    };

    await db
      .update(events)
      .set({ lastSyncedAt: new Date(), metaJson: updatedMeta })
      .where(eq(events.id, eventId));

    res.json({
      synced: upserted,
      incremental,
      nextTimestamp,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/events/:eventId/attendees/lookup?badgeCode=XXX&email=xxx
//
// Checks local mirror first (fast path for repeat scans).
// Falls back to live Rainfocus attendee/search by regcode or email.
// Caches any live-lookup result into the local mirror.
// ---------------------------------------------------------------------------
router.get("/lookup", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { badgeCode, email } = req.query as Record<string, string>;

    if (!badgeCode && !email) {
      return res.status(400).json({ error: "Provide badgeCode or email" });
    }

    // 1. Fast path — check local mirror
    const conditions: any[] = [eq(attendees.eventId, eventId)];
    if (badgeCode) conditions.push(eq(attendees.badgeCode, badgeCode));
    else if (email) conditions.push(ilike(attendees.email, email));

    const [local] = await db.select().from(attendees).where(and(...conditions));
    if (local) return res.json(local);

    // 2. Live lookup via adapter
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

    // 3. Cache into local mirror
    const [upserted] = await db
      .insert(attendees)
      .values({
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
      })
      .onConflictDoUpdate({
        target: [attendees.eventId, attendees.externalId],
        set: { lastSyncedAt: new Date(), updatedAt: new Date() },
      })
      .returning();

    res.json(upserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

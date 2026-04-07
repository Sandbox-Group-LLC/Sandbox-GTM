/**
 * Attendees routes
 *
 * GET  /api/events/:eventId/attendees          — list (from local mirror)
 * POST /api/events/:eventId/attendees/sync     — pull from external platform + upsert locally
 * GET  /api/events/:eventId/attendees/lookup   — real-time single lookup (badge scan)
 */

import { Router } from "express";
import { db } from "../db.js";
import { attendees, events, platformConnections } from "../../shared/schema.js";
import { eq, and, or, ilike } from "drizzle-orm";
import { createAdapter } from "../integrations/adapter-factory.js";
import type { AdapterType } from "../integrations/adapter-factory.js";

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/attendees
router.get("/", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, limit = "100", offset = "0" } = req.query as Record<string, string>;

    let query = db.select().from(attendees).where(eq(attendees.eventId, eventId));

    const rows = await db.select().from(attendees)
      .where(
        search
          ? and(
              eq(attendees.eventId, eventId),
              or(
                ilike(attendees.firstName, `%${search}%`),
                ilike(attendees.lastName, `%${search}%`),
                ilike(attendees.email, `%${search}%`),
                ilike(attendees.badgeCode, `%${search}%`),
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

// POST /api/events/:eventId/attendees/sync
// Pulls the full roster from the external platform and upserts into local mirror
router.post("/sync", async (req, res) => {
  try {
    const { eventId } = req.params;

    const [event] = await db.select().from(events)
      .innerJoin(platformConnections, eq(events.connectionId, platformConnections.id))
      .where(eq(events.id, eventId));

    if (!event) return res.status(404).json({ error: "Event not found" });

    const conn = event.platform_connections;
    const adapter = createAdapter(conn.adapter as AdapterType, {
      apiUrl: conn.apiUrl || undefined,
      apiKey: conn.apiKey || "",
      profileId: conn.profileId || undefined,
    });

    const externalAttendees = await adapter.getAttendees(event.events.externalId);

    let upserted = 0;
    for (const ext of externalAttendees) {
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

    // Update event lastSyncedAt
    await db.update(events).set({ lastSyncedAt: new Date() }).where(eq(events.id, eventId));

    res.json({ synced: upserted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/attendees/lookup?badgeCode=XXX&email=...
// Real-time lookup: checks local mirror first, falls back to live platform query
router.get("/lookup", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { badgeCode, email } = req.query as Record<string, string>;

    if (!badgeCode && !email) {
      return res.status(400).json({ error: "Provide badgeCode or email" });
    }

    // 1. Check local mirror first (fast path)
    const conditions = [eq(attendees.eventId, eventId)];
    if (badgeCode) conditions.push(eq(attendees.badgeCode, badgeCode));
    else if (email) conditions.push(ilike(attendees.email, email));

    const [local] = await db.select().from(attendees).where(and(...conditions));
    if (local) return res.json(local);

    // 2. Fall back to live platform lookup
    const [event] = await db.select().from(events)
      .innerJoin(platformConnections, eq(events.connectionId, platformConnections.id))
      .where(eq(events.id, eventId));

    if (!event) return res.status(404).json({ error: "Event not found" });

    const conn = event.platform_connections;
    const adapter = createAdapter(conn.adapter as AdapterType, {
      apiUrl: conn.apiUrl || undefined,
      apiKey: conn.apiKey || "",
      profileId: conn.profileId || undefined,
    });

    const ext = await adapter.lookupAttendee(event.events.externalId, { badgeCode, email });
    if (!ext) return res.status(404).json({ error: "Attendee not found" });

    // Cache locally
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

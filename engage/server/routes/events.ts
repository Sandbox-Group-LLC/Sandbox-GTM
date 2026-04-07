import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { organizations, platformConnections, events, orgAttendees, eventAttendees } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/organizations
router.get("/organizations", async (_req, res) => {
  try {
    const rows = await db.select().from(organizations).where(eq(organizations.isActive, true));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/connections
router.get("/connections", async (_req, res) => {
  try {
    const rows = await db.select().from(platformConnections);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/connections
router.post("/connections", async (req, res) => {
  try {
    const { orgId, name, adapter, apiUrl, apiKey, profileId } = req.body;
    if (!orgId || !name || !adapter) return res.status(400).json({ error: "orgId, name and adapter required" });
    const [conn] = await db.insert(platformConnections).values({
      orgId, name, adapter, apiUrl, apiKey, profileId, isActive: false, syncStatus: "idle",
    }).returning();
    res.status(201).json(conn);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/connections/:id/connect  — activate connection
router.post("/connections/:id/connect", async (req, res) => {
  try {
    const [conn] = await db.update(platformConnections)
      .set({ isActive: true, syncStatus: "idle", updatedAt: new Date() })
      .where(eq(platformConnections.id, req.params.id)).returning();
    res.json(conn);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/connections/:id/disconnect  — deactivate after sync
router.post("/connections/:id/disconnect", async (req, res) => {
  try {
    const [conn] = await db.update(platformConnections)
      .set({ isActive: false, syncStatus: "idle", updatedAt: new Date() })
      .where(eq(platformConnections.id, req.params.id)).returning();
    res.json(conn);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/events
router.get("/events", async (_req, res) => {
  try {
    const rows = await db.select().from(events);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/events/:id/sync  — full sync from adapter
router.post("/events/:id/sync", async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ error: "Event not found" });

    const [conn] = await db.select().from(platformConnections).where(eq(platformConnections.id, event.connectionId));
    if (!conn || !conn.isActive) return res.status(400).json({ error: "Platform connection is not active. Connect first." });

    // Mark syncing
    await db.update(platformConnections).set({ syncStatus: "syncing", updatedAt: new Date() })
      .where(eq(platformConnections.id, conn.id));

    try {
      const { createAdapter } = await import("../integrations/adapter-factory.js");
      const adapter = createAdapter(conn.adapter as any, { apiKey: conn.apiKey || '', apiUrl: conn.apiUrl || undefined, profileId: conn.profileId || undefined });
      const attendeeList = await adapter.getAttendees(event.externalId);

      let upsertCount = 0;
      for (const a of attendeeList) {
        // Upsert org_attendee (PII layer)
        const existing = await db.select().from(orgAttendees)
          .where(and(eq(orgAttendees.orgId, event.orgId), eq(orgAttendees.email, a.email.toLowerCase())));

        let orgAttendeeId: string;
        if (existing.length > 0) {
          await db.update(orgAttendees).set({
            firstName: a.firstName, lastName: a.lastName,
            company: a.company, jobTitle: a.jobTitle, phone: a.phone,
            lastSeenAt: new Date(), updatedAt: new Date(),
          }).where(eq(orgAttendees.id, existing[0].id));
          orgAttendeeId = existing[0].id;
        } else {
          const [oa] = await db.insert(orgAttendees).values({
            orgId: event.orgId, firstName: a.firstName, lastName: a.lastName,
            email: a.email.toLowerCase(), company: a.company, jobTitle: a.jobTitle,
            phone: a.phone, firstSeenAt: new Date(), lastSeenAt: new Date(),
          }).returning();
          orgAttendeeId = oa.id;
        }

        // Upsert event_attendee (event-specific, no PII)
        const existingEA = await db.select().from(eventAttendees)
          .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.orgAttendeeId, orgAttendeeId)));

        if (existingEA.length > 0) {
          await db.update(eventAttendees).set({
            externalId: a.externalId, badgeCode: a.badgeCode,
            registrationStatus: a.registrationStatus, lastSyncedAt: new Date(), updatedAt: new Date(),
          }).where(eq(eventAttendees.id, existingEA[0].id));
        } else {
          await db.insert(eventAttendees).values({
            eventId, orgAttendeeId, externalId: a.externalId,
            badgeCode: a.badgeCode, registrationStatus: a.registrationStatus,
            registrationType: a.registrationType, checkedIn: a.checkedIn || false,
            lastSyncedAt: new Date(),
          });
        }
        upsertCount++;
      }

      await db.update(platformConnections).set({
        syncStatus: "idle", lastFullSyncAt: new Date(),
        lastSyncCount: upsertCount, updatedAt: new Date(),
      }).where(eq(platformConnections.id, conn.id));

      await db.update(events).set({ lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(events.id, eventId));

      res.json({ success: true, synced: upsertCount });
    } catch (syncErr: any) {
      await db.update(platformConnections).set({
        syncStatus: "error", lastSyncError: syncErr.message, updatedAt: new Date(),
      }).where(eq(platformConnections.id, conn.id));
      throw syncErr;
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

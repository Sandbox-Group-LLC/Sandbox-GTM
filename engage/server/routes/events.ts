/**
 * Events + Platform Connections routes
 *
 * GET    /api/connections
 * POST   /api/connections
 * PATCH  /api/connections/:id
 * DELETE /api/connections/:id
 *
 * GET    /api/events
 * POST   /api/events/sync/:connectionId   — pull events from platform + upsert
 * GET    /api/events/:eventId
 */

import { Router } from "express";
import { db } from "../db.js";
import { events, platformConnections, sessions } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { createAdapter } from "../integrations/adapter-factory.js";
import type { AdapterType } from "../integrations/adapter-factory.js";

const router = Router();

// ---------------------------------------------------------------------------
// Platform Connections
// ---------------------------------------------------------------------------

router.get("/connections", async (_req, res) => {
  try {
    const rows = await db.select().from(platformConnections);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/connections", async (req, res) => {
  try {
    const [created] = await db.insert(platformConnections).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/connections/:id", async (req, res) => {
  try {
    const [updated] = await db.update(platformConnections)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(platformConnections.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Connection not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/connections/:id", async (req, res) => {
  try {
    await db.delete(platformConnections).where(eq(platformConnections.id, req.params.id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

router.get("/events", async (_req, res) => {
  try {
    const rows = await db.select().from(events);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/events/:eventId", async (req, res) => {
  try {
    const [event] = await db.select().from(events).where(eq(events.id, req.params.eventId));
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/sync/:connectionId — pull events from platform and upsert locally
router.post("/events/sync/:connectionId", async (req, res) => {
  try {
    const [conn] = await db.select().from(platformConnections).where(eq(platformConnections.id, req.params.connectionId));
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    const adapter = createAdapter(conn.adapter as AdapterType, {
      apiUrl: conn.apiUrl || undefined,
      apiKey: conn.apiKey || "",
      profileId: conn.profileId || undefined,
    });

    const externalEvents = await adapter.getEvents();
    let upserted = 0;
    for (const ext of externalEvents) {
      await db.insert(events).values({
        connectionId: conn.id,
        externalId: ext.externalId,
        name: ext.name,
        startDate: ext.startDate ? new Date(ext.startDate) : null,
        endDate: ext.endDate ? new Date(ext.endDate) : null,
        timezone: ext.timezone,
        venue: ext.venue,
        metaJson: ext.meta,
        lastSyncedAt: new Date(),
      }).onConflictDoUpdate({
        target: [events.connectionId, events.externalId],
        set: { name: ext.name, lastSyncedAt: new Date(), updatedAt: new Date() },
      });
      upserted++;
    }

    await db.update(platformConnections)
      .set({ lastSyncedAt: new Date() })
      .where(eq(platformConnections.id, conn.id));

    res.json({ synced: upserted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/sessions
router.get("/events/:eventId/sessions", async (req, res) => {
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/sessions/sync — pull sessions from platform
router.post("/events/:eventId/sessions/sync", async (req, res) => {
  try {
    const { eventId } = req.params;
    const [eventRow] = await db.select({
      event: events,
      conn: platformConnections,
    }).from(events)
      .innerJoin(platformConnections, eq(events.connectionId, platformConnections.id))
      .where(eq(events.id, eventId));

    if (!eventRow) return res.status(404).json({ error: "Event not found" });

    const adapter = createAdapter(eventRow.conn.adapter as AdapterType, {
      apiUrl: eventRow.conn.apiUrl || undefined,
      apiKey: eventRow.conn.apiKey || "",
      profileId: eventRow.conn.profileId || undefined,
    });

    const externalSessions = await adapter.getSessions(eventRow.event.externalId);
    for (const ext of externalSessions) {
      await db.insert(sessions).values({
        eventId,
        externalId: ext.externalId,
        title: ext.title,
        description: ext.description,
        startTime: ext.startTime ? new Date(ext.startTime) : null,
        endTime: ext.endTime ? new Date(ext.endTime) : null,
        room: ext.room,
        sessionType: ext.sessionType,
        capacity: ext.capacity,
        metaJson: ext.meta,
      }).onConflictDoUpdate({
        target: [sessions.eventId, sessions.externalId],
        set: { title: ext.title, updatedAt: new Date() },
      });
    }

    res.json({ synced: externalSessions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

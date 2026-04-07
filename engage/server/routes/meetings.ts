/**
 * Meetings routes
 *
 * GET    /api/events/:eventId/meetings
 * POST   /api/events/:eventId/meetings
 * GET    /api/events/:eventId/meetings/stats
 * PATCH  /api/meetings/:meetingId
 * POST   /api/meetings/:meetingId/outcome
 */

import { Router } from "express";
import { db } from "../db.js";
import { meetings, attendees } from "../../shared/schema.js";
import { eq, and, count, sql } from "drizzle-orm";

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/meetings
router.get("/", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, intentType } = req.query as Record<string, string>;

    const conditions = [eq(meetings.eventId, eventId)];
    if (status && status !== "all") conditions.push(eq(meetings.status, status));
    if (intentType && intentType !== "all") conditions.push(eq(meetings.intentType, intentType));

    const rows = await db.select({
      meeting: meetings,
      attendee: attendees,
    }).from(meetings)
      .leftJoin(attendees, eq(meetings.attendeeId, attendees.id))
      .where(and(...conditions));

    res.json(rows.map(r => ({ ...r.meeting, attendee: r.attendee })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/meetings
router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(meetings)
      .values({ ...req.body, eventId: req.params.eventId, status: "pending" })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/meetings/stats
router.get("/stats", async (req, res) => {
  try {
    const { eventId } = req.params;
    const [total] = await db.select({ count: count() }).from(meetings).where(eq(meetings.eventId, eventId));
    const [pending] = await db.select({ count: count() }).from(meetings)
      .where(and(eq(meetings.eventId, eventId), eq(meetings.status, "pending")));
    const [withOutcome] = await db.select({ count: count() }).from(meetings)
      .where(and(eq(meetings.eventId, eventId), sql`${meetings.outcomeType} is not null`));
    const [highIntent] = await db.select({ count: count() }).from(meetings)
      .where(and(eq(meetings.eventId, eventId), eq(meetings.intentStrength, "high")));

    res.json({
      totalMeetings: total.count,
      pendingResponses: pending.count,
      outcomesCaptured: withOutcome.count,
      highIntent: highIntent.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/meetings/:meetingId
router.patch("/:meetingId", async (req, res) => {
  try {
    const [updated] = await db.update(meetings)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(meetings.id, req.params.meetingId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Meeting not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meetings/:meetingId/outcome
router.post("/:meetingId/outcome", async (req, res) => {
  try {
    const { outcomeType, outcomeConfidence, dealRange, timeline, outcomeNotes } = req.body;
    const [updated] = await db.update(meetings)
      .set({ outcomeType, outcomeConfidence, dealRange, timeline, outcomeNotes, status: "completed", updatedAt: new Date() })
      .where(eq(meetings.id, req.params.meetingId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Meeting not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

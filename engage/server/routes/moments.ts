import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { moments, momentResponses } from "../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";

type EP = { eventId: string };
const router = Router({ mergeParams: true });

router.get("/", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(moments)
      .where(eq(moments.eventId, req.params.eventId)).orderBy(desc(moments.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req: Request<EP>, res: Response) => {
  try {
    const { type, title, prompt, optionsJson, sessionId, showResults } = req.body;
    if (!type || !title) return res.status(400).json({ error: "type and title required" });
    const [m] = await db.insert(moments).values({
      eventId: req.params.eventId, type, title, prompt,
      optionsJson, sessionId: sessionId || null, showResults: showResults || false, status: "draft",
    }).returning();
    res.status(201).json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/status", async (req: Request<EP & { id: string }>, res: Response) => {
  try {
    const { status } = req.body;
    if (!["draft","live","locked","ended"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const [m] = await db.update(moments).set({
      status,
      ...(status === "live" ? { startTime: new Date() } : {}),
      ...(status === "ended" ? { endTime: new Date() } : {}),
      updatedAt: new Date(),
    }).where(and(eq(moments.id, req.params.id), eq(moments.eventId, req.params.eventId))).returning();
    if (!m) return res.status(404).json({ error: "Moment not found" });
    res.json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id", async (req: Request<EP & { id: string }>, res: Response) => {
  try {
    const { title, prompt, optionsJson, showResults, sessionId } = req.body;
    const [m] = await db.update(moments).set({
      ...(title !== undefined && { title }),
      ...(prompt !== undefined && { prompt }),
      ...(optionsJson !== undefined && { optionsJson }),
      ...(showResults !== undefined && { showResults }),
      ...(sessionId !== undefined && { sessionId }),
      updatedAt: new Date(),
    }).where(and(eq(moments.id, req.params.id), eq(moments.eventId, req.params.eventId))).returning();
    if (!m) return res.status(404).json({ error: "Moment not found" });
    res.json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/moments/:id  (public — for attendee QR scan)
router.get("/:id", async (req: Request<any>, res: Response) => {
  try {
    const [m] = await db.select().from(moments).where(eq(moments.id, req.params.id));
    if (!m) return res.status(404).json({ error: "Moment not found" });
    res.json(m);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/moments/:id/respond  (public)
router.post("/:id/respond", async (req: Request<any>, res: Response) => {
  try {
    const [m] = await db.select().from(moments).where(eq(moments.id, req.params.id));
    if (!m) return res.status(404).json({ error: "Moment not found" });
    if (m.status !== "live") return res.status(400).json({ error: "Moment is not accepting responses" });

    const { payloadJson, eventAttendeeId } = req.body;
    const [resp] = await db.insert(momentResponses).values({
      momentId: m.id, eventId: m.eventId,
      eventAttendeeId: eventAttendeeId || null,
      payloadJson,
    }).returning();
    res.status(201).json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET results
router.get("/:id/results", async (req: Request<any>, res: Response) => {
  try {
    const [m] = await db.select().from(moments).where(eq(moments.id, req.params.id));
    if (!m) return res.status(404).json({ error: "Moment not found" });
    const responses = await db.select().from(momentResponses).where(eq(momentResponses.momentId, m.id));
    res.json({ moment: m, responses, count: responses.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;

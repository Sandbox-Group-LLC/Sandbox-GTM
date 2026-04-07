import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { moments, momentResponses } from "../../shared/schema.js";
import { eq, count } from "drizzle-orm";

type EP = { eventId: string };
type MP = { momentId: string };
const router = Router({ mergeParams: true });

router.get("/", async (req: Request<EP>, res: Response) => {
  try {
    const rows = await db.select().from(moments).where(eq(moments.eventId, req.params.eventId));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request<EP>, res: Response) => {
  try {
    const [created] = await db.insert(moments)
      .values({ ...req.body, eventId: req.params.eventId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:momentId", async (req: Request<MP>, res: Response) => {
  try {
    const [updated] = await db.update(moments)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(moments.id, req.params.momentId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Moment not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:momentId", async (req: Request<MP>, res: Response) => {
  try {
    await db.delete(momentResponses).where(eq(momentResponses.momentId, req.params.momentId));
    await db.delete(moments).where(eq(moments.id, req.params.momentId));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:momentId/public", async (req: Request<MP>, res: Response) => {
  try {
    const [moment] = await db.select().from(moments).where(eq(moments.id, req.params.momentId));
    if (!moment) return res.status(404).json({ error: "Moment not found" });
    if (moment.status === "ended") return res.status(410).json({ error: "This moment has ended" });
    res.json(moment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:momentId/respond", async (req: Request<MP>, res: Response) => {
  try {
    const [moment] = await db.select().from(moments).where(eq(moments.id, req.params.momentId));
    if (!moment) return res.status(404).json({ error: "Moment not found" });
    if (moment.status !== "live") return res.status(403).json({ error: "Moment is not accepting responses" });
    const [response] = await db.insert(momentResponses).values({
      momentId: moment.id,
      eventId: moment.eventId,
      attendeeId: req.body.attendeeId || null,
      payloadJson: req.body.payload,
    }).returning();
    res.status(201).json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:momentId/results", async (req: Request<MP>, res: Response) => {
  try {
    const [moment] = await db.select().from(moments).where(eq(moments.id, req.params.momentId));
    if (!moment) return res.status(404).json({ error: "Moment not found" });
    const responses = await db.select().from(momentResponses).where(eq(momentResponses.momentId, moment.id));
    const [totalRow] = await db.select({ count: count() }).from(momentResponses).where(eq(momentResponses.momentId, moment.id));
    res.json({ moment, totalResponses: totalRow.count, responses: moment.showResults ? responses : [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

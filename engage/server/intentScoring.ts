/**
 * Engagement Signals Engine
 *
 * Core principle: Explicit intent always beats inferred behavior.
 *
 * Tier 1 — Explicit buying signals (immediate promotion eligible):
 *   Product interactions: wants_trial_pilot, asked_for_pricing, requested_follow_up
 *   Meeting outcomes:     active_opportunity, deal_in_progress + now/this_quarter timeline
 *   Tags:                 budget_confirmed, urgent_timeline, buying_committee
 *
 * Tier 2 — Momentum modifiers (cumulative, capped at 10):
 *   intentLevel:          low=1, medium=2, high=3
 *   roleTags:             decision_maker=1, executive=1
 *   engagementFrequency:  +1 per interaction beyond the first
 *   opportunityPotential: 50k_to_100k=2, over_100k=3
 *
 * Promotion logic:
 *   engaged:     momentum >= 3 (any meaningful activity)
 *   high_intent: Tier 1 signal OR momentum >= 8
 *   hot_lead:    Tier 1 signal AND (opportunity >= $50k OR multiple high-intent interactions)
 *
 * Contra-signals: add nuance to narrative without blocking promotion
 */

import { db } from "./db.js";
import { attendees, productInteractions, meetings, sessionCheckIns, intentRecomputeHistory } from "../shared/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import type { IntentSource } from "../shared/schema.js";

// ---------------------------------------------------------------------------
// Tier 1 — Explicit buying signals
// ---------------------------------------------------------------------------

const TIER1_OUTCOMES = new Set([
  "wants_trial_pilot",
  "asked_for_pricing",
  "requested_follow_up",
]);

const TIER1_MEETING_OUTCOMES = new Set([
  "active_opportunity",
  "deal_in_progress",
]);

const TIER1_TAGS = new Set([
  "budget_confirmed",
  "urgent_timeline",
  "buying_committee",
]);

const IMMEDIATE_TIMELINE = new Set(["now", "this_quarter"]);

// ---------------------------------------------------------------------------
// Tier 2 — Momentum point values
// ---------------------------------------------------------------------------

const INTENT_POINTS: Record<string, number> = { low: 1, medium: 2, high: 3 };
const OPP_POINTS: Record<string, number> = {
  under_10k: 0,
  "10k_to_50k": 1,
  "50k_to_100k": 2,
  over_100k: 3,
};
const ROLE_TAGS = new Set(["decision_maker", "executive"]);
const MOMENTUM_CAP = 10;

// ---------------------------------------------------------------------------
// Signal labels (human-readable for narrative)
// ---------------------------------------------------------------------------

const OUTCOME_LABELS: Record<string, string> = {
  wants_trial_pilot: "requested a trial or pilot",
  asked_for_pricing: "asked for pricing",
  requested_follow_up: "requested a follow-up",
  intro_to_stakeholder: "requested stakeholder introduction",
  not_a_fit: "indicated not a fit",
  too_early: "indicated too early in evaluation",
  other: "noted other outcome",
};

const MEETING_OUTCOME_LABELS: Record<string, string> = {
  active_opportunity: "active opportunity identified in meeting",
  deal_in_progress: "deal in progress from meeting",
  follow_up_scheduled: "follow-up scheduled from meeting",
  early_interest: "early interest expressed in meeting",
  no_fit: "no fit in meeting",
};

const INTENT_LABELS: Record<string, string> = {
  low: "low intent",
  medium: "medium intent",
  high: "high intent",
};

// ---------------------------------------------------------------------------
// Score a single attendee given their raw signal data
// ---------------------------------------------------------------------------

interface AttendeeSignals {
  interactions: typeof productInteractions.$inferSelect[];
  meetingList: typeof meetings.$inferSelect[];
  checkIns: typeof sessionCheckIns.$inferSelect[];
}

interface ScoringResult {
  intentStatus: "none" | "engaged" | "high_intent" | "hot_lead";
  momentumScore: number;
  salesReady: boolean;
  intentSources: IntentSource[];
  intentNarrative: string;
}

export function scoreAttendee(
  attendeeId: string,
  signals: AttendeeSignals
): ScoringResult {
  const sources: IntentSource[] = [];
  let tier1Fired = false;
  let tier1Count = 0;
  let hasLargeOpportunity = false;
  let momentumRaw = 0;
  const contraSignals: string[] = [];

  // ── Tier 1: Product interactions ──────────────────────────────────────────
  for (const pi of signals.interactions) {
    // Tier 1 outcome check
    if (TIER1_OUTCOMES.has(pi.outcome)) {
      tier1Fired = true;
      tier1Count++;
      sources.push({
        type: "product_interaction",
        id: pi.id,
        signal: OUTCOME_LABELS[pi.outcome] || pi.outcome,
        tier: 1,
        createdAt: pi.createdAt?.toISOString() || new Date().toISOString(),
      });
    }

    // Tier 1 tag check
    const tags = (pi.tags || []) as string[];
    for (const tag of tags) {
      if (TIER1_TAGS.has(tag)) {
        tier1Fired = true;
        tier1Count++;
        sources.push({
          type: "product_interaction",
          id: pi.id,
          signal: `tag: ${tag.replace(/_/g, " ")}`,
          tier: 1,
          createdAt: pi.createdAt?.toISOString() || new Date().toISOString(),
        });
      }
    }

    // Opportunity size
    if (pi.opportunityPotential === "50k_to_100k" || pi.opportunityPotential === "over_100k") {
      hasLargeOpportunity = true;
    }

    // Tier 2: intent level points
    const intentPts = INTENT_POINTS[pi.intentLevel || "low"] || 0;
    momentumRaw += intentPts;
    if (intentPts > 0) {
      sources.push({
        type: "product_interaction",
        id: pi.id,
        signal: `${INTENT_LABELS[pi.intentLevel]} product interaction`,
        tier: 2,
        points: intentPts,
        createdAt: pi.createdAt?.toISOString() || new Date().toISOString(),
      });
    }

    // Tier 2: opportunity potential
    const oppPts = OPP_POINTS[pi.opportunityPotential || ""] || 0;
    if (oppPts > 0) {
      momentumRaw += oppPts;
      sources.push({
        type: "product_interaction",
        id: pi.id,
        signal: `opportunity potential: ${pi.opportunityPotential?.replace(/_/g, " ")}`,
        tier: 2,
        points: oppPts,
        createdAt: pi.createdAt?.toISOString() || new Date().toISOString(),
      });
    }

    // Tier 2: role tags
    for (const tag of tags) {
      if (ROLE_TAGS.has(tag)) {
        momentumRaw += 1;
        sources.push({
          type: "product_interaction",
          id: pi.id,
          signal: `role: ${tag.replace(/_/g, " ")}`,
          tier: 2,
          points: 1,
          createdAt: pi.createdAt?.toISOString() || new Date().toISOString(),
        });
      }
    }

    // Contra-signals
    if (pi.outcome === "not_a_fit") contraSignals.push("indicated not a fit at product station");
    if (pi.outcome === "too_early") contraSignals.push("indicated too early in evaluation cycle");
  }

  // Frequency bonus: +1 per interaction beyond the first
  if (signals.interactions.length > 1) {
    const freqPts = signals.interactions.length - 1;
    momentumRaw += freqPts;
    sources.push({
      type: "product_interaction",
      id: "frequency",
      signal: `${signals.interactions.length} total product interactions (frequency bonus)`,
      tier: 2,
      points: freqPts,
      createdAt: new Date().toISOString(),
    });
  }

  // ── Tier 1: Meeting outcomes ───────────────────────────────────────────────
  for (const m of signals.meetingList) {
    if (m.outcomeType && TIER1_MEETING_OUTCOMES.has(m.outcomeType)) {
      const isImmediate = m.timeline && IMMEDIATE_TIMELINE.has(m.timeline);
      if (isImmediate || m.outcomeType === "deal_in_progress") {
        tier1Fired = true;
        tier1Count++;
        sources.push({
          type: "meeting",
          id: m.id,
          signal: MEETING_OUTCOME_LABELS[m.outcomeType] || m.outcomeType,
          tier: 1,
          createdAt: m.createdAt?.toISOString() || new Date().toISOString(),
        });
      }
    }

    // Tier 2: deal range from meeting
    if (m.dealRange === "25k_to_100k") { momentumRaw += 2; }
    if (m.dealRange === "over_100k") { momentumRaw += 3; hasLargeOpportunity = true; }

    if (m.dealRange && m.dealRange !== "under_25k") {
      sources.push({
        type: "meeting",
        id: m.id,
        signal: `deal range from meeting: ${m.dealRange.replace(/_/g, " ")}`,
        tier: 2,
        points: m.dealRange === "over_100k" ? 3 : 2,
        createdAt: m.createdAt?.toISOString() || new Date().toISOString(),
      });
    }

    if (m.outcomeType === "no_fit") contraSignals.push("meeting outcome indicated no fit");
  }

  // ── Tier 2: Session check-ins (physical presence signal) ─────────────────
  if (signals.checkIns.length > 0) {
    const pts = Math.min(signals.checkIns.length, 2); // cap at 2 pts
    momentumRaw += pts;
    sources.push({
      type: "session_checkin",
      id: signals.checkIns[0].id,
      signal: `attended ${signals.checkIns.length} session${signals.checkIns.length !== 1 ? "s" : ""}`,
      tier: 2,
      points: pts,
      createdAt: signals.checkIns[0].checkedInAt?.toISOString() || new Date().toISOString(),
    });
  }

  // ── Cap momentum and determine status ─────────────────────────────────────
  const momentumScore = Math.min(momentumRaw, MOMENTUM_CAP);

  let intentStatus: ScoringResult["intentStatus"] = "none";
  let salesReady = false;

  if (tier1Fired && (hasLargeOpportunity || tier1Count >= 2)) {
    intentStatus = "hot_lead";
    salesReady = true;
  } else if (tier1Fired || momentumScore >= 8) {
    intentStatus = "high_intent";
    salesReady = true;
  } else if (momentumScore >= 3) {
    intentStatus = "engaged";
  }

  // ── Build narrative ────────────────────────────────────────────────────────
  const intentNarrative = buildNarrative(intentStatus, momentumScore, sources, contraSignals, {
    interactionCount: signals.interactions.length,
    meetingCount: signals.meetingList.length,
    sessionCount: signals.checkIns.length,
    hasLargeOpportunity,
    tier1Count,
  });

  return { intentStatus, momentumScore, salesReady, intentSources: sources, intentNarrative };
}

function buildNarrative(
  status: string,
  score: number,
  sources: IntentSource[],
  contraSignals: string[],
  ctx: { interactionCount: number; meetingCount: number; sessionCount: number; hasLargeOpportunity: boolean; tier1Count: number }
): string {
  const tier1Sources = sources.filter(s => s.tier === 1);
  const parts: string[] = [];

  if (status === "hot_lead") {
    parts.push(`Promoted to Hot Lead based on ${tier1Sources.length} explicit buying signal${tier1Sources.length !== 1 ? "s" : ""}.`);
    if (ctx.hasLargeOpportunity) parts.push("Opportunity potential indicates a deal of $50K or greater.");
    if (ctx.tier1Count >= 2) parts.push("Multiple high-intent signals confirm strong purchase intent.");
  } else if (status === "high_intent") {
    if (tier1Sources.length > 0) {
      parts.push(`Flagged as High Intent due to explicit buying signal: ${tier1Sources[0].signal}.`);
    } else {
      parts.push(`Flagged as High Intent with momentum score of ${score}/10 — consistent engagement across multiple touchpoints.`);
    }
  } else if (status === "engaged") {
    parts.push(`Engaged attendee with momentum score of ${score}/10.`);
  } else {
    parts.push("No significant engagement signals detected.");
  }

  // Activity summary
  const activities: string[] = [];
  if (ctx.interactionCount > 0) activities.push(`${ctx.interactionCount} product interaction${ctx.interactionCount !== 1 ? "s" : ""}`);
  if (ctx.meetingCount > 0) activities.push(`${ctx.meetingCount} meeting${ctx.meetingCount !== 1 ? "s" : ""}`);
  if (ctx.sessionCount > 0) activities.push(`${ctx.sessionCount} session check-in${ctx.sessionCount !== 1 ? "s" : ""}`);
  if (activities.length > 0) parts.push(`Activity: ${activities.join(", ")}.`);

  // Contra-signals
  if (contraSignals.length > 0) {
    parts.push(`Note: ${contraSignals.join("; ")}. Sales rep should verify before outreach.`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Batch recompute — idempotent, rebuilds from raw signal data
// ---------------------------------------------------------------------------

export async function recomputeEventIntent(
  eventId: string,
  triggeredBy: string = "manual"
): Promise<typeof intentRecomputeHistory.$inferSelect> {

  // Snapshot before
  const allAttendees = await db.select({
    id: attendees.id,
    intentStatus: attendees.intentStatus,
  }).from(attendees).where(eq(attendees.eventId, eventId));

  const beforeHotLeads  = allAttendees.filter(a => a.intentStatus === "hot_lead").length;
  const beforeHighIntent = allAttendees.filter(a => a.intentStatus === "high_intent").length;
  const beforeEngaged   = allAttendees.filter(a => a.intentStatus === "engaged").length;

  const attendeeIds = allAttendees.map(a => a.id);

  // Pull all raw signals for this event in bulk
  const [allInteractions, allMeetings, allCheckIns] = await Promise.all([
    attendeeIds.length > 0
      ? db.select().from(productInteractions)
          .where(and(eq(productInteractions.eventId, eventId)))
      : Promise.resolve([]),
    attendeeIds.length > 0
      ? db.select().from(meetings).where(eq(meetings.eventId, eventId))
      : Promise.resolve([]),
    attendeeIds.length > 0
      ? db.select().from(sessionCheckIns).where(eq(sessionCheckIns.eventId, eventId))
      : Promise.resolve([]),
  ]);

  // Group by attendeeId
  const interactionsByAttendee = groupBy(allInteractions, "attendeeId");
  const meetingsByAttendee = groupBy(allMeetings, "attendeeId");
  const checkInsByAttendee = groupBy(allCheckIns, "attendeeId");

  let totalPromoted = 0;
  let afterHotLeads = 0, afterHighIntent = 0, afterEngaged = 0;

  // Score and update each attendee
  for (const attendee of allAttendees) {
    const signals: AttendeeSignals = {
      interactions: interactionsByAttendee[attendee.id] || [],
      meetingList: meetingsByAttendee[attendee.id] || [],
      checkIns: checkInsByAttendee[attendee.id] || [],
    };

    const result = scoreAttendee(attendee.id, signals);

    // Count promotions (status changed or newly scored)
    if (result.intentStatus !== attendee.intentStatus && result.intentStatus !== "none") {
      totalPromoted++;
    }

    if (result.intentStatus === "hot_lead") afterHotLeads++;
    else if (result.intentStatus === "high_intent") afterHighIntent++;
    else if (result.intentStatus === "engaged") afterEngaged++;

    await db.update(attendees).set({
      intentStatus: result.intentStatus,
      momentumScore: result.momentumScore,
      salesReady: result.salesReady,
      intentSources: result.intentSources,
      intentNarrative: result.intentNarrative,
      lastScoredAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(attendees.id, attendee.id));
  }

  // Write history record
  const [historyRecord] = await db.insert(intentRecomputeHistory).values({
    eventId,
    beforeHotLeads,
    beforeHighIntent,
    beforeEngaged,
    afterHotLeads,
    afterHighIntent,
    afterEngaged,
    deltaHotLeads: afterHotLeads - beforeHotLeads,
    deltaHighIntent: afterHighIntent - beforeHighIntent,
    deltaEngaged: afterEngaged - beforeEngaged,
    totalAttendees: allAttendees.length,
    totalPromoted,
    triggeredBy,
  }).returning();

  return historyRecord;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function groupBy<T extends Record<string, any>>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = item[key] || "__unmatched__";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

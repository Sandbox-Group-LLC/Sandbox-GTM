import { db } from "./db.js";
import { orgAttendees, eventAttendees, productInteractions, meetings, sessionCheckIns, intentRecomputeHistory, events } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import type { IntentSource } from "../shared/schema.js";

const TIER1_OUTCOMES = new Set(["wants_trial_pilot","asked_for_pricing","requested_follow_up"]);
const TIER1_MEETING_OUTCOMES = new Set(["active_opportunity","deal_in_progress"]);
const TIER1_TAGS = new Set(["budget_confirmed","urgent_timeline","buying_committee"]);
const IMMEDIATE_TIMELINE = new Set(["now","this_quarter"]);
const INTENT_POINTS: Record<string,number> = { low:1, medium:2, high:3 };
const OPP_POINTS: Record<string,number> = { under_10k:0,"10k_to_50k":1,"50k_to_100k":2,over_100k:3 };
const ROLE_TAGS = new Set(["decision_maker","executive"]);
const MOMENTUM_CAP = 10;

const OUTCOME_LABELS: Record<string,string> = {
  wants_trial_pilot:"requested a trial or pilot", asked_for_pricing:"asked for pricing",
  requested_follow_up:"requested a follow-up", intro_to_stakeholder:"requested stakeholder introduction",
  not_a_fit:"indicated not a fit", too_early:"indicated too early", other:"noted other outcome",
};
const MEETING_OUTCOME_LABELS: Record<string,string> = {
  active_opportunity:"active opportunity identified", deal_in_progress:"deal in progress",
  follow_up_scheduled:"follow-up scheduled", early_interest:"early interest expressed", no_fit:"no fit",
};
const INTENT_LABELS: Record<string,string> = { low:"low intent", medium:"medium intent", high:"high intent" };

interface AttendeeSignals {
  interactions: typeof productInteractions.$inferSelect[];
  meetingList: typeof meetings.$inferSelect[];
  checkIns: typeof sessionCheckIns.$inferSelect[];
}

interface ScoringResult {
  intentStatus: "none"|"engaged"|"high_intent"|"hot_lead";
  momentumScore: number;
  salesReady: boolean;
  intentSources: IntentSource[];
  intentNarrative: string;
}

export function scoreAttendee(eventAttendeeId: string, signals: AttendeeSignals): ScoringResult {
  const sources: IntentSource[] = [];
  let tier1Fired = false, tier1Count = 0, hasLargeOpp = false, momentumRaw = 0;
  const contra: string[] = [];

  for (const pi of signals.interactions) {
    if (TIER1_OUTCOMES.has(pi.outcome)) {
      tier1Fired = true; tier1Count++;
      sources.push({ type:"product_interaction", id:pi.id, signal:OUTCOME_LABELS[pi.outcome]||pi.outcome, tier:1, createdAt:pi.createdAt?.toISOString()||new Date().toISOString() });
    }
    const tags = (pi.tags||[]) as string[];
    for (const tag of tags) {
      if (TIER1_TAGS.has(tag)) {
        tier1Fired = true; tier1Count++;
        sources.push({ type:"product_interaction", id:pi.id, signal:`tag: ${tag.replace(/_/g," ")}`, tier:1, createdAt:pi.createdAt?.toISOString()||new Date().toISOString() });
      }
    }
    if (pi.opportunityPotential==="50k_to_100k"||pi.opportunityPotential==="over_100k") hasLargeOpp = true;
    const intentPts = INTENT_POINTS[pi.intentLevel||"low"]||0;
    if (intentPts>0) { momentumRaw+=intentPts; sources.push({ type:"product_interaction", id:pi.id, signal:`${INTENT_LABELS[pi.intentLevel]} product interaction`, tier:2, points:intentPts, createdAt:pi.createdAt?.toISOString()||new Date().toISOString() }); }
    const oppPts = OPP_POINTS[pi.opportunityPotential||""]||0;
    if (oppPts>0) { momentumRaw+=oppPts; sources.push({ type:"product_interaction", id:pi.id, signal:`opportunity: ${pi.opportunityPotential?.replace(/_/g," ")}`, tier:2, points:oppPts, createdAt:pi.createdAt?.toISOString()||new Date().toISOString() }); }
    for (const tag of tags) { if (ROLE_TAGS.has(tag)) { momentumRaw+=1; sources.push({ type:"product_interaction", id:pi.id, signal:`role: ${tag.replace(/_/g," ")}`, tier:2, points:1, createdAt:pi.createdAt?.toISOString()||new Date().toISOString() }); } }
    if (pi.outcome==="not_a_fit") contra.push("indicated not a fit");
    if (pi.outcome==="too_early") contra.push("indicated too early in evaluation");
  }
  if (signals.interactions.length>1) {
    const fp = signals.interactions.length-1; momentumRaw+=fp;
    sources.push({ type:"product_interaction", id:"frequency", signal:`${signals.interactions.length} total interactions (frequency bonus)`, tier:2, points:fp, createdAt:new Date().toISOString() });
  }
  for (const m of signals.meetingList) {
    if (m.outcomeType && TIER1_MEETING_OUTCOMES.has(m.outcomeType)) {
      if (m.timeline && IMMEDIATE_TIMELINE.has(m.timeline)||m.outcomeType==="deal_in_progress") {
        tier1Fired=true; tier1Count++;
        sources.push({ type:"meeting", id:m.id, signal:MEETING_OUTCOME_LABELS[m.outcomeType]||m.outcomeType, tier:1, createdAt:m.createdAt?.toISOString()||new Date().toISOString() });
      }
    }
    if (m.dealRange==="25k_to_100k") momentumRaw+=2;
    if (m.dealRange==="over_100k") { momentumRaw+=3; hasLargeOpp=true; }
    if (m.dealRange&&m.dealRange!=="under_25k") sources.push({ type:"meeting", id:m.id, signal:`deal range: ${m.dealRange.replace(/_/g," ")}`, tier:2, points:m.dealRange==="over_100k"?3:2, createdAt:m.createdAt?.toISOString()||new Date().toISOString() });
    if (m.outcomeType==="no_fit") contra.push("meeting outcome: no fit");
  }
  if (signals.checkIns.length>0) {
    const pts = Math.min(signals.checkIns.length,2); momentumRaw+=pts;
    sources.push({ type:"session_checkin", id:signals.checkIns[0].id, signal:`attended ${signals.checkIns.length} session${signals.checkIns.length!==1?"s":""}`, tier:2, points:pts, createdAt:signals.checkIns[0].checkedInAt?.toISOString()||new Date().toISOString() });
  }
  const momentumScore = Math.min(momentumRaw, MOMENTUM_CAP);
  let intentStatus: ScoringResult["intentStatus"] = "none";
  let salesReady = false;
  if (tier1Fired&&(hasLargeOpp||tier1Count>=2)) { intentStatus="hot_lead"; salesReady=true; }
  else if (tier1Fired||momentumScore>=8) { intentStatus="high_intent"; salesReady=true; }
  else if (momentumScore>=3) intentStatus="engaged";
  const intentNarrative = buildNarrative(intentStatus, momentumScore, sources, contra, {
    interactionCount:signals.interactions.length, meetingCount:signals.meetingList.length,
    sessionCount:signals.checkIns.length, hasLargeOpp, tier1Count,
  });
  return { intentStatus, momentumScore, salesReady, intentSources:sources, intentNarrative };
}

function buildNarrative(status:string, score:number, sources:IntentSource[], contra:string[], ctx:{interactionCount:number;meetingCount:number;sessionCount:number;hasLargeOpp:boolean;tier1Count:number}): string {
  const tier1 = sources.filter(s=>s.tier===1);
  const parts: string[] = [];
  if (status==="hot_lead") {
    parts.push(`Promoted to Hot Lead based on ${tier1.length} explicit buying signal${tier1.length!==1?"s":""}.`);
    if (ctx.hasLargeOpp) parts.push("Opportunity potential indicates $50K or greater.");
    if (ctx.tier1Count>=2) parts.push("Multiple high-intent signals confirm strong purchase intent.");
  } else if (status==="high_intent") {
    parts.push(tier1.length>0 ? `Flagged as High Intent: ${tier1[0].signal}.` : `Flagged as High Intent with momentum score ${score}/10.`);
  } else if (status==="engaged") {
    parts.push(`Engaged attendee with momentum score ${score}/10.`);
  } else { parts.push("No significant engagement signals detected."); }
  const acts: string[] = [];
  if (ctx.interactionCount>0) acts.push(`${ctx.interactionCount} product interaction${ctx.interactionCount!==1?"s":""}`);
  if (ctx.meetingCount>0) acts.push(`${ctx.meetingCount} meeting${ctx.meetingCount!==1?"s":""}`);
  if (ctx.sessionCount>0) acts.push(`${ctx.sessionCount} session check-in${ctx.sessionCount!==1?"s":""}`);
  if (acts.length>0) parts.push(`Activity: ${acts.join(", ")}.`);
  if (contra.length>0) parts.push(`Note: ${contra.join("; ")}. Verify before outreach.`);
  return parts.join(" ");
}

function groupBy<T extends Record<string,any>>(arr:T[], key:string): Record<string,T[]> {
  return arr.reduce((acc,item) => { const k=item[key]||"__unmatched__"; if (!acc[k]) acc[k]=[]; acc[k].push(item); return acc; }, {} as Record<string,T[]>);
}

// ── Event-scoped recompute ────────────────────────────────────────────────────
export async function recomputeEventIntent(eventId: string, triggeredBy="manual") {
  // Get org for this event
  const [ev] = await db.select({ orgId: events.orgId }).from(events).where(eq(events.id, eventId));
  if (!ev) throw new Error("Event not found");

  const allEventAttendees = await db.select({ id: eventAttendees.id, eventIntentStatus: eventAttendees.eventIntentStatus })
    .from(eventAttendees).where(eq(eventAttendees.eventId, eventId));

  const beforeHotLeads   = allEventAttendees.filter(a=>a.eventIntentStatus==="hot_lead").length;
  const beforeHighIntent = allEventAttendees.filter(a=>a.eventIntentStatus==="high_intent").length;
  const beforeEngaged    = allEventAttendees.filter(a=>a.eventIntentStatus==="engaged").length;

  const eaIds = allEventAttendees.map(a=>a.id);
  if (eaIds.length===0) {
    const [h] = await db.insert(intentRecomputeHistory).values({ eventId, orgId:ev.orgId, scope:"event", beforeHotLeads:0, beforeHighIntent:0, beforeEngaged:0, afterHotLeads:0, afterHighIntent:0, afterEngaged:0, deltaHotLeads:0, deltaHighIntent:0, deltaEngaged:0, totalAttendees:0, totalPromoted:0, triggeredBy }).returning();
    return h;
  }

  const [allInteractions, allMeetings, allCheckIns] = await Promise.all([
    db.select().from(productInteractions).where(eq(productInteractions.eventId, eventId)),
    db.select().from(meetings).where(eq(meetings.eventId, eventId)),
    db.select().from(sessionCheckIns).where(eq(sessionCheckIns.eventId, eventId)),
  ]);

  const byEA_pi   = groupBy(allInteractions, "eventAttendeeId");
  const byEA_mtg  = groupBy(allMeetings, "eventAttendeeId");
  const byEA_ci   = groupBy(allCheckIns, "eventAttendeeId");

  let totalPromoted=0, afterHotLeads=0, afterHighIntent=0, afterEngaged=0;

  for (const ea of allEventAttendees) {
    const result = scoreAttendee(ea.id, {
      interactions: byEA_pi[ea.id]||[],
      meetingList:  byEA_mtg[ea.id]||[],
      checkIns:     byEA_ci[ea.id]||[],
    });
    if (result.intentStatus!==ea.eventIntentStatus && result.intentStatus!=="none") totalPromoted++;
    if (result.intentStatus==="hot_lead") afterHotLeads++;
    else if (result.intentStatus==="high_intent") afterHighIntent++;
    else if (result.intentStatus==="engaged") afterEngaged++;

    await db.update(eventAttendees).set({
      eventIntentStatus:    result.intentStatus,
      eventMomentumScore:   result.momentumScore,
      eventSalesReady:      result.salesReady,
      eventIntentSources:   result.intentSources,
      eventIntentNarrative: result.intentNarrative,
      eventLastScoredAt:    new Date(),
      updatedAt:            new Date(),
    }).where(eq(eventAttendees.id, ea.id));
  }

  // Also roll up to org_attendees lifetime score
  await rollupLifetimeScores(ev.orgId);

  const [historyRecord] = await db.insert(intentRecomputeHistory).values({
    eventId, orgId: ev.orgId, scope: "event",
    beforeHotLeads, beforeHighIntent, beforeEngaged,
    afterHotLeads, afterHighIntent, afterEngaged,
    deltaHotLeads: afterHotLeads-beforeHotLeads,
    deltaHighIntent: afterHighIntent-beforeHighIntent,
    deltaEngaged: afterEngaged-beforeEngaged,
    totalAttendees: allEventAttendees.length,
    totalPromoted, triggeredBy,
  }).returning();

  return historyRecord;
}

// ── Lifetime rollup — aggregates all event scores per org_attendee ───────────
async function rollupLifetimeScores(orgId: string) {
  const oas = await db.select({ id: orgAttendees.id }).from(orgAttendees).where(eq(orgAttendees.orgId, orgId));

  for (const oa of oas) {
    const eas = await db.select({
      eventIntentStatus: eventAttendees.eventIntentStatus,
      eventMomentumScore: eventAttendees.eventMomentumScore,
      eventSalesReady: eventAttendees.eventSalesReady,
      eventIntentSources: eventAttendees.eventIntentSources,
    }).from(eventAttendees).where(eq(eventAttendees.orgAttendeeId, oa.id));

    if (eas.length===0) continue;

    // Lifetime = best single-event status + sum of scores (capped)
    const lifetimeMomentumScore = Math.min(eas.reduce((s,e)=>s+(e.eventMomentumScore||0),0), 10);
    const lifetimeSalesReady = eas.some(e=>e.eventSalesReady);
    let lifetimeIntentStatus: "none"|"engaged"|"high_intent"|"hot_lead" = "none";
    if (eas.some(e=>e.eventIntentStatus==="hot_lead")) lifetimeIntentStatus="hot_lead";
    else if (eas.some(e=>e.eventIntentStatus==="high_intent")) lifetimeIntentStatus="high_intent";
    else if (eas.some(e=>e.eventIntentStatus==="engaged")) lifetimeIntentStatus="engaged";

    const allSources = eas.flatMap(e=>(e.eventIntentSources as IntentSource[])||[]);

    await db.update(orgAttendees).set({
      lifetimeIntentStatus,
      lifetimeMomentumScore,
      lifetimeSalesReady,
      lifetimeIntentSources: allSources,
      lastScoredAt: new Date(),
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(orgAttendees.id, oa.id));
  }
}

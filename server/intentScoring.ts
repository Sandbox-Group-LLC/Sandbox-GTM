/**
 * Intent Scoring Module
 * 
 * Implements a two-tier scoring system:
 * - Tier 1: Primary Promotion Triggers (non-additive, explicit buying intent)
 * - Tier 2: Momentum Modifiers (additive, cumulative signals)
 * 
 * Key principle: Explicit intent beats inferred behavior. 
 * Promotions are conservative, explainable, and narrative-driven.
 */

import type { 
  ProductInteraction, 
  IntentExplanation, 
  IntentExplanationContraSignal,
  IntentExplanationTotals,
  IntentLevel,
  OpportunityPotential,
} from '@shared/schema';

// Type for attendee_meetings records
interface AttendeeeMeeting {
  id: string;
  inviteeId: string;
  outcomeType: string | null;
  dealRange: string | null;
  timeline: string | null;
  intentStrength: string | null;
  status: string;
  createdAt: Date | null;
  outcomeNotes?: string | null;
}

// Tier 1 primary trigger reasons
interface PrimaryTrigger {
  reason: string;
  sourceType: 'product_interaction' | 'meeting';
  sourceId: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

// Momentum score breakdown for debugging
interface MomentumBreakdown {
  intentLevelPoints: number;
  outcomePoints: number;
  tagPoints: number;
  additionalInteractionPoints: number;
  opportunityBucketPoints: number;
  total: number;
}

// Intent level point values (Tier 2 - momentum only)
// These represent human judgment of near-term momentum in THIS interaction
// NOT a summary score - NOT sufficient on its own to promote
const INTENT_LEVEL_POINTS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

// Opportunity potential point values (MAX bucket only, not summed)
const OPPORTUNITY_BUCKET_POINTS: Record<string, number> = {
  under_10k: 1,
  '10k_to_50k': 2,
  '50k_to_100k': 3,
  over_100k: 3, // Capped to avoid inflation
};

// Tags that contribute to momentum
const TAG_POINTS: Record<string, number> = {
  decision_maker: 1,
  executive: 1,
};

// Outcome points for Tier 2 (momentum modifiers)
const MOMENTUM_OUTCOME_POINTS: Record<string, number> = {
  intro_to_stakeholder: 2,
};

// Tier 1 trigger outcomes (product interactions)
const TIER1_PRODUCT_OUTCOMES = new Set([
  'wants_trial_pilot',
  'asked_for_pricing',
  'requested_follow_up',
]);

// Tier 1 trigger outcomes (meetings)
const TIER1_MEETING_OUTCOMES = new Set([
  'active_opportunity',
]);

// Negative/contra outcomes (contextual only, do NOT disqualify globally)
const CONTRA_OUTCOMES = new Set([
  'not_a_fit',
  'too_early',
]);

/**
 * Extract Tier 1 Primary Promotion Triggers from interactions and meetings.
 * These are explicit buying intent signals that qualify for High-Intent eligibility
 * regardless of momentum score.
 * 
 * Primary triggers include:
 * - Product interaction outcomes: wants_trial_pilot, asked_for_pricing, requested_follow_up
 * - Meeting outcomes: active_opportunity
 * - Meeting timeline: 'now'
 */
export function getPrimaryTriggers(
  interactions: ProductInteraction[],
  meetings: AttendeeeMeeting[]
): PrimaryTrigger[] {
  const triggers: PrimaryTrigger[] = [];

  // Check product interactions for Tier 1 outcomes
  for (const interaction of interactions) {
    if (TIER1_PRODUCT_OUTCOMES.has(interaction.outcome)) {
      const outcomeLabels: Record<string, string> = {
        wants_trial_pilot: 'Requested trial/pilot',
        asked_for_pricing: 'Asked for pricing',
        requested_follow_up: 'Requested follow-up',
      };
      
      let reason = outcomeLabels[interaction.outcome] || interaction.outcome;
      
      // Add opportunity context if present
      if (interaction.opportunityPotential) {
        const bucketLabel = formatOpportunityBucket(interaction.opportunityPotential);
        if (bucketLabel) {
          reason += ` (${bucketLabel})`;
        }
      }
      
      triggers.push({
        reason: `Product demo: ${reason}`,
        sourceType: 'product_interaction',
        sourceId: interaction.id,
        createdAt: interaction.createdAt?.toISOString() || new Date().toISOString(),
        metadata: {
          outcome: interaction.outcome,
          opportunityPotential: interaction.opportunityPotential || '',
        },
      });
    }
  }

  // Check meetings for Tier 1 outcomes and timeline
  for (const meeting of meetings) {
    // active_opportunity is a Tier 1 trigger
    if (meeting.outcomeType && TIER1_MEETING_OUTCOMES.has(meeting.outcomeType)) {
      let reason = 'Active opportunity identified';
      
      // Add deal range and timeline context
      const contextParts: string[] = [];
      if (meeting.dealRange) {
        const rangeLabel = formatDealRange(meeting.dealRange);
        if (rangeLabel) contextParts.push(rangeLabel);
      }
      if (meeting.timeline === 'now') {
        contextParts.push('timeline: now');
      }
      
      if (contextParts.length > 0) {
        reason += ` (${contextParts.join(', ')})`;
      }
      
      triggers.push({
        reason: `Meeting: ${reason}`,
        sourceType: 'meeting',
        sourceId: meeting.id,
        createdAt: meeting.createdAt?.toISOString() || new Date().toISOString(),
        metadata: {
          outcomeType: meeting.outcomeType,
          dealRange: meeting.dealRange || '',
          timeline: meeting.timeline || '',
        },
      });
    }
    
    // timeline = 'now' is also a Tier 1 trigger (even without active_opportunity)
    if (meeting.timeline === 'now' && !TIER1_MEETING_OUTCOMES.has(meeting.outcomeType || '')) {
      triggers.push({
        reason: 'Meeting: Immediate timeline indicated',
        sourceType: 'meeting',
        sourceId: meeting.id,
        createdAt: meeting.createdAt?.toISOString() || new Date().toISOString(),
        metadata: {
          timeline: 'now',
        },
      });
    }
  }

  return triggers;
}

/**
 * Compute Tier 2 Momentum Score from cumulative signals.
 * This represents "slow burn" progression over time.
 * 
 * Point values:
 * - intent_level: LOW=1, MEDIUM=2, HIGH=3
 * - outcome=intro_to_stakeholder: +2
 * - tag=decision_maker: +1
 * - tag=executive: +1
 * - each additional product interaction after first: +1
 * - opportunityPotential (MAX bucket only): under_10k=1, 10k_50k=2, 50k_100k=3, 100k+=3
 */
export function computeMomentumScore(
  interactions: ProductInteraction[],
  meetings: AttendeeeMeeting[]
): { score: number; breakdown: MomentumBreakdown } {
  let intentLevelPoints = 0;
  let outcomePoints = 0;
  let tagPoints = 0;
  let additionalInteractionPoints = 0;
  let opportunityBucketPoints = 0;

  // Track max opportunity bucket (use max, not sum)
  let maxOpportunityBucket: string | null = null;
  const opportunityRanking = ['under_10k', '10k_to_50k', '50k_to_100k', 'over_100k'];

  // Track unique tags seen
  const seenTags = new Set<string>();

  for (const interaction of interactions) {
    // Intent level points
    if (interaction.intentLevel && INTENT_LEVEL_POINTS[interaction.intentLevel]) {
      intentLevelPoints += INTENT_LEVEL_POINTS[interaction.intentLevel];
    }

    // Outcome points (only for momentum outcomes, not Tier 1 triggers)
    if (interaction.outcome && MOMENTUM_OUTCOME_POINTS[interaction.outcome]) {
      outcomePoints += MOMENTUM_OUTCOME_POINTS[interaction.outcome];
    }

    // Tag points (only count each tag once per contact)
    if (interaction.tags && Array.isArray(interaction.tags)) {
      for (const tag of interaction.tags) {
        if (TAG_POINTS[tag] && !seenTags.has(tag)) {
          tagPoints += TAG_POINTS[tag];
          seenTags.add(tag);
        }
      }
    }

    // Track max opportunity bucket
    if (interaction.opportunityPotential) {
      const currentRank = opportunityRanking.indexOf(interaction.opportunityPotential);
      const maxRank = maxOpportunityBucket ? opportunityRanking.indexOf(maxOpportunityBucket) : -1;
      if (currentRank > maxRank) {
        maxOpportunityBucket = interaction.opportunityPotential;
      }
    }
  }

  // Additional interaction points (each after first = +1)
  if (interactions.length > 1) {
    additionalInteractionPoints = interactions.length - 1;
  }

  // Opportunity bucket points (max only)
  if (maxOpportunityBucket && OPPORTUNITY_BUCKET_POINTS[maxOpportunityBucket]) {
    opportunityBucketPoints = OPPORTUNITY_BUCKET_POINTS[maxOpportunityBucket];
  }

  const total = intentLevelPoints + outcomePoints + tagPoints + additionalInteractionPoints + opportunityBucketPoints;

  return {
    score: total,
    breakdown: {
      intentLevelPoints,
      outcomePoints,
      tagPoints,
      additionalInteractionPoints,
      opportunityBucketPoints,
      total,
    },
  };
}

/**
 * Build the IntentExplanation narrative object from all evidence.
 * This is the human-readable explanation layer for intent scoring.
 */
export function buildIntentExplanation(
  interactions: ProductInteraction[],
  meetings: AttendeeeMeeting[]
): IntentExplanation {
  const primaryTriggers = getPrimaryTriggers(interactions, meetings);
  const { score, breakdown } = computeMomentumScore(interactions, meetings);

  // Extract primary reasons (from Tier 1 triggers)
  const primary_reasons = primaryTriggers.map(t => t.reason);

  // Build supporting signals (Tier 2 momentum contributors)
  const supporting_signals: string[] = [];

  // Add intro_to_stakeholder outcomes
  const stakeholderIntros = interactions.filter(i => i.outcome === 'intro_to_stakeholder');
  if (stakeholderIntros.length > 0) {
    supporting_signals.push(`Product demo: Intro to stakeholder (${stakeholderIntros.length}x)`);
  }

  // Add next step if meaningful
  const nextStepsSet = new Set(interactions.map(i => i.nextStep).filter(Boolean));
  const nextSteps = Array.from(nextStepsSet);
  const meaningfulNextSteps: Record<string, string> = {
    schedule_meeting: 'Schedule follow-up meeting',
    schedule_call: 'Schedule follow-up call',
    send_deck_recap: 'Send deck/recap',
    connect_to_ae: 'Connect to Account Executive',
    invite_to_private_session: 'Invite to private session',
  };
  for (const ns of nextSteps) {
    if (ns && meaningfulNextSteps[ns]) {
      supporting_signals.push(`Next step agreed: ${meaningfulNextSteps[ns]}`);
    }
  }

  // Add role tags
  const allTags = new Set<string>();
  for (const interaction of interactions) {
    if (interaction.tags) {
      for (const tag of interaction.tags) {
        allTags.add(tag);
      }
    }
  }
  const roleTags = ['decision_maker', 'executive', 'buying_committee'].filter(t => allTags.has(t));
  if (roleTags.length > 0) {
    const roleLabels: Record<string, string> = {
      decision_maker: 'Decision Maker',
      executive: 'Executive',
      buying_committee: 'Buying Committee',
    };
    const roleLabelsStr = roleTags.map(t => roleLabels[t] || t).join(', ');
    supporting_signals.push(`Role tags: ${roleLabelsStr}`);
  }

  // Add interaction count if multiple
  if (interactions.length > 1) {
    supporting_signals.push(`${interactions.length} product interactions recorded`);
  }

  // Build contra signals (contextual, NOT disqualifying)
  const contra_signals: IntentExplanationContraSignal[] = [];
  for (const interaction of interactions) {
    if (CONTRA_OUTCOMES.has(interaction.outcome)) {
      const stationLabel = interaction.station 
        ? formatStation(interaction.station) 
        : 'a demo';
      
      contra_signals.push({
        type: interaction.outcome as 'not_a_fit' | 'too_early',
        scope: 'product_interaction',
        context: `Not a fit for ${stationLabel}`,
        createdAt: interaction.createdAt?.toISOString() || new Date().toISOString(),
        weight: 'local_only',
        note: 'Does not disqualify contact overall; indicates mismatch with this specific demo.',
      });
    }
  }

  // Build totals
  const allDates = [
    ...interactions.map(i => i.createdAt),
    ...meetings.map(m => m.createdAt),
  ].filter(Boolean) as Date[];
  
  const lastInteractionDate = allDates.length > 0 
    ? new Date(Math.max(...allDates.map(d => d.getTime()))).toISOString()
    : new Date().toISOString();

  const highestIntentLevel = getHighestIntentLevel(interactions);
  const mostRecentInteraction = interactions.length > 0 
    ? interactions.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      })[0]
    : null;

  const maxOpportunityBucket = getMaxOpportunityBucket(interactions);

  const totals: IntentExplanationTotals = {
    total_interactions_count: interactions.length,
    last_interaction_date: lastInteractionDate,
    momentum_score: score,
    highest_intent_level_seen: highestIntentLevel,
    most_recent_outcome: mostRecentInteraction?.outcome || null,
    max_opportunity_bucket_seen: maxOpportunityBucket,
  };

  // Add momentum-only warning if promoted based solely on momentum (no Tier 1 triggers)
  let context: string | undefined;
  if (primary_reasons.length === 0 && score >= 8) {
    context = 'Promoted based on engagement momentum - no explicit product interest captured yet. Consider direct qualification.';
  }

  return {
    primary_reasons,
    supporting_signals,
    contra_signals,
    totals,
    context,
  };
}

/**
 * Determine if contact qualifies for High-Intent Audience.
 * 
 * Promote if EITHER:
 * - At least one Tier 1 primary trigger exists
 * - OR momentum_score >= 8
 */
export function qualifiesForHighIntent(
  primaryTriggers: PrimaryTrigger[],
  momentumScore: number
): { qualifies: boolean; reason: 'tier1_trigger' | 'momentum_threshold' | null } {
  if (primaryTriggers.length > 0) {
    return { qualifies: true, reason: 'tier1_trigger' };
  }
  if (momentumScore >= 8) {
    return { qualifies: true, reason: 'momentum_threshold' };
  }
  return { qualifies: false, reason: null };
}

/**
 * Determine if contact qualifies for Hot Lead.
 * 
 * Promote if ALL are true:
 * - High-Intent Audience criteria met
 * - At least one Tier 1 primary trigger exists
 * - AND (opportunityPotential >= $50k OR two+ interactions with intent_level >= MEDIUM)
 */
export function qualifiesForHotLead(
  primaryTriggers: PrimaryTrigger[],
  momentumScore: number,
  interactions: ProductInteraction[],
  meetings: AttendeeeMeeting[]
): boolean {
  // Must qualify for High-Intent first
  const { qualifies: highIntentQualifies } = qualifiesForHighIntent(primaryTriggers, momentumScore);
  if (!highIntentQualifies) {
    return false;
  }

  // Must have at least one Tier 1 trigger
  if (primaryTriggers.length === 0) {
    return false;
  }

  // Check opportunity size (>= $50k from product interactions OR meetings)
  const maxOpportunityBucket = getMaxOpportunityBucket(interactions);
  const meetingDealRanges = meetings.map(m => m.dealRange).filter(Boolean);
  
  const qualifyingOpportunityBuckets = new Set(['50k_to_100k', 'over_100k']);
  const qualifyingDealRanges = new Set(['25k_to_100k', 'over_100k']); // Meeting deal ranges
  
  const hasQualifyingOpportunity = 
    (maxOpportunityBucket && qualifyingOpportunityBuckets.has(maxOpportunityBucket)) ||
    meetingDealRanges.some(dr => qualifyingDealRanges.has(dr as string));

  // Check for 2+ medium/high intent interactions
  const mediumHighInteractions = interactions.filter(
    i => i.intentLevel === 'medium' || i.intentLevel === 'high'
  );
  const hasTwoMediumHighInteractions = mediumHighInteractions.length >= 2;

  return hasQualifyingOpportunity || hasTwoMediumHighInteractions;
}

/**
 * Generate a CRM-ready justification note from the intent explanation.
 * This is a single consolidated note designed for copy/paste into Salesforce, HubSpot, etc.
 */
export function generateCRMJustificationNote(
  explanation: IntentExplanation,
  intentStatus: 'high_intent' | 'hot_lead',
  promotionReason?: 'tier1_trigger' | 'momentum_threshold' | null
): string {
  const lines: string[] = [];
  
  // Header
  const statusLabel = intentStatus === 'hot_lead' ? 'Hot Lead' : 'High-Intent Audience';
  lines.push(`Sandbox Intent Summary — ${statusLabel}`);
  lines.push('');

  // Primary reasons
  if (explanation.primary_reasons.length > 0) {
    lines.push('Why this matters:');
    for (const reason of explanation.primary_reasons) {
      lines.push(reason);
    }
  } else if (promotionReason === 'momentum_threshold') {
    // Guardrail: momentum-only promotion warning
    lines.push('Why this matters:');
    lines.push('Promoted based on cumulative engagement momentum.');
    lines.push('Note: No explicit pricing/trial request or active opportunity has been captured yet.');
  }

  // Supporting signals
  if (explanation.supporting_signals.length > 0) {
    lines.push('');
    lines.push('Supporting signals:');
    for (const signal of explanation.supporting_signals) {
      lines.push(`- ${signal}`);
    }
  }

  // Contra signals / caveats
  if (explanation.contra_signals.length > 0) {
    lines.push('');
    lines.push('Context / caveats:');
    for (const contra of explanation.contra_signals) {
      lines.push(`- '${formatContraType(contra.type)}' was recorded for ${contra.context.toLowerCase()} and does not negate overall buying intent.`);
    }
  }

  // Totals summary
  lines.push('');
  lines.push('Summary:');
  lines.push(`- Total interactions: ${explanation.totals.total_interactions_count}`);
  lines.push(`- Momentum score: ${explanation.totals.momentum_score}`);
  if (explanation.totals.highest_intent_level_seen) {
    lines.push(`- Highest intent level: ${explanation.totals.highest_intent_level_seen}`);
  }
  if (explanation.totals.max_opportunity_bucket_seen) {
    lines.push(`- Max opportunity: ${formatOpportunityBucket(explanation.totals.max_opportunity_bucket_seen)}`);
  }
  lines.push(`- Last activity: ${formatDate(explanation.totals.last_interaction_date)}`);

  return lines.join('\n');
}

// ============ Helper Functions ============

function getHighestIntentLevel(interactions: ProductInteraction[]): IntentLevel | null {
  const levels = interactions.map(i => i.intentLevel).filter(Boolean);
  if (levels.includes('high')) return 'high';
  if (levels.includes('medium')) return 'medium';
  if (levels.includes('low')) return 'low';
  return null;
}

function getMaxOpportunityBucket(interactions: ProductInteraction[]): OpportunityPotential | null {
  const ranking = ['under_10k', '10k_to_50k', '50k_to_100k', 'over_100k'];
  let maxIndex = -1;
  let maxBucket: string | null = null;

  for (const interaction of interactions) {
    if (interaction.opportunityPotential) {
      const index = ranking.indexOf(interaction.opportunityPotential);
      if (index > maxIndex) {
        maxIndex = index;
        maxBucket = interaction.opportunityPotential;
      }
    }
  }

  return maxBucket as OpportunityPotential | null;
}

function formatOpportunityBucket(bucket: string): string {
  const labels: Record<string, string> = {
    under_10k: '<$10k',
    '10k_to_50k': '$10k-$50k',
    '50k_to_100k': '$50k-$100k',
    over_100k: '$100k+',
  };
  return labels[bucket] || bucket;
}

function formatDealRange(range: string): string {
  const labels: Record<string, string> = {
    under_25k: '<$25k',
    '25k_to_100k': '$25k-$100k',
    over_100k: '$100k+',
  };
  return labels[range] || range;
}

function formatStation(station: string): string {
  const labels: Record<string, string> = {
    main_demo_station: 'Main Demo Station',
    booth: 'Booth',
    vip_lounge: 'VIP Lounge',
    breakout_room: 'Breakout Room',
    other: 'a demo station',
  };
  return labels[station] || station;
}

function formatContraType(type: string): string {
  const labels: Record<string, string> = {
    not_a_fit: 'Not a fit',
    too_early: 'Too early',
    other: 'Other',
  };
  return labels[type] || type;
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

import { pgTable, varchar, text, boolean, timestamp, jsonb, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Organizations — root entity. Intel, Cisco, etc.
// ---------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  industry: varchar("industry", { length: 100 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  primaryContact: varchar("primary_contact", { length: 255 }),
  primaryEmail: varchar("primary_email", { length: 500 }),
  contractStart: timestamp("contract_start"),
  contractEnd: timestamp("contract_end"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug),
}));

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// ---------------------------------------------------------------------------
// Platform Connections — under org, transactional not persistent
// ---------------------------------------------------------------------------
export const platformConnections = pgTable("platform_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  adapter: varchar("adapter", { length: 50 }).notNull(),   // rainfocus | cvent
  apiUrl: varchar("api_url", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  profileId: varchar("profile_id", { length: 255 }),
  configJson: jsonb("config_json").$type<Record<string, string>>(),
  // Lifecycle — connect to sync, then disconnect
  isActive: boolean("is_active").default(false),           // false = disconnected
  syncStatus: varchar("sync_status", { length: 50 }).default("idle"), // idle | syncing | error
  lastFullSyncAt: timestamp("last_full_sync_at"),
  lastIncrementalAt: timestamp("last_incremental_at"),
  lastSyncCursor: varchar("last_sync_cursor", { length: 255 }), // platform cursor for incremental
  lastSyncCount: integer("last_sync_count"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("platform_connections_org_idx").on(table.orgId),
}));

export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type PlatformConnection = typeof platformConnections.$inferSelect;

// ---------------------------------------------------------------------------
// Events — mirror from platform, under org via connection
// ---------------------------------------------------------------------------
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id).notNull(),
  connectionId: varchar("connection_id").references(() => platformConnections.id).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 255 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  timezone: varchar("timezone", { length: 100 }),
  venue: varchar("venue", { length: 500 }),
  metaJson: jsonb("meta_json").$type<Record<string, unknown>>(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("events_org_idx").on(table.orgId),
  connectionExternalIdx: uniqueIndex("events_connection_external_idx").on(table.connectionId, table.externalId),
}));

export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// ---------------------------------------------------------------------------
// Org Attendees — canonical PII store, one per person per org
// Isolated by org_id. PII never leaks across orgs.
// ---------------------------------------------------------------------------
export const INTENT_STATUSES = ["none", "engaged", "high_intent", "hot_lead"] as const;
export type IntentStatus = typeof INTENT_STATUSES[number];

export interface IntentSource {
  type: "product_interaction" | "meeting" | "session_checkin";
  id: string;
  signal: string;
  tier: 1 | 2;
  points?: number;
  eventId?: string;
  eventName?: string;
  createdAt: string;
}

export const orgAttendees = pgTable("org_attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id).notNull(),
  // Canonical identity
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 500 }).notNull(),
  company: varchar("company", { length: 500 }),
  jobTitle: varchar("job_title", { length: 500 }),
  phone: varchar("phone", { length: 100 }),
  // Lifetime cross-event intent scoring
  lifetimeIntentStatus: varchar("lifetime_intent_status", { length: 50 }).default("none"),
  lifetimeMomentumScore: integer("lifetime_momentum_score").default(0),
  lifetimeSalesReady: boolean("lifetime_sales_ready").default(false),
  lifetimeIntentSources: jsonb("lifetime_intent_sources").$type<IntentSource[]>().default([]),
  lifetimeIntentNarrative: text("lifetime_intent_narrative"),
  lastScoredAt: timestamp("last_scored_at"),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at"),
  metaJson: jsonb("meta_json").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgEmailIdx: uniqueIndex("org_attendees_org_email_idx").on(table.orgId, table.email),
  orgIdx: index("org_attendees_org_idx").on(table.orgId),
  lifetimeIntentIdx: index("org_attendees_lifetime_intent_idx").on(table.lifetimeIntentStatus),
}));

export const insertOrgAttendeeSchema = createInsertSchema(orgAttendees).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrgAttendee = z.infer<typeof insertOrgAttendeeSchema>;
export type OrgAttendee = typeof orgAttendees.$inferSelect;

// ---------------------------------------------------------------------------
// Event Attendees — event-specific participation record
// Joins org_attendee to an event. No PII here.
// ---------------------------------------------------------------------------
export const eventAttendees = pgTable("event_attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  orgAttendeeId: varchar("org_attendee_id").references(() => orgAttendees.id).notNull(),
  externalId: varchar("external_id", { length: 255 }),      // platform ID (Rainfocus attendeeId)
  badgeCode: varchar("badge_code", { length: 100 }),         // regcode from Rainfocus
  registrationType: varchar("registration_type", { length: 255 }),
  registrationStatus: varchar("registration_status", { length: 100 }),
  checkedIn: boolean("checked_in").default(false),
  checkInTime: timestamp("check_in_time"),
  // Per-event intent scoring (isolated — recompute doesn't bleed across events)
  eventIntentStatus: varchar("event_intent_status", { length: 50 }).default("none"),
  eventMomentumScore: integer("event_momentum_score").default(0),
  eventSalesReady: boolean("event_sales_ready").default(false),
  eventIntentSources: jsonb("event_intent_sources").$type<IntentSource[]>().default([]),
  eventIntentNarrative: text("event_intent_narrative"),
  eventLastScoredAt: timestamp("event_last_scored_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventOrgAttendeeIdx: uniqueIndex("event_attendees_event_org_attendee_idx").on(table.eventId, table.orgAttendeeId),
  eventIdx: index("event_attendees_event_idx").on(table.eventId),
  badgeIdx: index("event_attendees_badge_idx").on(table.badgeCode),
  eventIntentIdx: index("event_attendees_event_intent_idx").on(table.eventIntentStatus),
  externalIdx: index("event_attendees_external_idx").on(table.externalId),
}));

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;

// ---------------------------------------------------------------------------
// Sessions Mirror
// ---------------------------------------------------------------------------
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  room: varchar("room", { length: 255 }),
  sessionType: varchar("session_type", { length: 255 }),
  capacity: integer("capacity"),
  metaJson: jsonb("meta_json").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: index("sessions_event_idx").on(table.eventId),
}));

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// ---------------------------------------------------------------------------
// Session Check-Ins — references event_attendees (event-scoped, no PII)
// ---------------------------------------------------------------------------
export const sessionCheckIns = pgTable("session_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  eventAttendeeId: varchar("event_attendee_id").references(() => eventAttendees.id).notNull(),
  checkInMethod: varchar("check_in_method", { length: 50 }),
  sourceCode: varchar("source_code", { length: 100 }),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
}, (table) => ({
  sessionAttendeeIdx: uniqueIndex("session_check_ins_session_attendee_idx").on(table.sessionId, table.eventAttendeeId),
  eventIdx: index("session_check_ins_event_idx").on(table.eventId),
}));

export const insertSessionCheckInSchema = createInsertSchema(sessionCheckIns).omit({ id: true, checkedInAt: true });
export type InsertSessionCheckIn = z.infer<typeof insertSessionCheckInSchema>;
export type SessionCheckIn = typeof sessionCheckIns.$inferSelect;

// ---------------------------------------------------------------------------
// Engagement Moments
// ---------------------------------------------------------------------------
export const MOMENT_TYPES = ["poll_single", "poll_multi", "rating", "open_text", "qa", "pulse", "cta"] as const;
export type MomentType = typeof MOMENT_TYPES[number];

export const moments = pgTable("moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => sessions.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  prompt: text("prompt"),
  optionsJson: jsonb("options_json"),
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  showResults: boolean("show_results").default(false),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: index("moments_event_idx").on(table.eventId),
}));

export const insertMomentSchema = createInsertSchema(moments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof moments.$inferSelect;

// ---------------------------------------------------------------------------
// Moment Responses — references event_attendees
// ---------------------------------------------------------------------------
export const momentResponses = pgTable("moment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  momentId: varchar("moment_id").references(() => moments.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  eventAttendeeId: varchar("event_attendee_id").references(() => eventAttendees.id),
  payloadJson: jsonb("payload_json").notNull(),
  respondedAt: timestamp("responded_at").defaultNow(),
}, (table) => ({
  momentIdx: index("moment_responses_moment_idx").on(table.momentId),
}));

export const insertMomentResponseSchema = createInsertSchema(momentResponses).omit({ id: true, respondedAt: true });
export type InsertMomentResponse = z.infer<typeof insertMomentResponseSchema>;
export type MomentResponse = typeof momentResponses.$inferSelect;

// ---------------------------------------------------------------------------
// Demo Stations
// ---------------------------------------------------------------------------
export const demoStations = pgTable("demo_stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  stationName: varchar("station_name", { length: 255 }).notNull(),
  stationLocation: varchar("station_location", { length: 255 }).notNull(),
  stationPresenter: varchar("station_presenter", { length: 255 }),
  productFocus: text("product_focus").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: index("demo_stations_event_idx").on(table.eventId),
}));

export const insertDemoStationSchema = createInsertSchema(demoStations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDemoStation = z.infer<typeof insertDemoStationSchema>;
export type DemoStation = typeof demoStations.$inferSelect;

// ---------------------------------------------------------------------------
// Product Interactions — references event_attendees (event-scoped, no raw PII)
// ---------------------------------------------------------------------------
export const INTERACTION_TYPES = [
  "product_demo", "technical_deep_dive", "pricing_packaging",
  "integration_security", "executive_conversation", "product_discussion",
  "use_case_exploration", "support_inquiry", "partnership", "other",
] as const;

export const OUTCOME_TYPES = [
  "requested_follow_up", "asked_for_pricing", "wants_trial_pilot",
  "intro_to_stakeholder", "not_a_fit", "too_early", "other",
] as const;

export const NEXT_STEP_TYPES = [
  "schedule_call", "schedule_meeting", "send_info", "send_proposal",
  "demo_scheduled", "trial_setup", "internal_review", "none",
] as const;

export const OPPORTUNITY_POTENTIAL_TYPES = ["under_10k", "10k_to_50k", "50k_to_100k", "over_100k"] as const;
export const INTENT_LEVELS = ["low", "medium", "high"] as const;

export const INTERACTION_TAGS = [
  "icp_fit", "competitor_mentioned", "security_review", "budget_confirmed",
  "buying_committee", "urgent_timeline", "partner_motion",
  "decision_maker", "influencer", "champion", "technical_buyer", "executive",
] as const;

export const productInteractions = pgTable("product_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  eventAttendeeId: varchar("event_attendee_id").references(() => eventAttendees.id),
  // Unmatched captures (badge not scanned yet)
  unmatchedFirstName: varchar("unmatched_first_name", { length: 255 }),
  unmatchedLastName: varchar("unmatched_last_name", { length: 255 }),
  unmatchedEmail: varchar("unmatched_email", { length: 500 }),
  unmatchedCompany: varchar("unmatched_company", { length: 500 }),
  unmatchedJobTitle: varchar("unmatched_job_title", { length: 500 }),
  captureMethod: varchar("capture_method", { length: 50 }),
  sourceCode: varchar("source_code", { length: 100 }),
  interactionType: varchar("interaction_type", { length: 100 }).notNull(),
  intentLevel: varchar("intent_level", { length: 20 }).notNull(),
  outcome: varchar("outcome", { length: 100 }).notNull(),
  opportunityPotential: varchar("opportunity_potential", { length: 50 }),
  nextStep: varchar("next_step", { length: 100 }),
  station: varchar("station", { length: 255 }),
  tags: text("tags").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: index("product_interactions_event_idx").on(table.eventId),
  eventAttendeeIdx: index("product_interactions_event_attendee_idx").on(table.eventAttendeeId),
}));

export const insertProductInteractionSchema = createInsertSchema(productInteractions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductInteraction = z.infer<typeof insertProductInteractionSchema>;
export type ProductInteraction = typeof productInteractions.$inferSelect;

// ---------------------------------------------------------------------------
// Meetings — references event_attendees
// ---------------------------------------------------------------------------
export const MEETING_INTENT_TYPES = [
  "exploring_solution", "evaluating_fit", "existing_customer",
  "partner_discussion", "executive_introduction", "networking",
] as const;

export const MEETING_OUTCOME_TYPES = [
  "no_fit", "early_interest", "active_opportunity", "follow_up_scheduled", "deal_in_progress",
] as const;

export const DEAL_RANGE_TYPES = ["under_25k", "25k_to_100k", "over_100k"] as const;
export const TIMELINE_TYPES = ["now", "this_quarter", "later"] as const;
export const OUTCOME_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  eventAttendeeId: varchar("event_attendee_id").references(() => eventAttendees.id).notNull(),
  hostName: varchar("host_name", { length: 255 }),
  hostEmail: varchar("host_email", { length: 500 }),
  intentType: varchar("intent_type", { length: 100 }),
  intentStrength: varchar("intent_strength", { length: 20 }),
  status: varchar("status", { length: 50 }).default("pending"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  room: varchar("room", { length: 255 }),
  message: text("message"),
  outcomeType: varchar("outcome_type", { length: 100 }),
  outcomeConfidence: varchar("outcome_confidence", { length: 20 }),
  dealRange: varchar("deal_range", { length: 50 }),
  timeline: varchar("timeline", { length: 50 }),
  outcomeNotes: text("outcome_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: index("meetings_event_idx").on(table.eventId),
  eventAttendeeIdx: index("meetings_event_attendee_idx").on(table.eventAttendeeId),
}));

export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// ---------------------------------------------------------------------------
// Intent Recompute History — dual scope (event + org lifetime)
// ---------------------------------------------------------------------------
export const intentRecomputeHistory = pgTable("intent_recompute_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id),        // null = org-level recompute
  orgId: varchar("org_id").references(() => organizations.id).notNull(),
  scope: varchar("scope", { length: 20 }).default("event"),        // event | lifetime
  recomputedAt: timestamp("recomputed_at").defaultNow(),
  beforeHotLeads: integer("before_hot_leads").default(0),
  beforeHighIntent: integer("before_high_intent").default(0),
  beforeEngaged: integer("before_engaged").default(0),
  afterHotLeads: integer("after_hot_leads").default(0),
  afterHighIntent: integer("after_high_intent").default(0),
  afterEngaged: integer("after_engaged").default(0),
  deltaHotLeads: integer("delta_hot_leads").default(0),
  deltaHighIntent: integer("delta_high_intent").default(0),
  deltaEngaged: integer("delta_engaged").default(0),
  totalAttendees: integer("total_attendees").default(0),
  totalPromoted: integer("total_promoted").default(0),
  triggeredBy: varchar("triggered_by", { length: 255 }),
  notes: text("notes"),
}, (table) => ({
  eventIdx: index("intent_recompute_history_event_idx").on(table.eventId),
  orgIdx: index("intent_recompute_history_org_idx").on(table.orgId),
  recomputedAtIdx: index("intent_recompute_history_time_idx").on(table.recomputedAt),
}));

export const insertIntentRecomputeHistorySchema = createInsertSchema(intentRecomputeHistory).omit({ id: true, recomputedAt: true });
export type InsertIntentRecomputeHistory = z.infer<typeof insertIntentRecomputeHistorySchema>;
export type IntentRecomputeHistory = typeof intentRecomputeHistory.$inferSelect;

// ---------------------------------------------------------------------------
// App Users — platform users, scoped to org
// ---------------------------------------------------------------------------
export const USER_ROLES = ["sandbox_admin", "admin", "staff", "sponsor_admin"] as const;
export type UserRole = typeof USER_ROLES[number];

export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id),    // null = Sandbox admin
  neonUserId: varchar("neon_user_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 500 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 50 }).default("staff"),
  eventId: varchar("event_id").references(() => events.id),
  stationId: varchar("station_id").references(() => demoStations.id),
  sponsorCompany: varchar("sponsor_company", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  neonUserIdx: uniqueIndex("app_users_neon_user_idx").on(table.neonUserId),
  emailIdx: index("app_users_email_idx").on(table.email),
  orgIdx: index("app_users_org_idx").on(table.orgId),
  roleIdx: index("app_users_role_idx").on(table.role),
}));

export const insertAppUserSchema = createInsertSchema(appUsers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type AppUser = typeof appUsers.$inferSelect;

// ---------------------------------------------------------------------------
// User Tokens — token-based auth for sponsor staff + attendee identity
// ---------------------------------------------------------------------------
export const TOKEN_TYPES = ["sponsor_staff", "attendee_identity", "meeting_invite"] as const;
export type TokenType = typeof TOKEN_TYPES[number];

export const userTokens = pgTable("user_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 255 }).unique().notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  appUserId: varchar("app_user_id").references(() => appUsers.id),
  eventAttendeeId: varchar("event_attendee_id").references(() => eventAttendees.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  scopedData: jsonb("scoped_data").$type<Record<string, unknown>>(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("user_tokens_token_idx").on(table.token),
  typeIdx: index("user_tokens_type_idx").on(table.type),
  eventIdx: index("user_tokens_event_idx").on(table.eventId),
}));

export const insertUserTokenSchema = createInsertSchema(userTokens).omit({ id: true, createdAt: true });
export type InsertUserToken = z.infer<typeof insertUserTokenSchema>;
export type UserToken = typeof userTokens.$inferSelect;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const organizationsRelations = relations(organizations, ({ many }) => ({
  connections: many(platformConnections),
  events: many(events),
  orgAttendees: many(orgAttendees),
  appUsers: many(appUsers),
}));

export const platformConnectionsRelations = relations(platformConnections, ({ one, many }) => ({
  org: one(organizations, { fields: [platformConnections.orgId], references: [organizations.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  org: one(organizations, { fields: [events.orgId], references: [organizations.id] }),
  connection: one(platformConnections, { fields: [events.connectionId], references: [platformConnections.id] }),
  eventAttendees: many(eventAttendees),
  sessions: many(sessions),
  moments: many(moments),
  demoStations: many(demoStations),
  productInteractions: many(productInteractions),
  meetings: many(meetings),
}));

export const orgAttendeesRelations = relations(orgAttendees, ({ one, many }) => ({
  org: one(organizations, { fields: [orgAttendees.orgId], references: [organizations.id] }),
  eventAttendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one, many }) => ({
  event: one(events, { fields: [eventAttendees.eventId], references: [events.id] }),
  orgAttendee: one(orgAttendees, { fields: [eventAttendees.orgAttendeeId], references: [orgAttendees.id] }),
  sessionCheckIns: many(sessionCheckIns),
  productInteractions: many(productInteractions),
  meetings: many(meetings),
  momentResponses: many(momentResponses),
}));

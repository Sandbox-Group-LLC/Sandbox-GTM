import { pgTable, varchar, text, boolean, timestamp, jsonb, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Platform Connections — config for external registration platform integration
// ---------------------------------------------------------------------------
export const platformConnections = pgTable("platform_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),               // e.g. "Rainfocus - Cisco Live 2025"
  adapter: varchar("adapter", { length: 50 }).notNull(),           // rainfocus | cvent | eventbrite
  apiUrl: varchar("api_url", { length: 500 }),
  apiKey: varchar("api_key", { length: 500 }),
  profileId: varchar("profile_id", { length: 255 }),               // Rainfocus profile/show ID
  configJson: jsonb("config_json").$type<Record<string, string>>(), // adapter-specific extras
  isActive: boolean("is_active").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformConnection = z.infer<typeof insertPlatformConnectionSchema>;
export type PlatformConnection = typeof platformConnections.$inferSelect;

// ---------------------------------------------------------------------------
// Events Mirror — local representation of events pulled from external platform
// ---------------------------------------------------------------------------
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => platformConnections.id).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),   // ID from source platform
  name: varchar("name", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 255 }),                           // for public moment URLs
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  timezone: varchar("timezone", { length: 100 }),
  venue: varchar("venue", { length: 500 }),
  metaJson: jsonb("meta_json").$type<Record<string, unknown>>(),    // raw platform data
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("events_connection_external_idx").on(table.connectionId, table.externalId),
  index("events_connection_idx").on(table.connectionId),
]);

export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// ---------------------------------------------------------------------------
// Attendees Mirror — local cache of attendees pulled from external platform
// ---------------------------------------------------------------------------
export const attendees = pgTable("attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),   // ID from source platform
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 500 }).notNull(),
  company: varchar("company", { length: 500 }),
  jobTitle: varchar("job_title", { length: 500 }),
  phone: varchar("phone", { length: 100 }),
  badgeCode: varchar("badge_code", { length: 100 }),                // QR/barcode on badge
  registrationType: varchar("registration_type", { length: 255 }), // attendee type from platform
  registrationStatus: varchar("registration_status", { length: 100 }), // confirmed, cancelled, etc.
  checkedIn: boolean("checked_in").default(false),
  checkInTime: timestamp("check_in_time"),
  metaJson: jsonb("meta_json").$type<Record<string, unknown>>(),    // raw platform fields
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("attendees_event_external_idx").on(table.eventId, table.externalId),
  index("attendees_event_idx").on(table.eventId),
  index("attendees_badge_idx").on(table.badgeCode),
  index("attendees_email_idx").on(table.email),
]);

export const insertAttendeeSchema = createInsertSchema(attendees).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendees.$inferSelect;

// ---------------------------------------------------------------------------
// Sessions Mirror — sessions/agenda items from external platform
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
}, (table) => [
  index("sessions_event_idx").on(table.eventId),
]);

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// ---------------------------------------------------------------------------
// Session Check-Ins
// ---------------------------------------------------------------------------
export const sessionCheckIns = pgTable("session_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  checkInMethod: varchar("check_in_method", { length: 50 }),        // qr_scan | manual | lookup
  sourceCode: varchar("source_code", { length: 100 }),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
}, (table) => [
  uniqueIndex("session_check_ins_session_attendee_idx").on(table.sessionId, table.attendeeId),
]);

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
  optionsJson: jsonb("options_json"),                                // poll options, rating config, cta config
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft | live | locked | ended
  showResults: boolean("show_results").default(false),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("moments_event_idx").on(table.eventId),
]);

export const insertMomentSchema = createInsertSchema(moments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof moments.$inferSelect;

// ---------------------------------------------------------------------------
// Moment Responses — anonymous or attendee-linked
// ---------------------------------------------------------------------------
export const momentResponses = pgTable("moment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  momentId: varchar("moment_id").references(() => moments.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id), // nullable = anonymous
  payloadJson: jsonb("payload_json").notNull(),                      // selected option, text, rating value, etc.
  respondedAt: timestamp("responded_at").defaultNow(),
}, (table) => [
  index("moment_responses_moment_idx").on(table.momentId),
]);

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
}, (table) => [
  index("demo_stations_event_idx").on(table.eventId),
]);

export const insertDemoStationSchema = createInsertSchema(demoStations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDemoStation = z.infer<typeof insertDemoStationSchema>;
export type DemoStation = typeof demoStations.$inferSelect;

// ---------------------------------------------------------------------------
// Product Interactions — lead capture at demo stations / booths
// ---------------------------------------------------------------------------
export const INTERACTION_TYPES = [
  "demo", "product_discussion", "pricing_request", "technical_deep_dive",
  "use_case_exploration", "integration_question", "support_inquiry", "partnership", "other",
] as const;

export const OUTCOME_TYPES = [
  "requested_follow_up", "asked_for_pricing", "wants_trial_pilot",
  "intro_to_stakeholder", "not_a_fit", "too_early", "other",
] as const;

export const NEXT_STEP_TYPES = [
  "schedule_call", "schedule_meeting", "send_info", "send_proposal",
  "demo_scheduled", "trial_setup", "internal_review", "none",
] as const;

export const OPPORTUNITY_POTENTIAL_TYPES = [
  "under_10k", "10k_to_50k", "50k_to_100k", "over_100k",
] as const;

export const INTENT_LEVELS = ["low", "medium", "high"] as const;

export const INTERACTION_TAGS = [
  "competitor_mention", "budget_approved", "decision_maker",
  "influencer", "champion", "technical_buyer", "executive",
] as const;

export const productInteractions = pgTable("product_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id),  // nullable = unmatched
  // Unmatched contact info (when not in attendee roster)
  unmatchedFirstName: varchar("unmatched_first_name", { length: 255 }),
  unmatchedLastName: varchar("unmatched_last_name", { length: 255 }),
  unmatchedEmail: varchar("unmatched_email", { length: 500 }),
  unmatchedCompany: varchar("unmatched_company", { length: 500 }),
  unmatchedJobTitle: varchar("unmatched_job_title", { length: 500 }),
  // Interaction details
  captureMethod: varchar("capture_method", { length: 50 }),           // qr_scan | manual | lookup
  sourceCode: varchar("source_code", { length: 100 }),
  interactionType: varchar("interaction_type", { length: 100 }).notNull(),
  intentLevel: varchar("intent_level", { length: 20 }).notNull(),     // low | medium | high
  outcome: varchar("outcome", { length: 100 }).notNull(),
  opportunityPotential: varchar("opportunity_potential", { length: 50 }),
  nextStep: varchar("next_step", { length: 100 }),
  station: varchar("station", { length: 255 }),
  tags: text("tags").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("product_interactions_event_idx").on(table.eventId),
  index("product_interactions_attendee_idx").on(table.attendeeId),
]);

export const insertProductInteractionSchema = createInsertSchema(productInteractions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductInteraction = z.infer<typeof insertProductInteractionSchema>;
export type ProductInteraction = typeof productInteractions.$inferSelect;

// ---------------------------------------------------------------------------
// Meetings
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
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  hostName: varchar("host_name", { length: 255 }),                   // team member scheduling the meeting
  hostEmail: varchar("host_email", { length: 500 }),
  intentType: varchar("intent_type", { length: 100 }),
  intentStrength: varchar("intent_strength", { length: 20 }),        // low | medium | high
  status: varchar("status", { length: 50 }).default("pending"),      // pending | accepted | declined | completed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  room: varchar("room", { length: 255 }),
  message: text("message"),
  // Outcome fields (captured post-meeting)
  outcomeType: varchar("outcome_type", { length: 100 }),
  outcomeConfidence: varchar("outcome_confidence", { length: 20 }),
  dealRange: varchar("deal_range", { length: 50 }),
  timeline: varchar("timeline", { length: 50 }),
  outcomeNotes: text("outcome_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("meetings_event_idx").on(table.eventId),
  index("meetings_attendee_idx").on(table.attendeeId),
]);

export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const eventsRelations = relations(events, ({ one, many }) => ({
  connection: one(platformConnections, { fields: [events.connectionId], references: [platformConnections.id] }),
  attendees: many(attendees),
  sessions: many(sessions),
  moments: many(moments),
  demoStations: many(demoStations),
  productInteractions: many(productInteractions),
  meetings: many(meetings),
}));

export const attendeesRelations = relations(attendees, ({ one, many }) => ({
  event: one(events, { fields: [attendees.eventId], references: [events.id] }),
  sessionCheckIns: many(sessionCheckIns),
  productInteractions: many(productInteractions),
  meetings: many(meetings),
  momentResponses: many(momentResponses),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  event: one(events, { fields: [sessions.eventId], references: [events.id] }),
  checkIns: many(sessionCheckIns),
  moments: many(moments),
}));

export const momentsRelations = relations(moments, ({ one, many }) => ({
  event: one(events, { fields: [moments.eventId], references: [events.id] }),
  session: one(sessions, { fields: [moments.sessionId], references: [sessions.id] }),
  responses: many(momentResponses),
}));

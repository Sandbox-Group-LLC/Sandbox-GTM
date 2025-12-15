import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  date,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - MANDATORY for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - MANDATORY for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  // Organization profile
  organizationType: varchar("organization_type", { length: 50 }),
  expectedEventsPerYear: varchar("expected_events_per_year", { length: 20 }),
  typicalEventSize: varchar("typical_event_size", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  country: varchar("country", { length: 100 }),
  timezone: varchar("timezone", { length: 100 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  // Onboarding tracking
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: integer("onboarding_step").default(1),
  // Payment settings
  stripePublishableKey: varchar("stripe_publishable_key", { length: 255 }),
  stripeSecretKey: varchar("stripe_secret_key", { length: 255 }),
  paymentEnabled: boolean("payment_enabled").default(false),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization Members table
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  location: varchar("location", { length: 255 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  status: varchar("status", { length: 50 }).default("draft"),
  isPublic: boolean("is_public").default(false),
  registrationOpen: boolean("registration_open").default(false),
  maxAttendees: integer("max_attendees"),
  publicSlug: varchar("public_slug", { length: 100 }).unique(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendee Types table
export const attendeeTypes = pgTable("attendee_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  capacity: integer("capacity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Packages table - global packages for registration (templates)
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Packages junction table - stores per-event package overrides
export const eventPackages = pgTable("event_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  packageId: varchar("package_id").references(() => packages.id).notNull(),
  priceOverride: decimal("price_override", { precision: 10, scale: 2 }),
  featuresOverride: text("features_override").array(),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_event_package_unique").on(table.eventId, table.packageId),
]);

// Invite Codes table
export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  quantity: integer("quantity"),
  usedCount: integer("used_count").default(0),
  attendeeTypeId: varchar("attendee_type_id").references(() => attendeeTypes.id),
  packageId: varchar("package_id").references(() => packages.id),
  forcePackage: boolean("force_package").default(false),
  discountType: varchar("discount_type", { length: 20 }),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Pages table - stores customizable page configurations for site builder
export const eventPages = pgTable("event_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  pageType: varchar("page_type", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 100 }),
  isPublished: boolean("is_published").default(false),
  theme: jsonb("theme").$type<{
    // Typography
    headingFont?: string;
    bodyFont?: string;
    baseFontSize?: string;
    // Colors
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    textSecondaryColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    cardBackground?: string;
    borderColor?: string;
    // Layout
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
    buttonStyle?: 'filled' | 'outline';
    containerWidth?: 'narrow' | 'standard' | 'wide' | 'full';
    sectionSpacing?: 'compact' | 'normal' | 'relaxed';
    textDecoration?: 'none' | 'underline' | 'uppercase' | 'capitalize';
  }>(),
  seo: jsonb("seo").$type<{ title?: string; description?: string; ogImage?: string }>(),
  sections: jsonb("sections").$type<Array<{
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_event_page_unique").on(table.eventId, table.pageType),
]);

// Registration Configs table - stores registration flow configuration per event
export const registrationConfigs = pgTable("registration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull().unique(),
  steps: jsonb("steps").$type<Array<{
    id: number;
    title: string;
    enabled: boolean;
  }>>(),
  step1Config: jsonb("step1_config").$type<{
    collectFirstName?: boolean;
    collectLastName?: boolean;
    collectEmail?: boolean;
    collectPhone?: boolean;
    collectCompany?: boolean;
    collectJobTitle?: boolean;
    requirePassword?: boolean;
    allowGoogleAuth?: boolean;
  }>(),
  step2Config: jsonb("step2_config").$type<{
    rules?: Array<{
      id: string;
      field: string;
      operator: string;
      value: string;
    }>;
    ruleLogic?: 'all' | 'any';
  }>(),
  step3Config: jsonb("step3_config").$type<{
    enabledPackages?: string[];
    allowMultipleSelection?: boolean;
  }>(),
  step4Config: jsonb("step4_config").$type<{
    requirePayment?: boolean;
  }>(),
  step5Config: jsonb("step5_config").$type<{
    sendConfirmationEmail?: boolean;
    confirmationEmailTemplateId?: string;
    generateQRCode?: boolean;
    showCalendarAdd?: boolean;
    customMessage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom Fields table - organization-wide field definitions for attendees
export const customFields = pgTable("custom_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull(),
  required: boolean("required").default(false),
  options: text("options").array(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendees table
export const attendees = pgTable("attendees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeType: varchar("attendee_type", { length: 50 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  registrationStatus: varchar("registration_status", { length: 50 }).default("pending"),
  ticketType: varchar("ticket_type", { length: 100 }),
  notes: text("notes"),
  checkInCode: varchar("check_in_code", { length: 20 }).unique(),
  checkedIn: boolean("checked_in").default(false),
  checkInTime: timestamp("check_in_time"),
  inviteCodeId: varchar("invite_code_id").references(() => inviteCodes.id),
  packageId: varchar("package_id").references(() => packages.id),
  customData: jsonb("custom_data").$type<Record<string, string | boolean | string[]>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Speakers table
export const speakers = pgTable("speakers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  bio: text("bio"),
  photoUrl: varchar("photo_url", { length: 500 }),
  socialLinks: jsonb("social_links").$type<{ linkedin?: string; twitter?: string; website?: string }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table
export const eventSessions = pgTable("event_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sessionDate: date("session_date").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  room: varchar("room", { length: 100 }),
  capacity: integer("capacity"),
  track: varchar("track", { length: 100 }),
  sessionType: varchar("session_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session-Speaker junction table
export const sessionSpeakers = pgTable("session_speakers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => eventSessions.id).notNull(),
  speakerId: varchar("speaker_id").references(() => speakers.id).notNull(),
});

// Content catalog table
export const contentItems = pgTable("content_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget Categories - pre-defined categories per organization
export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  isDefault: boolean("is_default").default(false),
});

// Budget items table
export const budgetItems = pgTable("budget_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  categoryId: varchar("category_id").references(() => budgetCategories.id),
  description: varchar("description", { length: 255 }).notNull(),
  plannedAmount: decimal("planned_amount", { precision: 10, scale: 2 }).default("0"),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  estimateAmount: decimal("estimate_amount", { precision: 10, scale: 2 }).default("0"),
  forecastAmount: decimal("forecast_amount", { precision: 10, scale: 2 }).default("0"),
  onsiteAmount: decimal("onsite_amount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 50 }).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget Offsets - Revenue/Credits that reduce net budget
export const budgetOffsets = pgTable("budget_offsets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  estimateAmount: decimal("estimate_amount", { precision: 10, scale: 2 }).default("0"),
  forecastAmount: decimal("forecast_amount", { precision: 10, scale: 2 }).default("0"),
  onsiteAmount: decimal("onsite_amount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
});

// Event Budget Settings - Budget cap per event
export const eventBudgetSettings = pgTable("event_budget_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id).notNull().unique(),
  budgetCap: decimal("budget_cap", { precision: 10, scale: 2 }),
});

// Budget Payments - Invoice tracker
export const budgetPayments = pgTable("budget_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  budgetItemId: varchar("budget_item_id").references(() => budgetItems.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Timeline/Milestones table
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deliverables table
export const deliverables = pgTable("deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  milestoneId: varchar("milestone_id").references(() => milestones.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("todo"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email campaigns table
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  recipientType: varchar("recipient_type", { length: 50 }).default("all"),
  status: varchar("status", { length: 50 }).default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social media posts table
export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id),
  platform: varchar("platform", { length: 50 }).notNull(),
  content: text("content").notNull(),
  mediaUrl: varchar("media_url", { length: 500 }),
  scheduledAt: timestamp("scheduled_at"),
  status: varchar("status", { length: 50 }).default("draft"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id),
  name: varchar("name", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  headerImageUrl: text("header_image_url"),
  category: varchar("category", { length: 50 }).default("general"),
  isDefault: boolean("is_default").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content Assets table - for media library (images, files for email templates)
export const contentAssets = pgTable("content_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  objectPath: text("object_path").notNull(),
  publicUrl: text("public_url").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Social connections table
export const socialConnections = pgTable("social_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }),
  accountId: varchar("account_id", { length: 255 }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  events: many(events),
  attendees: many(attendees),
  speakers: many(speakers),
  sessions: many(eventSessions),
  attendeeTypes: many(attendeeTypes),
  packages: many(packages),
  contentItems: many(contentItems),
  budgetItems: many(budgetItems),
  milestones: many(milestones),
  deliverables: many(deliverables),
  emailCampaigns: many(emailCampaigns),
  socialPosts: many(socialPosts),
  emailTemplates: many(emailTemplates),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, { fields: [events.organizationId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [events.createdBy], references: [users.id] }),
  attendees: many(attendees),
  speakers: many(speakers),
  sessions: many(eventSessions),
  contentItems: many(contentItems),
  budgetItems: many(budgetItems),
  milestones: many(milestones),
  deliverables: many(deliverables),
  emailCampaigns: many(emailCampaigns),
  socialPosts: many(socialPosts),
}));

export const attendeesRelations = relations(attendees, ({ one }) => ({
  organization: one(organizations, { fields: [attendees.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [attendees.eventId], references: [events.id] }),
}));

export const speakersRelations = relations(speakers, ({ one, many }) => ({
  organization: one(organizations, { fields: [speakers.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [speakers.eventId], references: [events.id] }),
  sessionSpeakers: many(sessionSpeakers),
}));

export const eventSessionsRelations = relations(eventSessions, ({ one, many }) => ({
  organization: one(organizations, { fields: [eventSessions.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [eventSessions.eventId], references: [events.id] }),
  sessionSpeakers: many(sessionSpeakers),
}));

export const sessionSpeakersRelations = relations(sessionSpeakers, ({ one }) => ({
  session: one(eventSessions, { fields: [sessionSpeakers.sessionId], references: [eventSessions.id] }),
  speaker: one(speakers, { fields: [sessionSpeakers.speakerId], references: [speakers.id] }),
}));

export const contentItemsRelations = relations(contentItems, ({ one }) => ({
  organization: one(organizations, { fields: [contentItems.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [contentItems.eventId], references: [events.id] }),
}));

export const budgetCategoriesRelations = relations(budgetCategories, ({ one, many }) => ({
  organization: one(organizations, { fields: [budgetCategories.organizationId], references: [organizations.id] }),
  budgetItems: many(budgetItems),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  organization: one(organizations, { fields: [budgetItems.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [budgetItems.eventId], references: [events.id] }),
  category: one(budgetCategories, { fields: [budgetItems.categoryId], references: [budgetCategories.id] }),
}));

export const budgetOffsetsRelations = relations(budgetOffsets, ({ one }) => ({
  organization: one(organizations, { fields: [budgetOffsets.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [budgetOffsets.eventId], references: [events.id] }),
}));

export const eventBudgetSettingsRelations = relations(eventBudgetSettings, ({ one }) => ({
  event: one(events, { fields: [eventBudgetSettings.eventId], references: [events.id] }),
}));

export const budgetPaymentsRelations = relations(budgetPayments, ({ one }) => ({
  organization: one(organizations, { fields: [budgetPayments.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [budgetPayments.eventId], references: [events.id] }),
  budgetItem: one(budgetItems, { fields: [budgetPayments.budgetItemId], references: [budgetItems.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  organization: one(organizations, { fields: [milestones.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [milestones.eventId], references: [events.id] }),
  assignedToUser: one(users, { fields: [milestones.assignedTo], references: [users.id] }),
  deliverables: many(deliverables),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  organization: one(organizations, { fields: [deliverables.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [deliverables.eventId], references: [events.id] }),
  milestone: one(milestones, { fields: [deliverables.milestoneId], references: [milestones.id] }),
  assignedToUser: one(users, { fields: [deliverables.assignedTo], references: [users.id] }),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one }) => ({
  organization: one(organizations, { fields: [emailCampaigns.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [emailCampaigns.eventId], references: [events.id] }),
  createdByUser: one(users, { fields: [emailCampaigns.createdBy], references: [users.id] }),
}));

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
  organization: one(organizations, { fields: [socialPosts.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [socialPosts.eventId], references: [events.id] }),
  createdByUser: one(users, { fields: [socialPosts.createdBy], references: [users.id] }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [emailTemplates.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [emailTemplates.eventId], references: [events.id] }),
  createdByUser: one(users, { fields: [emailTemplates.createdBy], references: [users.id] }),
}));

export const socialConnectionsRelations = relations(socialConnections, ({ one }) => ({
  user: one(users, { fields: [socialConnections.userId], references: [users.id] }),
}));

export const attendeeTypesRelations = relations(attendeeTypes, ({ one }) => ({
  organization: one(organizations, { fields: [attendeeTypes.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [attendeeTypes.eventId], references: [events.id] }),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  organization: one(organizations, { fields: [packages.organizationId], references: [organizations.id] }),
  eventPackages: many(eventPackages),
}));

export const eventPackagesRelations = relations(eventPackages, ({ one }) => ({
  organization: one(organizations, { fields: [eventPackages.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [eventPackages.eventId], references: [events.id] }),
  package: one(packages, { fields: [eventPackages.packageId], references: [packages.id] }),
}));

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  organization: one(organizations, { fields: [inviteCodes.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [inviteCodes.eventId], references: [events.id] }),
  attendeeType: one(attendeeTypes, { fields: [inviteCodes.attendeeTypeId], references: [attendeeTypes.id] }),
}));

export const eventPagesRelations = relations(eventPages, ({ one }) => ({
  organization: one(organizations, { fields: [eventPages.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [eventPages.eventId], references: [events.id] }),
}));

export const registrationConfigsRelations = relations(registrationConfigs, ({ one }) => ({
  organization: one(organizations, { fields: [registrationConfigs.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [registrationConfigs.eventId], references: [events.id] }),
}));

export const contentAssetsRelations = relations(contentAssets, ({ one }) => ({
  organization: one(organizations, { fields: [contentAssets.organizationId], references: [organizations.id] }),
  uploadedByUser: one(users, { fields: [contentAssets.uploadedBy], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendeeSchema = createInsertSchema(attendees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSpeakerSchema = createInsertSchema(speakers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(eventSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSpeakerSchema = createInsertSchema(sessionSpeakers).omit({ id: true });
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({ id: true });
export const insertBudgetOffsetSchema = createInsertSchema(budgetOffsets).omit({ id: true });
export const insertEventBudgetSettingsSchema = createInsertSchema(eventBudgetSettings).omit({ id: true });
export const insertBudgetPaymentSchema = createInsertSchema(budgetPayments).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliverableSchema = createInsertSchema(deliverables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialConnectionSchema = createInsertSchema(socialConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendeeTypeSchema = createInsertSchema(attendeeTypes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackageSchema = createInsertSchema(packages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventPackageSchema = createInsertSchema(eventPackages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventPageSchema = createInsertSchema(eventPages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRegistrationConfigSchema = createInsertSchema(registrationConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentAssetSchema = createInsertSchema(contentAssets).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendees.$inferSelect;
export type InsertSpeaker = z.infer<typeof insertSpeakerSchema>;
export type Speaker = typeof speakers.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type EventSession = typeof eventSessions.$inferSelect;
export type InsertSessionSpeaker = z.infer<typeof insertSessionSpeakerSchema>;
export type SessionSpeaker = typeof sessionSpeakers.$inferSelect;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetOffset = z.infer<typeof insertBudgetOffsetSchema>;
export type BudgetOffset = typeof budgetOffsets.$inferSelect;
export type InsertEventBudgetSettings = z.infer<typeof insertEventBudgetSettingsSchema>;
export type EventBudgetSettings = typeof eventBudgetSettings.$inferSelect;
export type InsertBudgetPayment = z.infer<typeof insertBudgetPaymentSchema>;
export type BudgetPayment = typeof budgetPayments.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type Deliverable = typeof deliverables.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertSocialConnection = z.infer<typeof insertSocialConnectionSchema>;
export type SocialConnection = typeof socialConnections.$inferSelect;
export type InsertAttendeeType = z.infer<typeof insertAttendeeTypeSchema>;
export type AttendeeType = typeof attendeeTypes.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertEventPackage = z.infer<typeof insertEventPackageSchema>;
export type EventPackage = typeof eventPackages.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertEventPage = z.infer<typeof insertEventPageSchema>;
export type EventPage = typeof eventPages.$inferSelect;
export type EventPageTheme = NonNullable<EventPage['theme']>;
export type InsertRegistrationConfig = z.infer<typeof insertRegistrationConfigSchema>;
export type RegistrationConfig = typeof registrationConfigs.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;
export type InsertContentAsset = z.infer<typeof insertContentAssetSchema>;
export type ContentAsset = typeof contentAssets.$inferSelect;

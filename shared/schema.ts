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
  enableRevenueRoi: boolean("enable_revenue_roi").default(false),
  customDomain: varchar("custom_domain", { length: 500 }), // Custom domain for generating links (e.g., www.example.com)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feature permission keys for team access control
export const FEATURE_PERMISSIONS = [
  'programs',      // Program Setup, Content
  'performance',   // Analytics
  'goToMarket',    // Audience, Campaigns
  'engagement',    // Agenda
  'execution',     // Run of Show, Deliverables, Vendors, Budget
  'revenueRoi',    // Revenue & ROI (if enabled for org)
] as const;

export type FeaturePermission = typeof FEATURE_PERMISSIONS[number];

// Organization Members table
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 50 }).default("member"), // 'owner' or 'member'
  permissions: text("permissions").array(), // array of feature keys from FEATURE_PERMISSIONS
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team Invitations table - for pending invitations before user accepts
export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  permissions: text("permissions").array(),
  inviteCode: varchar("invite_code", { length: 64 }).unique().notNull(),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'expired', 'revoked'
  expiresAt: timestamp("expires_at"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id),
});

// Social Media Credentials table - stores encrypted OAuth credentials per organization
export const socialMediaCredentials = pgTable("social_media_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  isConfigured: boolean("is_configured").default(false),
  configuredAt: timestamp("configured_at"),
  configuredBy: varchar("configured_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_social_credential_unique").on(table.organizationId, table.provider),
]);

// Email Platform Connections table - stores connections to email marketing platforms (Mailchimp, HubSpot, etc.)
export const emailPlatformConnections = pgTable("email_platform_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'mailchimp', 'hubspot', 'constantcontact', etc.
  accountName: varchar("account_name", { length: 255 }),
  accountId: varchar("account_id", { length: 255 }),
  accessToken: text("access_token"), // encrypted
  refreshToken: text("refresh_token"), // encrypted
  apiKey: text("api_key"), // encrypted - for platforms that use API key auth
  serverPrefix: varchar("server_prefix", { length: 50 }), // e.g., 'us21' for Mailchimp
  tokenExpiresAt: timestamp("token_expires_at"),
  defaultAudienceId: varchar("default_audience_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active"), // 'active', 'disconnected', 'error'
  lastSyncedAt: timestamp("last_synced_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  connectedBy: varchar("connected_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_email_platform_connection_unique").on(table.organizationId, table.provider),
]);

// Email Platform Audiences table - stores audience/list info from connected platforms
export const emailPlatformAudiences = pgTable("email_platform_audiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => emailPlatformConnections.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(), // ID from the platform
  name: varchar("name", { length: 255 }).notNull(),
  memberCount: integer("member_count").default(0),
  listType: varchar("list_type", { length: 50 }), // 'list', 'segment', 'tag', etc.
  isPrimary: boolean("is_primary").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_email_platform_audience_unique").on(table.connectionId, table.externalId),
]);

// Email Sync Jobs table - tracks sync operations between CMS and email platforms
export const emailSyncJobs = pgTable("email_sync_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => emailPlatformConnections.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id),
  audienceId: varchar("audience_id").references(() => emailPlatformAudiences.id),
  jobType: varchar("job_type", { length: 50 }).notNull(), // 'push_attendees', 'import_contacts', 'two_way_sync'
  direction: varchar("direction", { length: 20 }).default("push"), // 'push', 'pull', 'both'
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'running', 'completed', 'failed'
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  errorMessage: text("error_message"),
  stats: jsonb("stats").$type<{
    created?: number;
    updated?: number;
    deleted?: number;
    errors?: Array<{ email?: string; error: string }>;
  }>(),
  initiatedBy: varchar("initiated_by").references(() => users.id),
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
  cfpSubmissionId: integer("cfp_submission_id"),
  sponsorId: varchar("sponsor_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activation Links table - trackable campaign URLs with UTM parameters
export const activationLinks = pgTable("activation_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Destination settings
  destinationType: varchar("destination_type", { length: 50 }).notNull().default("registration"), // 'registration', 'landing', 'portal'
  baseUrl: text("base_url"),
  // UTM parameters
  utmSource: varchar("utm_source", { length: 255 }).notNull(),
  utmMedium: varchar("utm_medium", { length: 255 }).notNull(),
  utmCampaign: varchar("utm_campaign", { length: 255 }).notNull(),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  // Additional tracking params
  customParams: jsonb("custom_params").$type<Record<string, string>>(),
  // Activation Key integration
  inviteCodeId: varchar("invite_code_id").references(() => inviteCodes.id),
  // Status and metadata
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'paused', 'archived'
  shortCode: varchar("short_code", { length: 50 }).unique(),
  // Analytics tracking
  clickCount: integer("click_count").default(0),
  conversionCount: integer("conversion_count").default(0),
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_activation_link_org").on(table.organizationId),
  index("IDX_activation_link_event").on(table.eventId),
  index("IDX_activation_link_short_code").on(table.shortCode),
]);

// Activation Link Clicks table - track individual click events
export const activationLinkClicks = pgTable("activation_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activationLinkId: varchar("activation_link_id").references(() => activationLinks.id).notNull(),
  // Visitor identification (hashed for privacy)
  visitorHash: varchar("visitor_hash", { length: 64 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  // Query params snapshot
  queryParams: jsonb("query_params").$type<Record<string, string>>(),
  // Conversion tracking
  convertedToAttendeeId: varchar("converted_to_attendee_id").references(() => attendees.id),
  convertedAt: timestamp("converted_at"),
  // Timing
  clickedAt: timestamp("clicked_at").defaultNow(),
}, (table) => [
  index("IDX_activation_link_click_link").on(table.activationLinkId),
  index("IDX_activation_link_click_time").on(table.clickedAt),
]);

// Page Views table - track real-time visitor activity on public pages
export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  pageType: varchar("page_type", { length: 50 }).notNull(), // 'landing', 'registration', 'portal', 'agenda'
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => [
  index("IDX_page_view_org").on(table.organizationId),
  index("IDX_page_view_event").on(table.eventId),
  index("IDX_page_view_time").on(table.viewedAt),
]);

export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, viewedAt: true });
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;

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
    buttonBorderColor?: string;
    cardBackground?: string;
    borderColor?: string;
    // Layout
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
    buttonStyle?: 'filled' | 'outline';
    containerWidth?: 'narrow' | 'standard' | 'wide' | 'full';
    sectionSpacing?: 'compact' | 'normal' | 'relaxed';
    pagePadding?: 'standard' | 'none';
    textDecoration?: 'none' | 'underline' | 'uppercase' | 'capitalize';
    customCss?: string;
  }>(),
  seo: jsonb("seo").$type<{ title?: string; description?: string; ogImage?: string }>(),
  sections: jsonb("sections").$type<Array<{
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
    styles?: {
      backgroundColor?: string;
      textColor?: string;
      paddingTop?: 'none' | 'small' | 'medium' | 'large';
      paddingBottom?: 'none' | 'small' | 'medium' | 'large';
      customClass?: string;
      hideOnMobile?: boolean;
      hideOnDesktop?: boolean;
      visibilityCondition?: {
        enabled: boolean;
        property: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
        value: string;
      };
    };
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_event_page_unique").on(table.eventId, table.pageType),
]);

// Page Versions table - stores version history for event pages
export const pageVersions = pgTable("page_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventPageId: varchar("event_page_id").references(() => eventPages.id).notNull(),
  version: integer("version").notNull(),
  label: varchar("label", { length: 255 }),
  sections: jsonb("sections").$type<Array<{
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
    styles?: {
      backgroundColor?: string;
      textColor?: string;
      paddingTop?: 'none' | 'small' | 'medium' | 'large';
      paddingBottom?: 'none' | 'small' | 'medium' | 'large';
      customClass?: string;
      hideOnMobile?: boolean;
      hideOnDesktop?: boolean;
      visibilityCondition?: {
        enabled: boolean;
        property: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
        value: string;
      };
    };
  }>>(),
  theme: jsonb("theme").$type<{
    headingFont?: string;
    bodyFont?: string;
    baseFontSize?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    textSecondaryColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonBorderColor?: string;
    cardBackground?: string;
    borderColor?: string;
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
    buttonStyle?: 'filled' | 'outline';
    containerWidth?: 'narrow' | 'standard' | 'wide' | 'full';
    sectionSpacing?: 'compact' | 'normal' | 'relaxed';
    pagePadding?: 'standard' | 'none';
    textDecoration?: 'none' | 'underline' | 'uppercase' | 'capitalize';
    customCss?: string;
  }>(),
  seo: jsonb("seo").$type<{ title?: string; description?: string; ogImage?: string }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_page_version_page").on(table.eventPageId),
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
  activationLinkId: varchar("activation_link_id").references(() => activationLinks.id),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  customData: jsonb("custom_data").$type<Record<string, string | boolean | string[]>>(),
  passwordHash: varchar("password_hash", { length: 255 }),
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
  speakerRole: varchar("speaker_role", { length: 50 }),
  notes: text("notes"),
  isFeatured: boolean("is_featured").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Sponsors table
export const eventSponsors = pgTable("event_sponsors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  tier: varchar("tier", { length: 50 }).default("bronze"),
  websiteUrl: varchar("website_url", { length: 500 }),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  bio: text("bio"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  socialLinks: jsonb("social_links").$type<{ linkedin?: string; twitter?: string; facebook?: string; instagram?: string }>(),
  registrationSeats: integer("registration_seats").default(0),
  seatsUsed: integer("seats_used").default(0),
  baseInviteCodeId: varchar("base_invite_code_id"),
  portalAccessToken: varchar("portal_access_token", { length: 255 }),
  portalTokenExpiresAt: timestamp("portal_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor Contacts table (people from sponsor company with portal access)
export const sponsorContacts = pgTable("sponsor_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  sponsorId: varchar("sponsor_id").references(() => eventSponsors.id).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  isPrimary: boolean("is_primary").default(false),
  portalAccessToken: varchar("portal_access_token", { length: 255 }),
  portalTokenExpiresAt: timestamp("portal_token_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor Tasks table (tasks that organizers assign to sponsors)
export const sponsorTasks = pgTable("sponsor_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  requiredFields: jsonb("required_fields").$type<string[]>(),
  isRequired: boolean("is_required").default(false),
  dueDate: date("due_date"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor Task Completions table (track task completion per sponsor)
export const sponsorTaskCompletions = pgTable("sponsor_task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  taskId: varchar("task_id").references(() => sponsorTasks.id).notNull(),
  sponsorId: varchar("sponsor_id").references(() => eventSponsors.id).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  submittedData: jsonb("submitted_data").$type<Record<string, unknown>>(),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
  reviewNotes: text("review_notes"),
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

// Session Tracks table
export const sessionTracks = pgTable("session_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session Rooms table
export const sessionRooms = pgTable("session_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }),
  capacity: integer("capacity"),
  amenities: text("amenities").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content catalog table
export const contentItems = pgTable("content_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id),
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

// Vendors table - for managing vendor relationships and contracts
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: varchar("category_id").references(() => budgetCategories.id),
  eventId: varchar("event_id").references(() => events.id),
  budgetItemId: varchar("budget_item_id").references(() => budgetItems.id),
  description: text("description"),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0"),
  contractStatus: varchar("contract_status", { length: 50 }).default("active"), // 'active', 'inactive'
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending"), // 'pending', 'approved', 'denied'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  workstream: varchar("workstream", { length: 100 }),
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
  styles: jsonb("styles").$type<{
    alignment?: 'left' | 'center' | 'right';
    headingFont?: string;
    headingSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    headingWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    headingColor?: string;
    bodyFont?: string;
    bodySize?: 'sm' | 'base' | 'lg';
    bodyColor?: string;
    lineHeight?: 'tight' | 'normal' | 'relaxed';
  }>().default({}),
  isInviteEmail: boolean("is_invite_email").default(false),
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
  connectionId: varchar("connection_id").references(() => socialConnections.id),
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
  styles: jsonb("styles").$type<{
    alignment?: 'left' | 'center' | 'right';
    headingFont?: string;
    headingSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    headingWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    headingColor?: string;
    bodyFont?: string;
    bodySize?: 'sm' | 'base' | 'lg';
    bodyColor?: string;
    lineHeight?: 'tight' | 'normal' | 'relaxed';
  }>().default({}),
  isDefault: boolean("is_default").default(false),
  isInviteEmail: boolean("is_invite_email").default(false),
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
  // For LinkedIn organization pages
  connectionType: varchar("connection_type", { length: 20 }).default("personal"), // 'personal' or 'organization'
  organizationUrn: varchar("organization_urn", { length: 255 }), // e.g., 'urn:li:organization:12345'
  organizationName: varchar("organization_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CFP (Call for Papers) Configs table - Per-event CFP settings
export const cfpConfigs = pgTable("cfp_configs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventId: varchar("event_id").references(() => events.id).notNull().unique(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  isOpen: boolean("is_open").default(false),
  title: text("title").default("Call for Papers"),
  description: text("description"),
  submissionDeadline: timestamp("submission_deadline"),
  notificationDate: timestamp("notification_date"),
  maxAbstractLength: integer("max_abstract_length").default(500),
  allowMultipleSubmissions: boolean("allow_multiple_submissions").default(true),
  requiresRegistration: boolean("requires_registration").default(false),
  guidelines: text("guidelines"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CFP Topics table - Topics/tracks for submissions
export const cfpTopics = pgTable("cfp_topics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cfpConfigId: integer("cfp_config_id").references(() => cfpConfigs.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
});

// CFP Submissions table - Paper/abstract submissions
export const cfpSubmissions = pgTable("cfp_submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cfpConfigId: integer("cfp_config_id").references(() => cfpConfigs.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  topicId: integer("topic_id").references(() => cfpTopics.id),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  authorAffiliation: text("author_affiliation"),
  coAuthors: text("co_authors"),
  keywords: text("keywords"),
  submissionType: text("submission_type").default("paper"),
  status: text("status").default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  sessionId: varchar("session_id").references(() => eventSessions.id),
});

// CFP Reviewers table - Reviewer assignments
export const cfpReviewers = pgTable("cfp_reviewers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cfpConfigId: integer("cfp_config_id").references(() => cfpConfigs.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  assignedTopics: text("assigned_topics").array(),
});

// CFP Reviews table - Individual reviews
export const cfpReviews = pgTable("cfp_reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  submissionId: integer("submission_id").references(() => cfpSubmissions.id).notNull(),
  reviewerId: integer("reviewer_id").references(() => cfpReviewers.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  score: integer("score"),
  recommendation: text("recommendation"),
  comments: text("comments"),
  feedbackToAuthor: text("feedback_to_author"),
  submittedAt: timestamp("submitted_at"),
  status: text("status").default("assigned"),
});

// Email tracking tables
export const emailMessages = pgTable("email_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  campaignId: varchar("campaign_id").references(() => emailCampaigns.id),
  attendeeId: varchar("attendee_id").references(() => attendees.id),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  subject: varchar("subject", { length: 500 }),
  status: varchar("status", { length: 50 }).default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  resendMessageId: varchar("resend_message_id", { length: 255 }),
});

export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").references(() => emailMessages.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurred_at").defaultNow(),
});

export const emailSuppressions = pgTable("email_suppressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("email_suppressions_org_email_idx").on(table.organizationId, table.email),
]);

export const signupInviteCodes = pgTable("signup_invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  discountPercent: integer("discount_percent"),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").default(0),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const signupInviteCodeRedemptions = pgTable("signup_invite_code_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteCodeId: varchar("invite_code_id").references(() => signupInviteCodes.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// Passkey (Cvent) Housing Integration
export const passkeyConnections = pgTable("passkey_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  clientId: text("client_id"), // encrypted
  clientSecret: text("client_secret"), // encrypted
  accessToken: text("access_token"), // encrypted OAuth token
  tokenExpiresAt: timestamp("token_expires_at"),
  status: varchar("status", { length: 50 }).default("disconnected"), // 'active', 'disconnected', 'error'
  errorMessage: text("error_message"),
  connectedBy: varchar("connected_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("passkey_connections_org_idx").on(table.organizationId),
]);

export const passkeyEventMappings = pgTable("passkey_event_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  passkeyEventId: varchar("passkey_event_id", { length: 255 }).notNull(),
  passkeyEventName: varchar("passkey_event_name", { length: 500 }),
  regLinkUrl: text("reglink_url"), // The URL to redirect attendees to Passkey
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("passkey_event_mappings_event_idx").on(table.eventId),
]);

export const passkeyReservations = pgTable("passkey_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id),
  passkeyReservationId: varchar("passkey_reservation_id", { length: 255 }),
  hotelName: varchar("hotel_name", { length: 255 }),
  checkInDate: date("check_in_date"),
  checkOutDate: date("check_out_date"),
  roomType: varchar("room_type", { length: 255 }),
  confirmationNumber: varchar("confirmation_number", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'confirmed', 'cancelled', 'modified'
  guestFirstName: varchar("guest_first_name", { length: 255 }),
  guestLastName: varchar("guest_last_name", { length: 255 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Folders - Organization-scoped folders for organizing documents
export const documentFolders = pgTable("document_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id), // Optional - can be org-level or event-specific
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: varchar("parent_id"), // Self-referential for nested folders
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents - Main document/file records
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id), // Optional - can be org-level or event-specific
  folderId: varchar("folder_id").references(() => documentFolders.id),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  objectPath: text("object_path").notNull(), // Path in object storage
  accessLevel: varchar("access_level", { length: 50 }).default("private"), // 'private', 'organization', 'shared'
  version: integer("version").default(1),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Shares - Sharing permissions for documents
export const documentShares = pgTable("document_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  shareType: varchar("share_type", { length: 50 }).notNull(), // 'user', 'email', 'role', 'link'
  shareValue: varchar("share_value", { length: 255 }).notNull(), // userId, email address, role name, or link token
  permission: varchar("permission", { length: 50 }).default("view"), // 'view', 'download', 'edit'
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_document_shares_document").on(table.documentId),
  index("IDX_document_shares_share_value").on(table.shareValue),
]);

// Document Activity - Audit trail for document actions
export const documentActivity = pgTable("document_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  actorType: varchar("actor_type", { length: 50 }).notNull(), // 'user', 'vendor', 'system'
  actorId: varchar("actor_id", { length: 255 }), // userId or vendorId
  actorEmail: varchar("actor_email", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(), // 'upload', 'view', 'download', 'edit', 'share', 'unshare', 'delete'
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_document_activity_document").on(table.documentId),
  index("IDX_document_activity_created_at").on(table.createdAt),
]);

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
  invitedByUser: one(users, { fields: [organizationMembers.invitedBy], references: [users.id] }),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  organization: one(organizations, { fields: [teamInvitations.organizationId], references: [organizations.id] }),
  invitedByUser: one(users, { fields: [teamInvitations.invitedBy], references: [users.id] }),
  acceptedByUser: one(users, { fields: [teamInvitations.acceptedBy], references: [users.id] }),
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

export const eventSponsorsRelations = relations(eventSponsors, ({ one, many }) => ({
  organization: one(organizations, { fields: [eventSponsors.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [eventSponsors.eventId], references: [events.id] }),
  contacts: many(sponsorContacts),
  taskCompletions: many(sponsorTaskCompletions),
}));

export const sponsorContactsRelations = relations(sponsorContacts, ({ one }) => ({
  organization: one(organizations, { fields: [sponsorContacts.organizationId], references: [organizations.id] }),
  sponsor: one(eventSponsors, { fields: [sponsorContacts.sponsorId], references: [eventSponsors.id] }),
}));

export const sponsorTasksRelations = relations(sponsorTasks, ({ one, many }) => ({
  organization: one(organizations, { fields: [sponsorTasks.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [sponsorTasks.eventId], references: [events.id] }),
  completions: many(sponsorTaskCompletions),
}));

export const sponsorTaskCompletionsRelations = relations(sponsorTaskCompletions, ({ one }) => ({
  organization: one(organizations, { fields: [sponsorTaskCompletions.organizationId], references: [organizations.id] }),
  task: one(sponsorTasks, { fields: [sponsorTaskCompletions.taskId], references: [sponsorTasks.id] }),
  sponsor: one(eventSponsors, { fields: [sponsorTaskCompletions.sponsorId], references: [eventSponsors.id] }),
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
  connection: one(socialConnections, { fields: [socialPosts.connectionId], references: [socialConnections.id] }),
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

export const inviteCodesRelations = relations(inviteCodes, ({ one, many }) => ({
  organization: one(organizations, { fields: [inviteCodes.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [inviteCodes.eventId], references: [events.id] }),
  attendeeType: one(attendeeTypes, { fields: [inviteCodes.attendeeTypeId], references: [attendeeTypes.id] }),
  activationLinks: many(activationLinks),
}));

export const activationLinksRelations = relations(activationLinks, ({ one, many }) => ({
  organization: one(organizations, { fields: [activationLinks.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [activationLinks.eventId], references: [events.id] }),
  inviteCode: one(inviteCodes, { fields: [activationLinks.inviteCodeId], references: [inviteCodes.id] }),
  createdByUser: one(users, { fields: [activationLinks.createdBy], references: [users.id] }),
  clicks: many(activationLinkClicks),
}));

export const activationLinkClicksRelations = relations(activationLinkClicks, ({ one }) => ({
  activationLink: one(activationLinks, { fields: [activationLinkClicks.activationLinkId], references: [activationLinks.id] }),
  convertedAttendee: one(attendees, { fields: [activationLinkClicks.convertedToAttendeeId], references: [attendees.id] }),
}));

export const eventPagesRelations = relations(eventPages, ({ one, many }) => ({
  organization: one(organizations, { fields: [eventPages.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [eventPages.eventId], references: [events.id] }),
  versions: many(pageVersions),
}));

export const pageVersionsRelations = relations(pageVersions, ({ one }) => ({
  organization: one(organizations, { fields: [pageVersions.organizationId], references: [organizations.id] }),
  eventPage: one(eventPages, { fields: [pageVersions.eventPageId], references: [eventPages.id] }),
}));

export const registrationConfigsRelations = relations(registrationConfigs, ({ one }) => ({
  organization: one(organizations, { fields: [registrationConfigs.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [registrationConfigs.eventId], references: [events.id] }),
}));

export const contentAssetsRelations = relations(contentAssets, ({ one }) => ({
  organization: one(organizations, { fields: [contentAssets.organizationId], references: [organizations.id] }),
  uploadedByUser: one(users, { fields: [contentAssets.uploadedBy], references: [users.id] }),
}));

export const cfpConfigsRelations = relations(cfpConfigs, ({ one, many }) => ({
  event: one(events, { fields: [cfpConfigs.eventId], references: [events.id] }),
  organization: one(organizations, { fields: [cfpConfigs.organizationId], references: [organizations.id] }),
  topics: many(cfpTopics),
  submissions: many(cfpSubmissions),
  reviewers: many(cfpReviewers),
}));

export const cfpTopicsRelations = relations(cfpTopics, ({ one, many }) => ({
  cfpConfig: one(cfpConfigs, { fields: [cfpTopics.cfpConfigId], references: [cfpConfigs.id] }),
  organization: one(organizations, { fields: [cfpTopics.organizationId], references: [organizations.id] }),
  submissions: many(cfpSubmissions),
}));

export const cfpSubmissionsRelations = relations(cfpSubmissions, ({ one, many }) => ({
  cfpConfig: one(cfpConfigs, { fields: [cfpSubmissions.cfpConfigId], references: [cfpConfigs.id] }),
  event: one(events, { fields: [cfpSubmissions.eventId], references: [events.id] }),
  organization: one(organizations, { fields: [cfpSubmissions.organizationId], references: [organizations.id] }),
  topic: one(cfpTopics, { fields: [cfpSubmissions.topicId], references: [cfpTopics.id] }),
  session: one(eventSessions, { fields: [cfpSubmissions.sessionId], references: [eventSessions.id] }),
  reviews: many(cfpReviews),
}));

export const cfpReviewersRelations = relations(cfpReviewers, ({ one, many }) => ({
  cfpConfig: one(cfpConfigs, { fields: [cfpReviewers.cfpConfigId], references: [cfpConfigs.id] }),
  organization: one(organizations, { fields: [cfpReviewers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [cfpReviewers.userId], references: [users.id] }),
  reviews: many(cfpReviews),
}));

export const cfpReviewsRelations = relations(cfpReviews, ({ one }) => ({
  submission: one(cfpSubmissions, { fields: [cfpReviews.submissionId], references: [cfpSubmissions.id] }),
  reviewer: one(cfpReviewers, { fields: [cfpReviews.reviewerId], references: [cfpReviewers.id] }),
  organization: one(organizations, { fields: [cfpReviews.organizationId], references: [organizations.id] }),
}));

export const emailMessagesRelations = relations(emailMessages, ({ one, many }) => ({
  organization: one(organizations, { fields: [emailMessages.organizationId], references: [organizations.id] }),
  campaign: one(emailCampaigns, { fields: [emailMessages.campaignId], references: [emailCampaigns.id] }),
  attendee: one(attendees, { fields: [emailMessages.attendeeId], references: [attendees.id] }),
  events: many(emailEvents),
}));

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  message: one(emailMessages, { fields: [emailEvents.messageId], references: [emailMessages.id] }),
  organization: one(organizations, { fields: [emailEvents.organizationId], references: [organizations.id] }),
}));

export const emailSuppressionsRelations = relations(emailSuppressions, ({ one }) => ({
  organization: one(organizations, { fields: [emailSuppressions.organizationId], references: [organizations.id] }),
}));

export const passkeyConnectionsRelations = relations(passkeyConnections, ({ one }) => ({
  organization: one(organizations, { fields: [passkeyConnections.organizationId], references: [organizations.id] }),
  connectedByUser: one(users, { fields: [passkeyConnections.connectedBy], references: [users.id] }),
}));

export const passkeyEventMappingsRelations = relations(passkeyEventMappings, ({ one }) => ({
  organization: one(organizations, { fields: [passkeyEventMappings.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [passkeyEventMappings.eventId], references: [events.id] }),
}));

export const passkeyReservationsRelations = relations(passkeyReservations, ({ one }) => ({
  organization: one(organizations, { fields: [passkeyReservations.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [passkeyReservations.eventId], references: [events.id] }),
  attendee: one(attendees, { fields: [passkeyReservations.attendeeId], references: [attendees.id] }),
}));

// Document Collaboration - Comments and Approvals (extends existing document tables)
export const documentComments = pgTable("document_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  parentId: varchar("parent_id"),
  content: text("content").notNull(),
  authorType: varchar("author_type", { length: 50 }).notNull(),
  authorId: varchar("author_id").notNull(),
  authorName: varchar("author_name", { length: 255 }),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentApprovals = pgTable("document_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  requestedBy: varchar("requested_by").references(() => users.id),
  approverType: varchar("approver_type", { length: 50 }).notNull(),
  approverId: varchar("approver_id").notNull(),
  approverName: varchar("approver_name", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"),
  comments: text("comments"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document collaboration relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  organization: one(organizations, { fields: [documents.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [documents.eventId], references: [events.id] }),
  folder: one(documentFolders, { fields: [documents.folderId], references: [documentFolders.id] }),
  uploadedByUser: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  shares: many(documentShares),
  activity: many(documentActivity),
  comments: many(documentComments),
  approvals: many(documentApprovals),
}));

export const documentFoldersRelations = relations(documentFolders, ({ one, many }) => ({
  organization: one(organizations, { fields: [documentFolders.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [documentFolders.eventId], references: [events.id] }),
  createdByUser: one(users, { fields: [documentFolders.createdBy], references: [users.id] }),
  documents: many(documents),
}));

export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, { fields: [documentShares.documentId], references: [documents.id] }),
  organization: one(organizations, { fields: [documentShares.organizationId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [documentShares.createdBy], references: [users.id] }),
}));

export const documentActivityRelations = relations(documentActivity, ({ one }) => ({
  document: one(documents, { fields: [documentActivity.documentId], references: [documents.id] }),
  organization: one(organizations, { fields: [documentActivity.organizationId], references: [organizations.id] }),
}));

export const documentCommentsRelations = relations(documentComments, ({ one }) => ({
  document: one(documents, { fields: [documentComments.documentId], references: [documents.id] }),
  organization: one(organizations, { fields: [documentComments.organizationId], references: [organizations.id] }),
  resolvedByUser: one(users, { fields: [documentComments.resolvedBy], references: [users.id] }),
}));

export const documentApprovalsRelations = relations(documentApprovals, ({ one }) => ({
  document: one(documents, { fields: [documentApprovals.documentId], references: [documents.id] }),
  organization: one(organizations, { fields: [documentApprovals.organizationId], references: [organizations.id] }),
  requestedByUser: one(users, { fields: [documentApprovals.requestedBy], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({ id: true, invitedAt: true, acceptedAt: true, acceptedBy: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendeeSchema = createInsertSchema(attendees).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  passwordHash: z.string().optional().nullable(),
});
export const insertSpeakerSchema = createInsertSchema(speakers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(eventSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSpeakerSchema = createInsertSchema(sessionSpeakers).omit({ id: true });
export const insertSessionTrackSchema = createInsertSchema(sessionTracks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionRoomSchema = createInsertSchema(sessionRooms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({ id: true });
export const insertBudgetOffsetSchema = createInsertSchema(budgetOffsets).omit({ id: true });
export const insertEventBudgetSettingsSchema = createInsertSchema(eventBudgetSettings).omit({ id: true });
export const insertBudgetPaymentSchema = createInsertSchema(budgetPayments).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliverableSchema = createInsertSchema(deliverables).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  scheduledAt: z.union([z.date(), z.string().transform(s => new Date(s))]).optional().nullable(),
});
export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  scheduledAt: z.union([z.date(), z.string().transform(s => new Date(s))]).optional().nullable(),
});
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSocialConnectionSchema = createInsertSchema(socialConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendeeTypeSchema = createInsertSchema(attendeeTypes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackageSchema = createInsertSchema(packages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventPackageSchema = createInsertSchema(eventPackages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivationLinkSchema = createInsertSchema(activationLinks).omit({ id: true, createdAt: true, updatedAt: true, clickCount: true, conversionCount: true });
export const insertActivationLinkClickSchema = createInsertSchema(activationLinkClicks).omit({ id: true, clickedAt: true });
export const insertEventPageSchema = createInsertSchema(eventPages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPageVersionSchema = createInsertSchema(pageVersions).omit({ id: true, createdAt: true });
export const insertRegistrationConfigSchema = createInsertSchema(registrationConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentAssetSchema = createInsertSchema(contentAssets).omit({ id: true, createdAt: true });
export const insertEventSponsorSchema = createInsertSchema(eventSponsors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSponsorContactSchema = createInsertSchema(sponsorContacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSponsorTaskSchema = createInsertSchema(sponsorTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSponsorTaskCompletionSchema = createInsertSchema(sponsorTaskCompletions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCfpConfigSchema = createInsertSchema(cfpConfigs).omit({ createdAt: true });
export const insertCfpTopicSchema = createInsertSchema(cfpTopics);
export const insertCfpSubmissionSchema = createInsertSchema(cfpSubmissions).omit({ submittedAt: true });
export const insertCfpReviewerSchema = createInsertSchema(cfpReviewers);
export const insertCfpReviewSchema = createInsertSchema(cfpReviews);
export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({ id: true });
export const insertEmailEventSchema = createInsertSchema(emailEvents).omit({ id: true });
export const insertEmailSuppressionSchema = createInsertSchema(emailSuppressions).omit({ id: true, createdAt: true });
export const insertSocialMediaCredentialSchema = createInsertSchema(socialMediaCredentials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailPlatformConnectionSchema = createInsertSchema(emailPlatformConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailPlatformAudienceSchema = createInsertSchema(emailPlatformAudiences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailSyncJobSchema = createInsertSchema(emailSyncJobs).omit({ id: true, createdAt: true });
export const insertSignupInviteCodeSchema = createInsertSchema(signupInviteCodes).omit({ id: true, createdAt: true, usesCount: true });
export const insertSignupInviteCodeRedemptionSchema = createInsertSchema(signupInviteCodeRedemptions).omit({ id: true, redeemedAt: true });
export const insertPasskeyConnectionSchema = createInsertSchema(passkeyConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPasskeyEventMappingSchema = createInsertSchema(passkeyEventMappings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPasskeyReservationSchema = createInsertSchema(passkeyReservations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentFolderSchema = createInsertSchema(documentFolders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentShareSchema = createInsertSchema(documentShares).omit({ id: true, createdAt: true });
export const insertDocumentActivitySchema = createInsertSchema(documentActivity).omit({ id: true, createdAt: true });
export const insertDocumentCommentSchema = createInsertSchema(documentComments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentApprovalSchema = createInsertSchema(documentApprovals).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
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
export type InsertSessionTrack = z.infer<typeof insertSessionTrackSchema>;
export type SessionTrack = typeof sessionTracks.$inferSelect;
export type InsertSessionRoom = z.infer<typeof insertSessionRoomSchema>;
export type SessionRoom = typeof sessionRooms.$inferSelect;
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
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;
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
export type InsertActivationLink = z.infer<typeof insertActivationLinkSchema>;
export type ActivationLink = typeof activationLinks.$inferSelect;
export type InsertActivationLinkClick = z.infer<typeof insertActivationLinkClickSchema>;
export type ActivationLinkClick = typeof activationLinkClicks.$inferSelect;
export type InsertEventPage = z.infer<typeof insertEventPageSchema>;
export type EventPage = typeof eventPages.$inferSelect;
export type EventPageTheme = NonNullable<EventPage['theme']>;
export type InsertPageVersion = z.infer<typeof insertPageVersionSchema>;
export type PageVersion = typeof pageVersions.$inferSelect;
export type InsertRegistrationConfig = z.infer<typeof insertRegistrationConfigSchema>;
export type RegistrationConfig = typeof registrationConfigs.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;
export type InsertContentAsset = z.infer<typeof insertContentAssetSchema>;
export type ContentAsset = typeof contentAssets.$inferSelect;
export type InsertEventSponsor = z.infer<typeof insertEventSponsorSchema>;
export type EventSponsor = typeof eventSponsors.$inferSelect;
export type InsertSponsorContact = z.infer<typeof insertSponsorContactSchema>;
export type SponsorContact = typeof sponsorContacts.$inferSelect;
export type InsertSponsorTask = z.infer<typeof insertSponsorTaskSchema>;
export type SponsorTask = typeof sponsorTasks.$inferSelect;
export type InsertSponsorTaskCompletion = z.infer<typeof insertSponsorTaskCompletionSchema>;
export type SponsorTaskCompletion = typeof sponsorTaskCompletions.$inferSelect;
export type InsertCfpConfig = z.infer<typeof insertCfpConfigSchema>;
export type CfpConfig = typeof cfpConfigs.$inferSelect;
export type InsertCfpTopic = z.infer<typeof insertCfpTopicSchema>;
export type CfpTopic = typeof cfpTopics.$inferSelect;
export type InsertCfpSubmission = z.infer<typeof insertCfpSubmissionSchema>;
export type CfpSubmission = typeof cfpSubmissions.$inferSelect;
export type InsertCfpReviewer = z.infer<typeof insertCfpReviewerSchema>;
export type CfpReviewer = typeof cfpReviewers.$inferSelect;
export type InsertCfpReview = z.infer<typeof insertCfpReviewSchema>;
export type CfpReview = typeof cfpReviews.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailEvent = z.infer<typeof insertEmailEventSchema>;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailSuppression = z.infer<typeof insertEmailSuppressionSchema>;
export type EmailSuppression = typeof emailSuppressions.$inferSelect;
export type InsertSocialMediaCredential = z.infer<typeof insertSocialMediaCredentialSchema>;
export type SocialMediaCredential = typeof socialMediaCredentials.$inferSelect;
export type InsertEmailPlatformConnection = z.infer<typeof insertEmailPlatformConnectionSchema>;
export type EmailPlatformConnection = typeof emailPlatformConnections.$inferSelect;
export type InsertEmailPlatformAudience = z.infer<typeof insertEmailPlatformAudienceSchema>;
export type EmailPlatformAudience = typeof emailPlatformAudiences.$inferSelect;
export type InsertEmailSyncJob = z.infer<typeof insertEmailSyncJobSchema>;
export type EmailSyncJob = typeof emailSyncJobs.$inferSelect;
export type InsertSignupInviteCode = z.infer<typeof insertSignupInviteCodeSchema>;
export type SignupInviteCode = typeof signupInviteCodes.$inferSelect;
export type InsertSignupInviteCodeRedemption = z.infer<typeof insertSignupInviteCodeRedemptionSchema>;
export type SignupInviteCodeRedemption = typeof signupInviteCodeRedemptions.$inferSelect;
export type InsertPasskeyConnection = z.infer<typeof insertPasskeyConnectionSchema>;
export type PasskeyConnection = typeof passkeyConnections.$inferSelect;
export type InsertPasskeyEventMapping = z.infer<typeof insertPasskeyEventMappingSchema>;
export type PasskeyEventMapping = typeof passkeyEventMappings.$inferSelect;
export type InsertPasskeyReservation = z.infer<typeof insertPasskeyReservationSchema>;
export type PasskeyReservation = typeof passkeyReservations.$inferSelect;
export type InsertDocumentFolder = z.infer<typeof insertDocumentFolderSchema>;
export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentShare = z.infer<typeof insertDocumentShareSchema>;
export type DocumentShare = typeof documentShares.$inferSelect;
export type InsertDocumentActivity = z.infer<typeof insertDocumentActivitySchema>;
export type DocumentActivity = typeof documentActivity.$inferSelect;
export type InsertDocumentComment = z.infer<typeof insertDocumentCommentSchema>;
export type DocumentComment = typeof documentComments.$inferSelect;
export type InsertDocumentApproval = z.infer<typeof insertDocumentApprovalSchema>;
export type DocumentApproval = typeof documentApprovals.$inferSelect;

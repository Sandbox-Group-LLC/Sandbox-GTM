import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  unique,
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
  customDomainVerified: boolean("custom_domain_verified").default(false), // Whether domain ownership has been verified
  customDomainVerificationToken: varchar("custom_domain_verification_token", { length: 64 }), // Token for DNS verification
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

// Supported languages for multi-language event content
export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
] as const;

// Audience Targeting type for ICP Match Rate calculation
export interface AudienceTargeting {
  companyTypes: ('enterprise' | 'mid-market' | 'smb' | 'open')[];
  roles: ('executive' | 'vp' | 'director' | 'manager' | 'open')[];
  functions: ('marketing' | 'sales' | 'product' | 'engineering' | 'operations' | 'open')[];
  accountFocus: 'strategic' | 'open';
}

// Default audience targeting (all open)
export const DEFAULT_AUDIENCE_TARGETING: AudienceTargeting = {
  companyTypes: ['open'],
  roles: ['open'],
  functions: ['open'],
  accountFocus: 'open',
};

// Acquisition Milestone type for registration goals tracking
export interface AcquisitionMilestone {
  date: string; // ISO date string YYYY-MM-DD
  targetAttendees: number;
}

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

// Brand Kits table - stores organization-level brand styling extracted from websites
export const brandKits = pgTable("brand_kits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull().default("Default Brand Kit"),
  sourceUrl: varchar("source_url", { length: 500 }), // Website URL that was scraped
  // Color palette
  primaryColor: varchar("primary_color", { length: 20 }), // Hex color e.g. #1a73e8
  secondaryColor: varchar("secondary_color", { length: 20 }),
  accentColor: varchar("accent_color", { length: 20 }),
  textColor: varchar("text_color", { length: 20 }),
  backgroundColor: varchar("background_color", { length: 20 }),
  // Button styling
  buttonColor: varchar("button_color", { length: 20 }), // Button background color
  buttonTextColor: varchar("button_text_color", { length: 20 }), // Button text color
  buttonBorderColor: varchar("button_border_color", { length: 20 }), // Button border color
  // Typography
  fontFamily: varchar("font_family", { length: 255 }), // Primary font for body text
  headingFontFamily: varchar("heading_font_family", { length: 255 }), // Font for headings
  // Logo
  logoUrl: varchar("logo_url", { length: 500 }),
  // Status
  status: varchar("status", { length: 20 }).default("draft"), // 'draft', 'confirmed', 'active'
  isDefault: boolean("is_default").default(false), // If this is the default brand kit for the org
  // Raw extraction data for reference
  extractedData: jsonb("extracted_data").$type<{
    allColors?: string[];
    fonts?: string[];
    logoSuggestions?: string[];
    rawCss?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandKitSchema = createInsertSchema(brandKits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKits.$inferSelect;

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
  planningStartDate: date("planning_start_date"), // When planning began for execution timeline
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
  // Multi-language support
  supportedLanguages: text("supported_languages").array(), // e.g., ["en", "es", "fr"]
  defaultLanguage: varchar("default_language", { length: 10 }).default("en"),
  // Audience Targeting for ICP Match Rate calculation
  audienceTargeting: jsonb("audience_targeting").$type<AudienceTargeting>(),
  // Acquisition Milestones for registration goals
  acquisitionGoal: integer("acquisition_goal"), // Total target attendees
  acquisitionMilestones: jsonb("acquisition_milestones").$type<AcquisitionMilestone[]>(),
  // Intent recompute tracking for delta calculations
  lastIntentRecomputedAt: timestamp("last_intent_recomputed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Intent Recompute Snapshot type for tracking before/after counts
export interface IntentRecomputeSnapshot {
  hotLeadCount: number;
  highIntentCount: number;
  momentumOnlyCount: number;
  previousHotLeadCount: number;
  previousHighIntentCount: number;
  previousMomentumOnlyCount: number;
}

// Intent Recompute History table - tracks changelog for intent scoring
export const intentRecomputeHistory = pgTable("intent_recompute_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  recomputedAt: timestamp("recomputed_at").notNull().defaultNow(),
  snapshot: jsonb("snapshot").$type<IntentRecomputeSnapshot>().notNull(),
  triggeredBy: varchar("triggered_by").references(() => users.id),
});

// Event Translations table - stores translated event content
export const eventTranslations = pgTable("event_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  languageCode: varchar("language_code", { length: 10 }).notNull(), // e.g., "en", "es", "fr"
  name: varchar("name", { length: 255 }),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_event_translation_unique").on(table.eventId, table.languageCode),
]);

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
  // Device & Browser info (parsed from User-Agent)
  deviceType: varchar("device_type", { length: 20 }),
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  // Geographic data (from IP geolocation)
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 10 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }),
  // Visitor behavior
  isReturningVisitor: boolean("is_returning_visitor").default(false),
  previousVisitCount: integer("previous_visit_count").default(0),
  // Time context (for analytics)
  dayOfWeek: integer("day_of_week"),
  hourOfDay: integer("hour_of_day"),
  // Bot detection
  isBot: boolean("is_bot").default(false),
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
  pageType: varchar("page_type", { length: 50 }).notNull(), // 'landing', 'registration', 'portal', 'custom'
  name: varchar("name", { length: 255 }), // Display name for custom pages
  slug: varchar("slug", { length: 100 }), // URL slug, auto-generated for custom pages
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
    inputBackgroundColor?: string;
    inputTextColor?: string;
    // Layout
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
    buttonStyle?: 'filled' | 'outline';
    containerWidth?: 'narrow' | 'standard' | 'wide' | 'full';
    sectionSpacing?: 'compact' | 'normal' | 'relaxed';
    pagePadding?: 'standard' | 'none';
    textDecoration?: 'none' | 'underline' | 'uppercase' | 'capitalize';
    customCss?: string;
    googleTagId?: string;
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
        logic: 'and' | 'or';
        conditions: Array<{
          property: string;
          operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
          value: string;
        }>;
      };
    };
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_event_page_unique").on(table.eventId, table.pageType, table.slug),
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
        logic: 'and' | 'or';
        conditions: Array<{
          property: string;
          operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
          value: string;
        }>;
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
    inputBackgroundColor?: string;
    inputTextColor?: string;
    borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
    buttonStyle?: 'filled' | 'outline';
    containerWidth?: 'narrow' | 'standard' | 'wide' | 'full';
    sectionSpacing?: 'compact' | 'normal' | 'relaxed';
    pagePadding?: 'standard' | 'none';
    textDecoration?: 'none' | 'underline' | 'uppercase' | 'capitalize';
    customCss?: string;
    googleTagId?: string;
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
    collectActivationKey?: boolean;
    requireActivationKey?: boolean;
    enabledCustomFieldIds?: string[]; // Non-global custom fields enabled for this event
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
  attendeeOnly: boolean("attendee_only").default(false), // Fields that should only be visible in attendee-facing forms, not admin forms
  isGlobal: boolean("is_global").default(false), // Global fields are automatically included in all events
  parentFieldId: varchar("parent_field_id"), // Reference to parent field for conditional visibility
  parentTriggerValues: text("parent_trigger_values").array(), // Values of parent field that trigger this field to be visible
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Custom Field Settings - per-event overrides for custom field behavior
export const eventCustomFieldSettings = pgTable("event_custom_field_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  customFieldId: varchar("custom_field_id").references(() => customFields.id, { onDelete: "cascade" }).notNull(),
  required: boolean("required"), // Override for required status (null = use org default)
  isActive: boolean("is_active"), // Override for active status (null = use org default)
  displayOrder: integer("display_order"), // Override for display order (null = use org default)
  parentFieldId: varchar("parent_field_id"), // Override for parent field (null = use org default)
  parentTriggerValues: text("parent_trigger_values").array(), // Override for trigger values
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueEventField: unique().on(table.eventId, table.customFieldId),
}));

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
  // Contact-level intent tracking for buyer signals
  intentStatus: varchar("intent_status", { length: 50 }).default("none"), // none, engaged, high_intent, hot_lead
  salesReady: boolean("sales_ready").default(false),
  intentSources: jsonb("intent_sources").$type<{ type: string; id: string; createdAt: string }[]>().default([]),
  // Narrative explanation layer for intent scoring (computed from all interactions + meetings)
  intentExplanation: jsonb("intent_explanation").$type<IntentExplanation>(),
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

// Sponsor Contact Permissions - feature keys that sponsor contacts can have access to
export const SPONSOR_CONTACT_PERMISSIONS = {
  LEAD_CAPTURE: 'lead_capture',
  VIEW_LEADS: 'view_leads',
  EXPORT_LEADS: 'export_leads',
  INVITE_TEAM: 'invite_team',
} as const;

export type SponsorContactPermission = typeof SPONSOR_CONTACT_PERMISSIONS[keyof typeof SPONSOR_CONTACT_PERMISSIONS];

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
  permissions: text("permissions").array(), // Array of SponsorContactPermission keys
  invitedBy: varchar("invited_by").references(() => sponsorContacts.id), // For team member invitations
  portalAccessToken: varchar("portal_access_token", { length: 255 }),
  portalTokenExpiresAt: timestamp("portal_token_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor Contact Invitations table - for pending team invitations from sponsor contacts
export const sponsorContactInvitations = pgTable("sponsor_contact_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  sponsorId: varchar("sponsor_id").references(() => eventSponsors.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  permissions: text("permissions").array(), // Permissions to grant when accepted
  inviteCode: varchar("invite_code", { length: 64 }).unique().notNull(),
  invitedBy: varchar("invited_by").references(() => sponsorContacts.id), // Nullable: null means invited by primary contact
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'expired', 'revoked'
  expiresAt: timestamp("expires_at"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => sponsorContacts.id),
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
  topics: text("topics").array(),
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
  roomType: varchar("room_type", { length: 50 }), // 'meeting', 'conference', 'booth', 'lounge', etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room Open Hours - defines when a room is available for booking on specific event dates
export const roomOpenHours = pgTable("room_open_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => sessionRooms.id).notNull(),
  openDate: date("open_date").notNull(), // Specific event date (e.g., "2025-03-12")
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format (e.g., "09:00")
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format (e.g., "17:00")
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("room_open_hours_room_idx").on(table.roomId),
]);

// Member Room Assignments - assigns rooms to team members (portal members or admin users)
export const memberRoomAssignments = pgTable("member_room_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  roomId: varchar("room_id").references(() => sessionRooms.id).notNull(),
  // Either a portal member OR an admin user is assigned (one must be set)
  meetingPortalMemberId: varchar("meeting_portal_member_id").references(() => meetingPortalMembers.id),
  adminUserId: varchar("admin_user_id").references(() => users.id),
  isPrimary: boolean("is_primary").default(false), // Primary room assignment for this member
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("member_room_assignments_room_idx").on(table.roomId),
  index("member_room_assignments_portal_member_idx").on(table.meetingPortalMemberId),
  index("member_room_assignments_admin_idx").on(table.adminUserId),
]);

// Session Topics table - topics that can be tagged on sessions for recommendations
export const sessionTopics = pgTable("session_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendee Saved Sessions - for personal schedule/bookmarks
export const attendeeSavedSessions = pgTable("attendee_saved_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendee Interests - preferences for session recommendations
export const attendeeInterests = pgTable("attendee_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull().unique(),
  preferredTracks: text("preferred_tracks").array(),
  preferredSessionTypes: text("preferred_session_types").array(),
  preferredTopics: text("preferred_topics").array(),
  interests: text("interests").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session Feedback - feedback on individual sessions
export const sessionFeedback = pgTable("session_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  overallRating: integer("overall_rating").notNull(),
  contentRating: integer("content_rating"),
  speakerRating: integer("speaker_rating"),
  relevanceRating: integer("relevance_rating"),
  comment: text("comment"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event Feedback - overall event experience feedback
export const eventFeedback = pgTable("event_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  overallRating: integer("overall_rating").notNull(),
  venueRating: integer("venue_rating"),
  contentRating: integer("content_rating"),
  networkingRating: integer("networking_rating"),
  organizationRating: integer("organization_rating"),
  wouldRecommend: boolean("would_recommend"),
  recommendationScore: integer("recommendation_score"), // NPS score 0-10 (9-10: Promoter, 7-8: Passive, 0-6: Detractor)
  highlights: text("highlights"),
  improvements: text("improvements"),
  additionalComments: text("additional_comments"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback Configuration - settings for feedback forms per event
export const feedbackConfigs = pgTable("feedback_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull().unique(),
  sessionFeedbackEnabled: boolean("session_feedback_enabled").default(true),
  eventFeedbackEnabled: boolean("event_feedback_enabled").default(true),
  allowAnonymous: boolean("allow_anonymous").default(true),
  sessionFeedbackFields: jsonb("session_feedback_fields").$type<string[]>(),
  eventFeedbackFields: jsonb("event_feedback_fields").$type<string[]>(),
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
  phase: varchar("phase", { length: 50 }).default("pre_program"),
  executionTime: timestamp("execution_time"),
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

// Email Template Library - cross-organization shared templates
export const emailTemplateLibrary = pgTable("email_template_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  purpose: text("purpose"),
  timing: text("timing"),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  headerImageUrl: text("header_image_url"),
  category: varchar("category", { length: 50 }).default("audience_acquisition"),
  campaignType: varchar("campaign_type", { length: 50 }),
  funnelStage: varchar("funnel_stage", { length: 50 }),
  campaignRole: varchar("campaign_role", { length: 50 }),
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
  isActive: boolean("is_active").default(true),
  sourceOrganizationId: varchar("source_organization_id").references(() => organizations.id), // Which org created this
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
  campaignType: varchar("campaign_type", { length: 50 }),
  funnelStage: varchar("funnel_stage", { length: 50 }),
  campaignRole: varchar("campaign_role", { length: 50 }).default("general"),
  libraryTemplateId: varchar("library_template_id").references(() => emailTemplateLibrary.id), // Track provenance from library
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
  includeInAcquisitionFunnel: boolean("include_in_acquisition_funnel").default(false),
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
  folder: varchar("folder", { length: 100 }), // Optional folder for organization (e.g., "Sponsor Logos")
  sponsorId: varchar("sponsor_id").references(() => eventSponsors.id), // Link to sponsor for sponsor-uploaded assets
  sponsorTier: varchar("sponsor_tier", { length: 50 }), // Sponsor tier (platinum, gold, silver, etc.)
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

// Marketing Leads - Public lead generation submissions (no organization scope)
export const marketingLeads = pgTable("marketing_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  source: varchar("source", { length: 100 }).default("pricing-page"), // Where the lead came from
  status: varchar("status", { length: 50 }).default("new"), // 'new', 'contacted', 'qualified', 'converted'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingLeadSchema = createInsertSchema(marketingLeads).omit({
  id: true,
  createdAt: true,
});

// Marketing Activation Links - Admin-level tracking links for marketing pages (not org-scoped)
export const marketingActivationLinks = pgTable("marketing_activation_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Destination: 'landing', 'pricing', 'lead-form', 'signup'
  destinationType: varchar("destination_type", { length: 50 }).notNull().default("landing"),
  destinationUrl: text("destination_url").notNull(), // Full URL including domain
  // UTM parameters
  utmSource: varchar("utm_source", { length: 255 }).notNull(),
  utmMedium: varchar("utm_medium", { length: 255 }).notNull(),
  utmCampaign: varchar("utm_campaign", { length: 255 }).notNull(),
  utmContent: varchar("utm_content", { length: 255 }),
  utmTerm: varchar("utm_term", { length: 255 }),
  // Short code for tracking URLs
  shortCode: varchar("short_code", { length: 16 }).unique().notNull(),
  // Status and metadata
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'paused', 'archived'
  clickCount: integer("click_count").default(0),
  conversionCount: integer("conversion_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_marketing_link_short_code").on(table.shortCode),
  index("IDX_marketing_link_status").on(table.status),
]);

// Marketing Link Clicks - Track individual click events for marketing links
export const marketingLinkClicks = pgTable("marketing_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketingLinkId: varchar("marketing_link_id").references(() => marketingActivationLinks.id).notNull(),
  // Visitor identification (hashed for privacy)
  visitorHash: varchar("visitor_hash", { length: 64 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  // Query params snapshot
  queryParams: jsonb("query_params").$type<Record<string, string>>(),
  // Device & Browser (parsed from User-Agent)
  deviceType: varchar("device_type", { length: 20 }), // 'desktop', 'mobile', 'tablet'
  browser: varchar("browser", { length: 50 }), // 'Chrome', 'Firefox', 'Safari', etc.
  os: varchar("os", { length: 50 }), // 'Windows', 'macOS', 'iOS', 'Android', 'Linux'
  // Geographic data (from IP geolocation)
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 3 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }),
  // Visitor behavior
  isReturningVisitor: boolean("is_returning_visitor").default(false),
  previousVisitCount: integer("previous_visit_count").default(0),
  // Time context
  dayOfWeek: integer("day_of_week"), // 0=Sunday, 6=Saturday
  hourOfDay: integer("hour_of_day"), // 0-23
  // Bot detection
  isBot: boolean("is_bot").default(false),
  // Conversion tracking (linked to marketing lead if converted)
  convertedToLeadId: varchar("converted_to_lead_id").references(() => marketingLeads.id),
  convertedAt: timestamp("converted_at"),
  // Timing
  clickedAt: timestamp("clicked_at").defaultNow(),
}, (table) => [
  index("IDX_marketing_click_link").on(table.marketingLinkId),
  index("IDX_marketing_click_time").on(table.clickedAt),
  index("IDX_marketing_click_country").on(table.country),
  index("IDX_marketing_click_device").on(table.deviceType),
]);

export const insertMarketingActivationLinkSchema = createInsertSchema(marketingActivationLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  clickCount: true,
  conversionCount: true,
});
export const insertMarketingLinkClickSchema = createInsertSchema(marketingLinkClicks).omit({
  id: true,
  clickedAt: true,
});

// Custom Fonts - Organization-scoped custom font families
export const customFonts = pgTable("custom_fonts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // CSS font-family name (e.g., "intel-one")
  displayName: varchar("display_name", { length: 255 }), // Human-readable name for UI
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("custom_fonts_org_name_idx").on(table.organizationId, table.name),
]);

// Custom Font Variants - Font file variants (weights/styles) for each font family
export const customFontVariants = pgTable("custom_font_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customFontId: varchar("custom_font_id").references(() => customFonts.id).notNull(),
  fileUrl: text("file_url").notNull(), // URL to the font file
  format: varchar("format", { length: 20 }).notNull(), // "woff2", "woff", "truetype", "opentype"
  weight: integer("weight").default(400), // 100-900
  style: varchar("style", { length: 20 }).default("normal"), // "normal" or "italic"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("custom_font_variants_font_idx").on(table.customFontId),
]);

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
  translations: many(eventTranslations),
}));

export const eventTranslationsRelations = relations(eventTranslations, ({ one }) => ({
  organization: one(organizations, { fields: [eventTranslations.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [eventTranslations.eventId], references: [events.id] }),
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

// Engagement Moments - Live engagement layer for events
export const moments = pgTable("moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id),
  type: varchar("type", { length: 50 }).notNull(), // poll_single, poll_multi, rating, open_text, qa, pulse, cta
  title: varchar("title", { length: 255 }).notNull(),
  prompt: text("prompt"),
  optionsJson: jsonb("options_json"), // Array of options for polls, or config for other types
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, live, locked, ended
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  showResults: boolean("show_results").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const momentResponses = pgTable("moment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  momentId: varchar("moment_id").references(() => moments.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  payloadJson: jsonb("payload_json").notNull(), // Response data (selected option, text, rating, etc.)
  metadataJson: jsonb("metadata_json"), // Device info, user agent, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const engagementSignals = pgTable("engagement_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  engaged: boolean("engaged").default(false),
  engagementScore: integer("engagement_score").default(0),
  highIntent: boolean("high_intent").default(false),
  lastEngagedAt: timestamp("last_engaged_at"),
  signalSummaryJson: jsonb("signal_summary_json"), // Breakdown of engagement by type
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Leads - Capturing leads at events via QR scan or manual entry
export const eventLeads = pgTable("event_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sponsorId: varchar("sponsor_id").references(() => eventSponsors.id), // Link to sponsor if captured by sponsor
  capturedByUserId: varchar("captured_by_user_id").references(() => users.id),
  capturedBySponsorContactId: varchar("captured_by_sponsor_contact_id").references(() => sponsorContacts.id), // Sponsor contact who captured
  captureMethod: varchar("capture_method", { length: 50 }), // 'qr_scan' or 'manual'
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  jobTitle: varchar("job_title", { length: 255 }),
  notes: text("notes"),
  tags: text("tags").array(),
  attendeeId: varchar("attendee_id").references(() => attendees.id), // Link if converted to attendee
  sourceCode: varchar("source_code", { length: 50 }), // QR code if scanned
  createdAt: timestamp("created_at").defaultNow(),
});

// Session Check-Ins - Tracking session attendance via QR scan or manual entry
export const sessionCheckIns = pgTable("session_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  sessionId: varchar("session_id").references(() => eventSessions.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  scannedByUserId: varchar("scanned_by_user_id").references(() => users.id),
  checkInMethod: varchar("check_in_method", { length: 50 }), // 'qr_scan' or 'manual'
  sourceCode: varchar("source_code", { length: 50 }), // The code that was scanned
  checkedInAt: timestamp("checked_in_at").defaultNow(),
}, (table) => [
  uniqueIndex("session_check_ins_session_attendee_idx").on(table.sessionId, table.attendeeId),
]);

// Product Interaction Types - for demo/booth conversation classification
export const INTERACTION_TYPES = [
  'product_demo',
  'technical_deep_dive',
  'pricing_packaging',
  'integration_security',
  'executive_conversation',
  'other',
] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];

// Product Interaction Outcomes
export const INTERACTION_OUTCOMES = [
  'requested_follow_up',
  'asked_for_pricing',
  'wants_trial_pilot',
  'intro_to_stakeholder',
  'not_a_fit',
  'too_early',
  'other',
] as const;
export type InteractionOutcome = typeof INTERACTION_OUTCOMES[number];

// Product Interaction Opportunity Potential buckets
export const OPPORTUNITY_POTENTIALS = [
  'under_10k',
  '10k_to_50k',
  '50k_to_100k',
  'over_100k',
] as const;
export type OpportunityPotential = typeof OPPORTUNITY_POTENTIALS[number];

// Product Interaction Next Steps
export const INTERACTION_NEXT_STEPS = [
  'schedule_meeting',
  'send_deck_recap',
  'connect_to_ae',
  'invite_to_private_session',
  'follow_up_after_event',
  'no_action',
] as const;
export type InteractionNextStep = typeof INTERACTION_NEXT_STEPS[number];

// Product Interaction Intent Levels (per-interaction metric)
export const INTENT_LEVELS = [
  'low',
  'medium',
  'high',
] as const;
export type IntentLevel = typeof INTENT_LEVELS[number];

// Intent Explanation - narrative layer for intent scoring (computed from all interactions + meetings)
export interface IntentExplanationContraSignal {
  type: 'not_a_fit' | 'too_early' | 'other';
  scope: 'product_interaction' | 'meeting';
  context: string;
  createdAt: string;
  weight: 'local_only';
  note: string;
}

export interface IntentExplanationTotals {
  total_interactions_count: number;
  last_interaction_date: string;
  momentum_score: number;
  highest_intent_level_seen: IntentLevel | null;
  most_recent_outcome: string | null;
  max_opportunity_bucket_seen: OpportunityPotential | null;
}

export interface IntentExplanation {
  primary_reasons: string[];
  supporting_signals: string[];
  contra_signals: IntentExplanationContraSignal[];
  totals: IntentExplanationTotals;
  context?: string;
}

// Product Interaction Tags
export const INTERACTION_TAGS = [
  'icp_fit',
  'competitor_mentioned',
  'security_review',
  'budget_confirmed',
  'buying_committee',
  'urgent_timeline',
  'partner_motion',
  'other',
] as const;
export type InteractionTag = typeof INTERACTION_TAGS[number];

// Product Interaction Capture Methods
export const INTERACTION_CAPTURE_METHODS = [
  'qr_scan',
  'manual',
  'lookup',
] as const;
export type InteractionCaptureMethod = typeof INTERACTION_CAPTURE_METHODS[number];

// Product Interaction Stations
export const INTERACTION_STATIONS = [
  'main_demo_station',
  'booth',
  'vip_lounge',
  'breakout_room',
  'other',
] as const;
export type InteractionStation = typeof INTERACTION_STATIONS[number];

// Product Interactions - Capturing intent from demo/product conversations
export const productInteractions = pgTable("product_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id), // Nullable - allow unmatched
  // Unmatched attendee info (when attendeeId is null)
  unmatchedEmail: varchar("unmatched_email", { length: 255 }),
  unmatchedFirstName: varchar("unmatched_first_name", { length: 100 }),
  unmatchedLastName: varchar("unmatched_last_name", { length: 100 }),
  unmatchedCompany: varchar("unmatched_company", { length: 255 }),
  unmatchedJobTitle: varchar("unmatched_job_title", { length: 255 }),
  // Capture metadata
  capturedByUserId: varchar("captured_by_user_id").references(() => users.id),
  captureMethod: varchar("capture_method", { length: 50 }), // 'qr_scan', 'manual', 'lookup'
  sourceCode: varchar("source_code", { length: 50 }), // QR/badge code if scanned
  // Interaction signal fields
  interactionType: varchar("interaction_type", { length: 50 }).notNull(), // InteractionType
  intentLevel: varchar("intent_level", { length: 20 }).notNull(), // 'low', 'medium', 'high'
  outcome: varchar("outcome", { length: 50 }).notNull(), // InteractionOutcome
  opportunityPotential: varchar("opportunity_potential", { length: 20 }), // OpportunityPotential
  nextStep: varchar("next_step", { length: 50 }), // InteractionNextStep
  notes: text("notes"),
  tags: text("tags").array(), // InteractionTag[]
  station: varchar("station", { length: 50 }), // InteractionStation
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("product_interactions_event_idx").on(table.eventId),
  index("product_interactions_attendee_idx").on(table.attendeeId),
  index("product_interactions_event_created_idx").on(table.eventId, table.createdAt),
  index("product_interactions_event_intent_idx").on(table.eventId, table.intentLevel),
  index("product_interactions_captured_by_idx").on(table.capturedByUserId),
]);

export const insertProductInteractionSchema = createInsertSchema(productInteractions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductInteraction = z.infer<typeof insertProductInteractionSchema>;
export type ProductInteraction = typeof productInteractions.$inferSelect;

// Product Interactions relations
export const productInteractionsRelations = relations(productInteractions, ({ one }) => ({
  organization: one(organizations, { fields: [productInteractions.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [productInteractions.eventId], references: [events.id] }),
  attendee: one(attendees, { fields: [productInteractions.attendeeId], references: [attendees.id] }),
  capturedByUser: one(users, { fields: [productInteractions.capturedByUserId], references: [users.id] }),
}));

// Demo Stations - Managing demo stations at events
export const demoStations = pgTable("demo_stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  stationName: varchar("station_name", { length: 100 }).notNull(),
  productFocus: text("product_focus").array(),
  stationPresenter: varchar("station_presenter", { length: 255 }),
  stationLocation: varchar("station_location", { length: 100 }).notNull(),
  activeProgramId: varchar("active_program_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("demo_stations_org_idx").on(table.organizationId),
  index("demo_stations_event_idx").on(table.eventId),
]);

export const insertDemoStationSchema = createInsertSchema(demoStations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDemoStation = z.infer<typeof insertDemoStationSchema>;
export type DemoStation = typeof demoStations.$inferSelect;

// Demo Stations relations
export const demoStationsRelations = relations(demoStations, ({ one }) => ({
  organization: one(organizations, { fields: [demoStations.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [demoStations.eventId], references: [events.id] }),
}));

// API Key scopes for external integrations
export const API_KEY_SCOPES = [
  'events.read',       // Read event information
  'attendees.read',    // Read attendee data
  'leads.read',        // Read lead data
  'sessions.read',     // Read session/agenda data
  'speakers.read',     // Read speaker data
  'analytics.read',    // Read analytics data
  'sponsors.read',     // Read sponsor data
  'checkin.write',     // Check in attendees (for badge printing integrations)
] as const;

export type ApiKeyScope = typeof API_KEY_SCOPES[number];

// API Keys table - for external application access
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(), // First 8 chars of key for identification
  hashedSecret: varchar("hashed_secret", { length: 255 }).notNull(), // Argon2 hash of full key
  scopes: text("scopes").array().notNull(), // Array of API_KEY_SCOPES
  status: varchar("status", { length: 20 }).default("active").notNull(), // 'active', 'paused', 'revoked'
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  rateLimitPerDay: integer("rate_limit_per_day").default(10000),
  expiresAt: timestamp("expires_at"), // Optional expiration
  lastUsedAt: timestamp("last_used_at"),
  lastRotatedAt: timestamp("last_rotated_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("api_keys_org_idx").on(table.organizationId),
  index("api_keys_prefix_idx").on(table.keyPrefix),
]);

// API Key Audit Logs - track usage of each key
export const apiKeyAuditLogs = pgTable("api_key_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  route: varchar("route", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code").notNull(),
  ipHash: varchar("ip_hash", { length: 64 }), // Hashed IP for privacy
  userAgent: varchar("user_agent", { length: 500 }),
  latencyMs: integer("latency_ms"),
  metadata: jsonb("metadata"), // Additional context
}, (table) => [
  index("api_key_audit_key_idx").on(table.apiKeyId),
  index("api_key_audit_occurred_idx").on(table.occurredAt),
]);

// API Keys relations
export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  organization: one(organizations, { fields: [apiKeys.organizationId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [apiKeys.createdBy], references: [users.id] }),
  auditLogs: many(apiKeyAuditLogs),
}));

export const apiKeyAuditLogsRelations = relations(apiKeyAuditLogs, ({ one }) => ({
  apiKey: one(apiKeys, { fields: [apiKeyAuditLogs.apiKeyId], references: [apiKeys.id] }),
  organization: one(organizations, { fields: [apiKeyAuditLogs.organizationId], references: [organizations.id] }),
}));

// Super Admin Audit Logs - track super admin actions across organizations
export const superAdminAuditLogs = pgTable("super_admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  superAdminUserId: varchar("super_admin_user_id").references(() => users.id).notNull(),
  superAdminEmail: varchar("super_admin_email", { length: 255 }).notNull(),
  actedOrganizationId: varchar("acted_organization_id").references(() => organizations.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("super_admin_audit_user_idx").on(table.superAdminUserId),
  index("super_admin_audit_org_idx").on(table.actedOrganizationId),
  index("super_admin_audit_created_idx").on(table.createdAt),
]);

export const superAdminAuditLogsRelations = relations(superAdminAuditLogs, ({ one }) => ({
  superAdmin: one(users, { fields: [superAdminAuditLogs.superAdminUserId], references: [users.id] }),
  organization: one(organizations, { fields: [superAdminAuditLogs.actedOrganizationId], references: [organizations.id] }),
}));

// Attendee Connections - networking connections between attendees
export const attendeeConnections = pgTable("attendee_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  requesterId: varchar("requester_id").references(() => attendees.id).notNull(),
  targetId: varchar("target_id").references(() => attendees.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'accepted', 'declined'
  message: text("message"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("attendee_connections_event_idx").on(table.eventId),
  index("attendee_connections_requester_idx").on(table.requesterId),
  index("attendee_connections_target_idx").on(table.targetId),
  uniqueIndex("attendee_connections_unique").on(table.eventId, table.requesterId, table.targetId),
]);

// Attendee Availability Slots - time slots when attendees are available for meetings
export const attendeeAvailabilitySlots = pgTable("attendee_availability_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  attendeeId: varchar("attendee_id").references(() => attendees.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isBooked: boolean("is_booked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("availability_slots_event_idx").on(table.eventId),
  index("availability_slots_attendee_idx").on(table.attendeeId),
]);

// Meeting Intent Types - for pre-meeting goal capture
export const MEETING_INTENT_TYPES = [
  'exploring_solution',
  'evaluating_fit',
  'existing_customer',
  'partner_discussion',
  'executive_introduction',
  'networking',
] as const;

export type MeetingIntentType = typeof MEETING_INTENT_TYPES[number];

// Meeting Outcome Types - for post-meeting capture (internal only)
export const MEETING_OUTCOME_TYPES = [
  'no_fit',
  'early_interest',
  'active_opportunity',
  'follow_up_scheduled',
  'deal_in_progress',
] as const;

export type MeetingOutcomeType = typeof MEETING_OUTCOME_TYPES[number];

// Outcome Confidence Levels - how strong was the buying signal in the meeting
export const OUTCOME_CONFIDENCE_LEVELS = [
  'low',
  'medium',
  'high',
] as const;

export type OutcomeConfidenceLevel = typeof OUTCOME_CONFIDENCE_LEVELS[number];

// Contact Intent Status - for promotion from meetings/engagements
export const CONTACT_INTENT_STATUS = [
  'none',
  'engaged',
  'high_intent',
  'hot_lead',
] as const;
export type ContactIntentStatus = typeof CONTACT_INTENT_STATUS[number];

// Deal Range Types
export const DEAL_RANGE_TYPES = [
  'under_25k',
  '25k_to_100k',
  'over_100k',
] as const;

export type DealRangeType = typeof DEAL_RANGE_TYPES[number];

// Timeline Types
export const TIMELINE_TYPES = [
  'now',
  'this_quarter',
  'later',
] as const;

export type TimelineType = typeof TIMELINE_TYPES[number];

// Intent Strength Types (system-computed)
export const INTENT_STRENGTH_TYPES = [
  'low',
  'medium',
  'high',
] as const;

export type IntentStrengthType = typeof INTENT_STRENGTH_TYPES[number];

// Attendee Meetings - scheduled 1:1 meetings between attendees with intent and outcome capture
export const attendeeMeetings = pgTable("attendee_meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  requesterId: varchar("requester_id").references(() => attendees.id), // Nullable for internal/portal meetings
  inviteeId: varchar("invitee_id").references(() => attendees.id).notNull(),
  slotId: varchar("slot_id").references(() => attendeeAvailabilitySlots.id),
  startTime: timestamp("start_time"), // Nullable - may not be scheduled yet
  endTime: timestamp("end_time"), // Nullable - may not be scheduled yet
  location: varchar("location", { length: 255 }),
  virtualLink: text("virtual_link"),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'accepted', 'declined', 'cancelled', 'completed'
  message: text("message"),
  declineReason: text("decline_reason"),
  respondedAt: timestamp("responded_at"),
  
  // Meeting Intent (Pre-Meeting) - Required when requesting
  intentType: varchar("intent_type", { length: 50 }), // MeetingIntentType
  
  // Meeting Outcome (Post-Meeting - Internal Only)
  outcomeType: varchar("outcome_type", { length: 50 }), // MeetingOutcomeType
  dealRange: varchar("deal_range", { length: 20 }), // DealRangeType
  timeline: varchar("timeline", { length: 20 }), // TimelineType
  outcomeNotes: text("outcome_notes"),
  outcomeConfidence: varchar("outcome_confidence", { length: 10 }), // OutcomeConfidenceLevel - how strong was the buying signal
  outcomeCapturedAt: timestamp("outcome_captured_at"),
  outcomeCapturedBy: varchar("outcome_captured_by").references(() => users.id),
  
  // Intent Strength (System-Computed)
  intentStrength: varchar("intent_strength", { length: 10 }), // IntentStrengthType
  
  // Attribution Fields
  activationLinkId: varchar("activation_link_id").references(() => activationLinks.id),
  packageId: varchar("package_id").references(() => packages.id),
  
  // Internal meeting flag (internal team member initiated)
  isInternalMeeting: boolean("is_internal_meeting").default(false),
  internalHostUserId: varchar("internal_host_user_id").references(() => users.id),
  
  // Meeting portal member who created this meeting (for non-admin employees)
  meetingPortalMemberId: varchar("meeting_portal_member_id"),
  
  // Room assignment for this meeting
  roomId: varchar("room_id").references(() => sessionRooms.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("attendee_meetings_event_idx").on(table.eventId),
  index("attendee_meetings_requester_idx").on(table.requesterId),
  index("attendee_meetings_invitee_idx").on(table.inviteeId),
  index("attendee_meetings_intent_idx").on(table.intentType),
  index("attendee_meetings_outcome_idx").on(table.outcomeType),
  index("attendee_meetings_portal_member_idx").on(table.meetingPortalMemberId),
  index("attendee_meetings_room_idx").on(table.roomId),
]);

// Meeting Portal Members - non-admin employees who can request meetings via portal
export const MEETING_PORTAL_PERMISSIONS = {
  REQUEST_MEETINGS: 'request_meetings',
  VIEW_ATTENDEES: 'view_attendees',
  CAPTURE_OUTCOMES: 'capture_outcomes',
} as const;

export type MeetingPortalPermission = typeof MEETING_PORTAL_PERMISSIONS[keyof typeof MEETING_PORTAL_PERMISSIONS];

export const meetingPortalMembers = pgTable("meeting_portal_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  permissions: text("permissions").array(), // Array of MeetingPortalPermission keys
  portalAccessToken: varchar("portal_access_token", { length: 255 }),
  portalTokenExpiresAt: timestamp("portal_token_expires_at"),
  magicLinkToken: varchar("magic_link_token", { length: 255 }),
  magicLinkExpiresAt: timestamp("magic_link_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  invitedBy: varchar("invited_by").references(() => users.id), // Admin user who invited
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("meeting_portal_members_org_idx").on(table.organizationId),
  index("meeting_portal_members_event_idx").on(table.eventId),
  index("meeting_portal_members_email_idx").on(table.email),
  index("meeting_portal_members_token_idx").on(table.portalAccessToken),
  index("meeting_portal_members_magic_link_idx").on(table.magicLinkToken),
]);

// Meeting Portal Invitations - pending invitations for non-admin employees
export const meetingPortalInvitations = pgTable("meeting_portal_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  eventId: varchar("event_id").references(() => events.id).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  permissions: text("permissions").array(), // Permissions to grant when accepted
  inviteCode: varchar("invite_code", { length: 64 }).unique().notNull(),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(), // Admin user who invited
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'accepted', 'expired', 'revoked'
  expiresAt: timestamp("expires_at"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => meetingPortalMembers.id),
});

// Meeting Portal Members relations
export const meetingPortalMembersRelations = relations(meetingPortalMembers, ({ one, many }) => ({
  organization: one(organizations, { fields: [meetingPortalMembers.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [meetingPortalMembers.eventId], references: [events.id] }),
  invitedByUser: one(users, { fields: [meetingPortalMembers.invitedBy], references: [users.id] }),
}));

export const meetingPortalInvitationsRelations = relations(meetingPortalInvitations, ({ one }) => ({
  organization: one(organizations, { fields: [meetingPortalInvitations.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [meetingPortalInvitations.eventId], references: [events.id] }),
  invitedByUser: one(users, { fields: [meetingPortalInvitations.invitedBy], references: [users.id] }),
  acceptedByMember: one(meetingPortalMembers, { fields: [meetingPortalInvitations.acceptedBy], references: [meetingPortalMembers.id] }),
}));

// Networking relations
export const attendeeConnectionsRelations = relations(attendeeConnections, ({ one }) => ({
  organization: one(organizations, { fields: [attendeeConnections.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [attendeeConnections.eventId], references: [events.id] }),
  requester: one(attendees, { fields: [attendeeConnections.requesterId], references: [attendees.id] }),
  target: one(attendees, { fields: [attendeeConnections.targetId], references: [attendees.id] }),
}));

export const attendeeAvailabilitySlotsRelations = relations(attendeeAvailabilitySlots, ({ one }) => ({
  organization: one(organizations, { fields: [attendeeAvailabilitySlots.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [attendeeAvailabilitySlots.eventId], references: [events.id] }),
  attendee: one(attendees, { fields: [attendeeAvailabilitySlots.attendeeId], references: [attendees.id] }),
}));

export const attendeeMeetingsRelations = relations(attendeeMeetings, ({ one }) => ({
  organization: one(organizations, { fields: [attendeeMeetings.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [attendeeMeetings.eventId], references: [events.id] }),
  requester: one(attendees, { fields: [attendeeMeetings.requesterId], references: [attendees.id] }),
  invitee: one(attendees, { fields: [attendeeMeetings.inviteeId], references: [attendees.id] }),
  slot: one(attendeeAvailabilitySlots, { fields: [attendeeMeetings.slotId], references: [attendeeAvailabilitySlots.id] }),
  outcomeCapturedByUser: one(users, { fields: [attendeeMeetings.outcomeCapturedBy], references: [users.id] }),
  internalHost: one(users, { fields: [attendeeMeetings.internalHostUserId], references: [users.id] }),
  activationLink: one(activationLinks, { fields: [attendeeMeetings.activationLinkId], references: [activationLinks.id] }),
  package: one(packages, { fields: [attendeeMeetings.packageId], references: [packages.id] }),
}));

// Moments relations
export const momentsRelations = relations(moments, ({ one, many }) => ({
  organization: one(organizations, { fields: [moments.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [moments.eventId], references: [events.id] }),
  session: one(eventSessions, { fields: [moments.sessionId], references: [eventSessions.id] }),
  createdByUser: one(users, { fields: [moments.createdBy], references: [users.id] }),
  responses: many(momentResponses),
}));

export const momentResponsesRelations = relations(momentResponses, ({ one }) => ({
  moment: one(moments, { fields: [momentResponses.momentId], references: [moments.id] }),
  organization: one(organizations, { fields: [momentResponses.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [momentResponses.eventId], references: [events.id] }),
  session: one(eventSessions, { fields: [momentResponses.sessionId], references: [eventSessions.id] }),
  attendee: one(attendees, { fields: [momentResponses.attendeeId], references: [attendees.id] }),
}));

export const engagementSignalsRelations = relations(engagementSignals, ({ one }) => ({
  organization: one(organizations, { fields: [engagementSignals.organizationId], references: [organizations.id] }),
  event: one(events, { fields: [engagementSignals.eventId], references: [events.id] }),
  session: one(eventSessions, { fields: [engagementSignals.sessionId], references: [eventSessions.id] }),
  attendee: one(attendees, { fields: [engagementSignals.attendeeId], references: [attendees.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({ id: true, invitedAt: true, acceptedAt: true, acceptedBy: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIntentRecomputeHistorySchema = createInsertSchema(intentRecomputeHistory).omit({ id: true, recomputedAt: true });
export const insertAttendeeSchema = createInsertSchema(attendees).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  passwordHash: z.string().optional().nullable(),
});
export const insertSpeakerSchema = createInsertSchema(speakers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(eventSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSpeakerSchema = createInsertSchema(sessionSpeakers).omit({ id: true });
export const insertSessionTrackSchema = createInsertSchema(sessionTracks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionRoomSchema = createInsertSchema(sessionRooms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoomOpenHoursSchema = createInsertSchema(roomOpenHours).omit({ id: true, createdAt: true });
export const insertMemberRoomAssignmentSchema = createInsertSchema(memberRoomAssignments).omit({ id: true, createdAt: true });
export const insertSessionTopicSchema = createInsertSchema(sessionTopics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendeeSavedSessionSchema = createInsertSchema(attendeeSavedSessions).omit({ id: true, createdAt: true });
export const insertAttendeeInterestsSchema = createInsertSchema(attendeeInterests).omit({ id: true, updatedAt: true });
export const insertSessionFeedbackSchema = createInsertSchema(sessionFeedback).omit({ id: true, createdAt: true });
export const insertEventFeedbackSchema = createInsertSchema(eventFeedback).omit({ id: true, createdAt: true });
export const insertFeedbackConfigSchema = createInsertSchema(feedbackConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({ id: true });
export const insertBudgetOffsetSchema = createInsertSchema(budgetOffsets).omit({ id: true });
export const insertEventBudgetSettingsSchema = createInsertSchema(eventBudgetSettings).omit({ id: true });
export const insertBudgetPaymentSchema = createInsertSchema(budgetPayments).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliverableSchema = createInsertSchema(deliverables).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  executionTime: z.union([
    z.date(),
    z.string().transform(s => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }),
    z.null()
  ]).optional().nullable(),
});
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  scheduledAt: z.union([z.date(), z.string().transform(s => new Date(s))]).optional().nullable(),
});
export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  scheduledAt: z.union([z.date(), z.string().transform(s => new Date(s))]).optional().nullable(),
});
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailTemplateLibrarySchema = createInsertSchema(emailTemplateLibrary).omit({ id: true, createdAt: true, updatedAt: true });
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
export const insertEventCustomFieldSettingSchema = createInsertSchema(eventCustomFieldSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentAssetSchema = createInsertSchema(contentAssets).omit({ id: true, createdAt: true });
export const insertEventSponsorSchema = createInsertSchema(eventSponsors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSponsorContactSchema = createInsertSchema(sponsorContacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSponsorContactInvitationSchema = createInsertSchema(sponsorContactInvitations).omit({ id: true, invitedAt: true, acceptedAt: true, acceptedBy: true });
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
export const insertCustomFontSchema = createInsertSchema(customFonts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFontVariantSchema = createInsertSchema(customFontVariants).omit({ id: true, createdAt: true });
export const insertMomentSchema = createInsertSchema(moments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMomentResponseSchema = createInsertSchema(momentResponses).omit({ id: true, createdAt: true });
export const insertEngagementSignalSchema = createInsertSchema(engagementSignals).omit({ id: true, updatedAt: true });
export const insertEventLeadSchema = createInsertSchema(eventLeads).omit({ id: true, createdAt: true });
export const insertSessionCheckInSchema = createInsertSchema(sessionCheckIns).omit({ id: true, checkedInAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, updatedAt: true, lastUsedAt: true, lastRotatedAt: true });
export const insertApiKeyAuditLogSchema = createInsertSchema(apiKeyAuditLogs).omit({ id: true, occurredAt: true });
export const insertSuperAdminAuditLogSchema = createInsertSchema(superAdminAuditLogs).omit({ id: true, createdAt: true });
export const insertAttendeeConnectionSchema = createInsertSchema(attendeeConnections).omit({ id: true, createdAt: true, respondedAt: true });
export const insertAttendeeAvailabilitySlotSchema = createInsertSchema(attendeeAvailabilitySlots).omit({ id: true, createdAt: true });
export const insertAttendeeMeetingSchema = createInsertSchema(attendeeMeetings).omit({ id: true, createdAt: true, updatedAt: true, respondedAt: true });
export const insertMeetingPortalMemberSchema = createInsertSchema(meetingPortalMembers).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const insertMeetingPortalInvitationSchema = createInsertSchema(meetingPortalInvitations).omit({ id: true, invitedAt: true, acceptedAt: true });

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
export type InsertIntentRecomputeHistory = z.infer<typeof insertIntentRecomputeHistorySchema>;
export type IntentRecomputeHistory = typeof intentRecomputeHistory.$inferSelect;
export const insertEventTranslationSchema = createInsertSchema(eventTranslations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEventTranslation = z.infer<typeof insertEventTranslationSchema>;
export type EventTranslation = typeof eventTranslations.$inferSelect;
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
export type InsertRoomOpenHours = z.infer<typeof insertRoomOpenHoursSchema>;
export type RoomOpenHours = typeof roomOpenHours.$inferSelect;
export type InsertMemberRoomAssignment = z.infer<typeof insertMemberRoomAssignmentSchema>;
export type MemberRoomAssignment = typeof memberRoomAssignments.$inferSelect;
export type InsertSessionTopic = z.infer<typeof insertSessionTopicSchema>;
export type SessionTopic = typeof sessionTopics.$inferSelect;
export type InsertAttendeeSavedSession = z.infer<typeof insertAttendeeSavedSessionSchema>;
export type AttendeeSavedSession = typeof attendeeSavedSessions.$inferSelect;
export type InsertAttendeeInterests = z.infer<typeof insertAttendeeInterestsSchema>;
export type AttendeeInterests = typeof attendeeInterests.$inferSelect;
export type InsertSessionFeedback = z.infer<typeof insertSessionFeedbackSchema>;
export type SessionFeedback = typeof sessionFeedback.$inferSelect;
export type InsertEventFeedback = z.infer<typeof insertEventFeedbackSchema>;
export type EventFeedback = typeof eventFeedback.$inferSelect;
export type InsertFeedbackConfig = z.infer<typeof insertFeedbackConfigSchema>;
export type FeedbackConfig = typeof feedbackConfigs.$inferSelect;
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
export type InsertEmailTemplateLibrary = z.infer<typeof insertEmailTemplateLibrarySchema>;
export type EmailTemplateLibrary = typeof emailTemplateLibrary.$inferSelect;
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
export type InsertEventCustomFieldSetting = z.infer<typeof insertEventCustomFieldSettingSchema>;
export type EventCustomFieldSetting = typeof eventCustomFieldSettings.$inferSelect;
export type InsertContentAsset = z.infer<typeof insertContentAssetSchema>;
export type ContentAsset = typeof contentAssets.$inferSelect;
export type InsertEventSponsor = z.infer<typeof insertEventSponsorSchema>;
export type EventSponsor = typeof eventSponsors.$inferSelect;
export type InsertSponsorContact = z.infer<typeof insertSponsorContactSchema>;
export type SponsorContact = typeof sponsorContacts.$inferSelect;
export type InsertSponsorContactInvitation = z.infer<typeof insertSponsorContactInvitationSchema>;
export type SponsorContactInvitation = typeof sponsorContactInvitations.$inferSelect;
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
export type InsertCustomFont = z.infer<typeof insertCustomFontSchema>;
export type CustomFont = typeof customFonts.$inferSelect;
export type InsertCustomFontVariant = z.infer<typeof insertCustomFontVariantSchema>;
export type CustomFontVariant = typeof customFontVariants.$inferSelect;
export type InsertMarketingLead = z.infer<typeof insertMarketingLeadSchema>;
export type MarketingLead = typeof marketingLeads.$inferSelect;
export type InsertMarketingActivationLink = z.infer<typeof insertMarketingActivationLinkSchema>;
export type MarketingActivationLink = typeof marketingActivationLinks.$inferSelect;
export type InsertMarketingLinkClick = z.infer<typeof insertMarketingLinkClickSchema>;
export type MarketingLinkClick = typeof marketingLinkClicks.$inferSelect;
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof moments.$inferSelect;
export type InsertMomentResponse = z.infer<typeof insertMomentResponseSchema>;
export type MomentResponse = typeof momentResponses.$inferSelect;
export type InsertEngagementSignal = z.infer<typeof insertEngagementSignalSchema>;
export type EngagementSignal = typeof engagementSignals.$inferSelect;
export type InsertEventLead = z.infer<typeof insertEventLeadSchema>;
export type EventLead = typeof eventLeads.$inferSelect;
export type InsertSessionCheckIn = z.infer<typeof insertSessionCheckInSchema>;
export type SessionCheckIn = typeof sessionCheckIns.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKeyAuditLog = z.infer<typeof insertApiKeyAuditLogSchema>;
export type ApiKeyAuditLog = typeof apiKeyAuditLogs.$inferSelect;
export type InsertSuperAdminAuditLog = z.infer<typeof insertSuperAdminAuditLogSchema>;
export type SuperAdminAuditLog = typeof superAdminAuditLogs.$inferSelect;
export type InsertAttendeeConnection = z.infer<typeof insertAttendeeConnectionSchema>;
export type AttendeeConnection = typeof attendeeConnections.$inferSelect;
export type InsertAttendeeAvailabilitySlot = z.infer<typeof insertAttendeeAvailabilitySlotSchema>;
export type AttendeeAvailabilitySlot = typeof attendeeAvailabilitySlots.$inferSelect;
export type InsertAttendeeMeeting = z.infer<typeof insertAttendeeMeetingSchema>;
export type AttendeeMeeting = typeof attendeeMeetings.$inferSelect;
export type InsertMeetingPortalMember = z.infer<typeof insertMeetingPortalMemberSchema>;
export type MeetingPortalMember = typeof meetingPortalMembers.$inferSelect;
export type InsertMeetingPortalInvitation = z.infer<typeof insertMeetingPortalInvitationSchema>;
export type MeetingPortalInvitation = typeof meetingPortalInvitations.$inferSelect;

# Event Management CMS

## Overview
This Event Management CMS is a full-stack administrative platform for comprehensive event management. It enables organizations to manage events, attendees, speakers, sessions, content, budgets, deliverables, and marketing campaigns. The system prioritizes efficiency and clarity with a utility-focused, information-dense design, supporting multi-tenancy with data isolation per organization and automatic user-to-organization assignment. Its key capabilities include registration tracking, agenda building, speaker management, budget monitoring, integrated communication tools, and a visual site builder for custom public event pages. The platform aims to provide a robust solution for diverse event management needs, from small gatherings to large-scale conferences.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state), React hooks (local state)
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with CSS custom properties (light/dark mode)
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Style**: RESTful JSON API (`/api` prefix)
- **Session Management**: Express-session with PostgreSQL store

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod
- **Schema**: `shared/schema.ts`
- **Migrations**: Drizzle Kit

### Project Structure
- `client/`: React frontend
- `server/`: Express backend
- `shared/`: Shared code (e.g., database schema)
- `migrations/`: Database migrations

### Key Design Patterns
- **Multi-Tenancy**: Data isolated by `organizationId` with a `getOrganizationId` helper.
- **Storage Interface**: Abstracted database operations (`IStorage`) with organization-scoped access.
- **Shared Schema**: Single source of truth for database types.
- **API Request Helper**: Centralized function for API calls with error handling.
- **Component Composition**: Reusable UI components for consistent design. Marketing pages (landing, pricing, blog, book-demo, signup) share a unified `MarketingHeader` component (`client/src/components/marketing-header.tsx`) with Sandbox-GTM branding, responsive hamburger menu, and consistent navigation.
- **Cascade Delete**: Event deletion follows strict FK dependency order - child tables must be deleted before parent tables. Key dependencies:
  - Tables referencing `attendees`: activationLinkClicks, engagementSignals, momentResponses, emailMessages, attendeeSavedSessions, attendeeInterests, sessionFeedback, eventFeedback, passkeyReservations
  - Tables referencing `eventSessions`: sessionSpeakers, attendeeSavedSessions, sessionFeedback, contentItems, cfpSubmissions, moments, momentResponses, engagementSignals
  - Tables referencing `eventSponsors`: sponsorContacts, contentAssets, sponsorTaskCompletions
  - Tables referencing `activationLinks`: activationLinkClicks
  - When adding new tables with FK references, update `deleteEvent` in storage.ts accordingly.

### Feature Specifications
- **Site Builder**: Visual page builder for custom public-facing event pages (Landing, Registration, Portal) with configurable sections including "Layout Columns".
- **Invite Codes & Package Visibility**: Support for invite codes, discounts, and public/code-only package access.
- **Email Management**: Reusable email templates with merge tags, test functionality, and comprehensive analytics (open, click, unsubscribe tracking). Includes automatic `registrationStatus` update to "invited" for successfully delivered invite emails.
- **Media Library**: Hosts images (via Replit Object Storage) with upload, public URL generation, and deletion.
- **Call for Papers (CFP)**: System for collecting, reviewing, and managing paper/abstract submissions.
- **Email Marketing Platform Integrations**: Connect external platforms (e.g., Mailchimp) for attendee data sync.
- **Passkey (Cvent) Housing Integration**: RegLink Basic integration for hotel room block management with pre-filled booking links.
- **Document Workspace**: Secure document sharing with folder organization, file upload, permission-based sharing, threaded comments, approval workflows, and activity logging.
- **Activation Links**: Trackable campaign URLs for marketing attribution with short codes, UTM parameters, and conversion analytics.
- **Enhanced Marketing Analytics**: Admin-level analytics for landing pages including User-Agent parsing, IP geolocation, returning visitor detection, and bot detection (privacy-friendly with visitor hashes).
- **Revenue & ROI Feature Toggle**: A bolt-on sidebar menu section (Pipeline Influence, Sales Handoff, Follow-Up Performance, ROI Reporting) that can be enabled/disabled per organization by super admins.
- **Attendee Preview (Spoof Mode)**: Organization owners can preview public-facing pages as a specific attendee, evaluating visibility conditions.
- **Custom Domain Support**: Organizations can configure custom domains for their event pages with DNS verification.
- **Multi-Language Support**: Event content translation into 10 supported languages, configurable per event, with locale detection and fallback mechanisms.
- **Personalized Schedules & Recommendations**: Attendees can save sessions, view personal schedules, configure interests, and receive AI-powered session recommendations.
- **Session & Event Feedback**: Comprehensive feedback collection system for sessions and overall event experience, including NPS, ratings, and comments.
- **NPS (Net Promoter Score) Analytics**: Integration of NPS calculation from event feedback into the GTM Overview dashboard.
- **Acquisition Milestone Status**: Dynamic status calculation (on_track, at_risk, behind, achieved, no_data) based on registration progress against milestones. Counts all non-cancelled registrations (confirmed, registered, checked_in, pending) to align with dashboard's "Total conversions" metric.
- **Engagement Moments with QR Codes**: Live engagement moments (polls, ratings, Q&A, pulse checks, CTAs) with dedicated moment pages (`/event/:slug/moment/:momentId` and `/portal/:eventId/moment/:momentId`) supporting QR code generation for instant audience participation.
- **API Key Management**: Secure API key system for external integrations with scrypt hashing, scope-based permissions (events.read, attendees.read, leads.read, sessions.read, speakers.read, analytics.read, sponsors.read), rate limiting per minute/day, audit logging, and owner-only access. Keys use prefix.secret format with one-time secret display. Authentication middleware (`server/apiAuth.ts`) supports Bearer token validation with timing-safe comparison.
- **Brand Kit**: Organization-level branding management that extracts colors, fonts, and logos from a company website using web scraping and AI-powered color palette suggestions. Stored in `brandKits` table with support for default kit selection and manual editing. Accessible via My Organization sidebar menu.
- **Event-Specific Custom Field Settings**: Per-event overrides for custom field configuration stored in `eventCustomFieldSettings` table. Allows events to customize field behavior (required, isActive, displayOrder, parentFieldId, parentTriggerValues) independently from organization-level defaults. Public registration forms automatically resolve and apply these per-event overrides.
- **Meeting Room Assignment System**: Assign rooms to team members (portal members or admin users) with open hours configuration. Features include: room open hours per day of week (stored in `roomOpenHours` table), member room assignments (`memberRoomAssignments` table linking rooms to users), double-booking prevention when a room is already occupied, smart room suggestions for users without assigned rooms, and automatic pre-selection of primary assigned rooms in meeting forms. Both admin and portal meeting creation validate room availability during the scheduled time.
- **Intent Recompute History & Follow-Up Readiness**: Delta tracking for intent recomputation with `intentRecomputeHistory` table storing before/after snapshots of Hot Leads, High-Intent, and Engaged (momentum-only) counts. Events track `lastIntentRecomputedAt` timestamp. UI displays a "Follow-Up Readiness" KPI (combined Hot Leads + High-Intent count) and a Changelog tab showing recompute history timeline with delta indicators.
- **Company Size Enrichment**: Automatic company size classification using Google Custom Search API to search D&B business directory. Classifies companies as SMB (<$50M revenue), Mid-Market ($50M-$1B), or Enterprise (>$1B). Auto-triggers on attendee creation (registration, manual, sponsor portal). Manual enrichment available via "Lookup Size" button. Data stored in `companySize`, `companyRevenue`, `companySizeEnrichedAt` fields. Requires `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_SEARCH_ENGINE_ID` environment variables.
- **The Sandbox (Thought Leadership Blog)**: Public-facing article pages at `/the-sandbox` (listing) and `/the-sandbox/:slug` (individual article). Old `/thought-leadership` URLs redirect to new paths. Manual article management via admin UI at `/admin/thought-leadership` (super-admin only). Public API endpoints: `GET /api/public/thought-leadership/articles` (list published), `GET /api/public/thought-leadership/articles/:slug` (single article). Admin API endpoints (authenticated, super-admin): `GET/POST /api/thought-leadership/articles`, `GET/PATCH/DELETE /api/thought-leadership/articles/:id`, `POST /api/thought-leadership/generate` (Byword AI generation). Articles upsert by slug, auto-calculate read time, and support HTML/Markdown content. Schema: `thoughtLeadershipArticles` table. Articles are auto-seeded on startup via `server/seed-articles.ts`.
- **Byword.ai Integration**: AI article generation via Byword API (`server/byword.ts`). Uses new cloud API at `cloud.byword.ai/api/projects/articles`. Two-step process: POST to create article → GET to poll for completion (~60s). Auth via Bearer token with `bw_live_` API key. Supports keyword mode (Byword generates title + article) and title mode (user provides title). Admin UI has "Generate with Byword" button with loading state. Requires `BYWORD_API_KEY` secret and `BYWORD_DOMAIN_ID` (or `BYWORD_DOMAIN`) env var.
- **Byword Webhook Receiver**: Webhook endpoint at `POST /api/webhooks/byword` (`server/byword-webhook.ts`) receives articles from Byword when generation completes. Supports `article.completed`, `article.published`, and `campaign.completed` events. Verifies HMAC SHA256 signatures (optional, via `BYWORD_WEBHOOK_SECRET` env var). Auto-saves articles to database via `upsertArticle`. Admin UI shows webhook URL with copy button via "Webhook" toggle in The Sandbox admin page.

### Deployment Strategy
Supports a hybrid multi-tenant (default) and dedicated instance model for enterprise customers, ensuring data isolation and flexible deployment options.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit OpenID Connect (OIDC) via Passport.js

### UI Libraries
- Radix UI
- Lucide React
- Embla Carousel
- Recharts
- date-fns

### Development Tools
- Vite
- ESBuild
- TSX
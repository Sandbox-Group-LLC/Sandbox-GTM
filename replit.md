# Event Management CMS

## Overview
This Event Management CMS is a full-stack administrative platform designed for comprehensive management of events. It enables organizations to handle events, attendees, speakers, sessions, content, budgets, deliverables, and marketing campaigns. The system prioritizes efficiency and clarity with a utility-focused, information-dense design. It supports multi-tenancy, isolating data per organization, with automatic user-to-organization assignment on first login. Key features include registration tracking, agenda building, speaker management, budget monitoring, and integrated communication tools.

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
- **Authentication**: Replit OpenID Connect (OIDC) via Passport.js

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

### Authentication
Uses Replit's OIDC, storing sessions in PostgreSQL and synchronizing user data. Routes are protected by authentication middleware.

### Multi-Tenancy
Data is isolated by `organizationId` across all tables. New users automatically get a default organization. A `getOrganizationId` helper resolves the active organization per request, and the frontend `useAuth()` hook provides organization context.

### Key Design Patterns
- **Storage Interface**: Abstracted database operations (`IStorage`) with organization-scoped access.
- **Shared Schema**: Single source of truth for database types.
- **API Request Helper**: Centralized function for API calls with error handling.
- **Component Composition**: Reusable UI components for consistent design.

### Feature Specifications
- **Badge/Tag Title Case Convention**: All dynamic badge and tag content uses `titleCase()` utility.
- **Breadcrumb Styling**: `Home > Parent Menu > Current Page` format with consistent `text-foreground` styling.
- **Event-Specific Package Overrides**: Global packages can be overridden per event with specific prices, features, and enabled status.
- **Site Builder**: Visual page builder for custom public-facing event pages (Landing, Registration, Portal) with configurable sections and publish workflow. Includes "Layout Columns" section type that allows nesting other sections inside 2-4 columns with customizable widths (equal, 1:2, 2:1, 1:2:1, etc.) and gaps.
- **Invite Codes**: Support for invite codes that unlock packages and apply percentage or fixed discounts.
- **Package Visibility**: Packages can be set as "Public" or "Code-Only" for controlled access during registration.
- **Email Templates**: Reusable templates with merge tags, header images, and test email functionality.
- **Media Library**: Hosts images (via Replit Object Storage) for use in templates, with upload, public URL generation, and deletion features.
- **Call for Papers (CFP)**: System for collecting, reviewing, and managing paper/abstract submissions, including admin configuration, public submission forms, and reviewer portals.
- **Email Analytics**: Comprehensive tracking for email campaigns including open tracking (via pixel), click tracking (wrapped links), and unsubscribe handling. Analytics dashboard shows campaign metrics (sent, delivered, opened, clicked, bounced, complained counts with rates). Individual attendee records display email activity history. Uses signed HMAC-SHA256 tokens for secure tracking endpoints and Resend webhook integration for delivery events.
- **Invite Email Tracking**: Email templates and campaigns can be marked as "invite emails" via a toggle. When an invite email is successfully sent to an attendee, their registrationStatus is automatically updated to "invited". Status updates only occur for successfully delivered emails - failed or suppressed emails are excluded.
- **Email Marketing Platform Integrations**: Connect external email marketing platforms (Mailchimp) to sync attendee data. Supports connection verification, audience/list fetching, and one-way sync of attendees to platform audiences. API keys stored encrypted (AES-256-GCM). Managed via Settings page with connection status tracking, audience browsing, and sync job history.
- **Passkey (Cvent) Housing Integration**: RegLink Basic integration for hotel room block management. Organizations connect Passkey credentials (encrypted storage) in Settings. Events can be linked to Passkey event IDs with a RegLink URL for bookings. When housing is enabled, attendees see a "Book Your Hotel Room" button on the registration confirmation screen that pre-fills their details. Public housing endpoint requires checkInCode authentication for security.
- **Document Workspace**: Secure document sharing and collaboration for organizers, sponsors, and vendors. Features include: folder organization, file upload with MIME/size validation (PDF, Office, images, ZIP; max 50MB), permission-based sharing (user/role/link with view/download/edit levels), threaded comments with resolve functionality, approval workflows (request/approve/reject), and comprehensive activity logging. Files stored via Replit Object Storage with ACL policies. All document operations are organization-scoped with full audit trail.
- **Activation Links**: Trackable campaign URLs for marketing attribution. Each link has a unique short code (8-character hex) and can include UTM parameters (source, medium, campaign, content, term). Links redirect visitors to a destination URL (typically event registration) while tracking clicks with privacy-compliant visitor hashes. Attribution data is captured during registration and stored with the attendee record. Supports conversion tracking (clicks vs. registrations), optional Activation Key association, and comprehensive analytics. Management UI in Audience section with copy link, edit, and analytics features.
- **Enhanced Marketing Analytics**: Admin-level marketing analytics tracks performance of the marketing landing page with detailed visitor insights. Features include: User-Agent parsing (device type, browser, OS), IP geolocation via Geoapify API (country, region, city, timezone), returning visitor detection, time context capture (UTC day/hour), and bot detection with 25+ User-Agent patterns. All tracking is privacy-friendly using visitor hashes (IP + UA) without storing raw IP addresses. Analytics dashboard displays breakdown cards for device types, browsers, top countries, visitor types (new vs returning), and traffic quality (human vs bot). Super-admin only access via Admin > Marketing page.
- **Revenue & ROI Feature Toggle**: The Revenue & ROI sidebar menu section (Pipeline Influence, Sales Handoff, Follow-Up Performance, ROI Reporting) is a bolt-on feature that can be enabled/disabled per organization. Super admins (@makemysandbox.com) can toggle this via the Admin > Organizations page. Users see the change after refreshing. Controlled by `enableRevenueRoi` boolean field on organizations.
- **Attendee Preview (Spoof Mode)**: Organization owners can preview all public-facing pages (landing page, registration page, attendee portal) exactly as a specific attendee would see them. Access via "Landing Page", "Registration", and "Portal" preview buttons in the attendee details sheet. Opens page in new tab with amber preview banner showing which attendee is being previewed. Visibility conditions on sections are evaluated for that attendee, filtering content appropriately. Only organization owners can access this feature. Uses `/api/organizations/:orgId/attendees/:attendeeId/spoof-portal` endpoint with owner-only authorization. Query parameters: `?spoof=attendeeId&orgId=orgId`.
- **Custom Domain Support**: Organizations can configure custom domains (e.g., events.company.com) to access their event pages. Features include: DNS verification via TXT record at `_eventgtm.{domain}` with unique token, host-based tenant resolution middleware, Cloudflare setup instructions, and verification status tracking. Only organization owners can verify domains. Settings UI shows verification status badge, DNS instructions (CNAME + TXT records), and copy token functionality. Public pages (registration, portal, landing) are automatically scoped to the correct organization when accessed via verified custom domain.
- **Multi-Language Support**: Event content can be translated to 10 supported languages (EN, ES, FR, DE, IT, PT, ZH, JA, KO, AR). Events have `supportedLanguages` array and `defaultLanguage` fields. Admin UI includes a "Languages" tab in event settings for selecting supported languages, setting default language, and managing translations (name, description, location) per language. Public pages feature a language switcher dropdown when multiple languages are supported. Locale detection priority: URL params (?lang=xx) → localStorage → browser preference → default language. Translations stored in `eventTranslations` table with API at `/api/events/:eventId/translations/:lang`. Missing translations gracefully fall back to default language content.
- **Personalized Schedules & Recommendations**: Attendees can save sessions to create a personalized schedule via the attendee portal. Features include: session bookmarking (bookmark button on agenda sections), personal schedule view grouped by date, attendee interests configuration (preferred tracks, session types, topics), and AI-powered session recommendations based on interests. The recommendation engine scores sessions by matching preferred tracks (+3), session types (+2), and keyword matches in title/description (+2/+1). Portal section types: `personal-schedule`, `recommendations`, `attendee-interests`. Data stored in `attendeeSavedSessions` and `attendeeInterests` tables. APIs at `/api/portal/:eventId/saved-sessions`, `/api/portal/:eventId/interests`, `/api/portal/:eventId/recommendations`.
- **Session & Event Feedback**: Comprehensive feedback collection system for sessions and overall event experience. Session feedback captures: overall rating (1-5), content rating, speaker rating, relevance rating, and comments. Event feedback captures: overall rating, venue rating, content quality, networking opportunities, organization quality, would-recommend (NPS-style), highlights, improvements, and additional comments. Both support anonymous submissions via `isAnonymous` flag. Feedback configuration is customizable per event via `feedbackConfigs` table. Admin analytics show NPS scores, average ratings, and detailed breakdowns. Portal section types: `session-feedback`, `event-feedback`. Prevents duplicate submissions. APIs at `/api/portal/:eventId/sessions/:sessionId/feedback` and `/api/portal/:eventId/feedback`.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit OIDC (`ISSUER_URL`, `REPL_ID`, `SESSION_SECRET` environment variables)

### UI Libraries
- Radix UI
- Lucide React
- Embla Carousel
- Recharts
- date-fns

### Development Tools
- Vite
- Replit-specific plugins
- ESBuild
- TSX

## Deployment Strategy

### Multi-Tenant vs. Dedicated Instances

This platform supports a hybrid deployment approach combining multi-tenant and dedicated instance models.

#### Multi-Tenant (Default)
The primary deployment uses multi-tenant architecture where all customers share one deployment but their data is completely isolated:
- **Data isolation**: All tables are scoped by `organizationId`
- **Custom domains**: Each organization can configure their own domain (e.g., events.company.com)
- **Feature flags**: Per-organization feature toggles (e.g., `enableRevenueRoi`)
- **Branding**: Organization-specific theming possible
- **Benefits**: Single codebase to maintain, lower infrastructure costs, instant updates for all customers

#### Dedicated Instances (Enterprise Customers)
For customers requiring complete physical isolation (compliance, security, or contractual requirements):
- **Setup**: Clone this project to create a separate Replit project
- **Database**: Each instance gets its own PostgreSQL database
- **Deployment**: Independent deployment with separate custom domain
- **Isolation**: Complete physical separation of code, data, and infrastructure

#### Hybrid Approach (Recommended)
- Use **multi-tenant** for most customers (default)
- Spin up **dedicated instances** only for enterprise clients with specific isolation requirements
- Maintain code in the main project, sync changes to dedicated instances after testing

#### Syncing Code to Dedicated Instances
When updating features:
1. Develop and test changes in the main (multi-tenant) project
2. Once verified, manually copy changes to dedicated instance(s)
3. Run database migrations on each instance separately
4. Test on dedicated instance before notifying customer

#### Considerations for Dedicated Instances
| Aspect | Multi-Tenant | Dedicated |
|--------|--------------|-----------|
| Maintenance | Update once | Update each separately |
| Cost | Shared infrastructure | Per-customer resources |
| Isolation | Logical (database-level) | Physical (separate everything) |
| Customization | Feature flags | Full code customization possible |
| Best for | Standard customers | Enterprise/compliance-heavy clients |
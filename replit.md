# Event Management CMS

## Overview

This is an Event Management Content Management System (CMS) - a full-stack admin platform for managing events, attendees, speakers, sessions, content, budgets, deliverables, and marketing campaigns. The application follows a utility-focused, information-dense design approach prioritizing efficiency and clarity over visual flair.

The platform supports multi-tenancy with organization-based data isolation. Each organization has its own events, attendees, speakers, and other data. Users are automatically assigned to an organization on first login, and all data operations are scoped to the user's active organization.

Key capabilities include registration tracking, agenda building, speaker management, budget monitoring, and email/social media campaign tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Build Tool**: Vite with custom plugins for Replit integration
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful JSON API with `/api` prefix
- **Session Management**: Express-session with PostgreSQL store (connect-pg-simple)
- **Authentication**: Replit OpenID Connect (OIDC) via Passport.js

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` for schema synchronization

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route-based page components
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations interface
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
└── migrations/       # Database migrations
```

### Authentication Flow
- Uses Replit's OIDC authentication system
- Sessions stored in PostgreSQL `sessions` table
- User data synchronized to `users` table on login
- Protected routes require `isAuthenticated` middleware

### Multi-Tenancy Architecture
- **Organizations**: Each user belongs to one or more organizations
- **Data Isolation**: All data tables have `organizationId` foreign key for tenant isolation
- **Auto-provisioning**: New users automatically get a default organization created on first login
- **Storage Layer**: All storage methods require organizationId to enforce data isolation
- **Route Middleware**: `getOrganizationId(userId)` helper resolves user's active organization for each request
- **Frontend Context**: `useAuth()` hook exposes current organization alongside user data

### Key Design Patterns
- **Storage Interface**: Abstraction layer (`IStorage`) for all database operations with org-scoped access
- **Shared Schema**: Single source of truth for database types used by both frontend and backend
- **API Request Helper**: Centralized `apiRequest` function with error handling
- **Component Composition**: Reusable components like `PageHeader`, `DataTable`, `StatsCard`, `EmptyState`

### Breadcrumb Styling Rules
All breadcrumbs must follow this consistent format and style:
- **Format**: `Home > Parent Menu > Current Page` (e.g., "Home > Attendees > Packages")
- **Styling**: All breadcrumb links (Home, parent items) and separators use `text-foreground` color
- **Current Page**: The last item (current page) uses `text-foreground` and is not clickable
- **Separator**: ChevronRight icon (`>`) matches the link color
- **Parent Links**: Must include `href` to link back to parent menu (e.g., `{ label: "Attendees", href: "/attendees" }`)
- **Component**: Use `PageHeader` with `breadcrumbs` prop following sidebar menu structure
- **Example**:
  ```jsx
  <PageHeader
    title="Packages"
    breadcrumbs={[{ label: "Attendees", href: "/attendees" }, { label: "Packages" }]}
    actions={...}
  />
  ```

### Event-Specific Package Overrides
- **Packages** are global templates scoped to the organization
- **Event Packages** (`eventPackages` table) store per-event overrides for price, features, and enabled status
- The merge endpoint (`GET /api/events/:eventId/packages`) returns packages with effective values:
  - `effectivePrice`: override value or base package price
  - `effectiveFeatures`: override array or base package features
  - `hasOverride`: boolean indicating if customizations exist
  - `isEnabled`: whether package is available for this specific event

### Site Builder
- **Purpose**: Visual page builder for customizing public-facing event pages
- **Database**: `eventPages` table stores page configurations per event with JSONB sections
- **Page Types**: Landing, Registration, and Portal pages for each event
- **Section Types**: Hero, Text, CTA, and Features sections with configurable content
- **Key Features**:
  - Event selector to choose which event to customize
  - Tri-tab layout for different page types (Landing, Registration, Portal)
  - Add/edit/delete/reorder sections within each page
  - Publish/unpublish workflow with "Live" badge indicators
  - Preview button to view public event page
- **API Endpoints**:
  - `GET /api/events/:eventId/pages` - List all pages for an event
  - `POST /api/events/:eventId/pages` - Create/upsert page configuration
  - `PATCH /api/events/:eventId/pages/:id` - Update specific page
  - `DELETE /api/events/:eventId/pages/:id` - Delete page
- **Public Rendering**: `SectionRenderer` component in public-event.tsx renders saved sections

### Invite Codes with Discounts
- **Purpose**: Single invite codes can unlock packages AND apply discounts
- **Database Fields**:
  - `inviteCodes.discountType`: "percentage" or "fixed" (or null for no discount)
  - `inviteCodes.discountValue`: decimal value (percentage 1-100, or fixed dollar amount)
  - `inviteCodes.packageId`: links to a package to unlock when code is used
- **Admin UI** (`/invite-codes`):
  - Configure discount type (Percentage Off / Fixed Amount Off)
  - Set discount value with appropriate input validation
  - Select package to unlock (for code-only packages)
  - Discount column displays formatted discount (e.g., "20% off" or "$50.00 off")
- **Public Registration Integration**:
  - Attendees enter invite code on registration page
  - Valid codes unlock associated packages and apply discounts
  - Discounted prices displayed with original price crossed out
  - `inviteCodeId` stored with attendee registration for verification

### Package Visibility
- **Purpose**: Control which packages are visible during public registration
- **Database Field**: `packages.isPublic` (boolean, defaults to true)
- **Visibility Types**:
  - **Public**: Visible to all attendees on registration page
  - **Code-Only**: Hidden until unlocked by a valid invite code
- **Admin UI** (`/packages`):
  - Toggle visibility between "Public" and "Code-Only"
  - Visibility column shows current status as badge
- **Public Registration**:
  - Only public packages shown by default
  - Code-only packages appear after valid invite code is applied
- **API Endpoints**:
  - `GET /api/public/event/:slug/packages` - Returns only public, active, enabled packages
  - `POST /api/public/validate-invite-code/:slug` - Validates invite code and returns unlocked package + discount info

### Email Templates
- **Purpose**: Create reusable email templates for campaigns and automated emails
- **Database**: `emailTemplates` table with fields: name, subject, content, headerImageUrl, category, isDefault
- **Features**:
  - **Merge Tags**: Insert dynamic placeholders using MergeTagPicker component
    - Event tags: {{event.name}}, {{event.date}}, {{event.location}}, {{event.description}}
    - Attendee tags: {{attendee.firstName}}, {{attendee.lastName}}, {{attendee.email}}, {{attendee.company}}, {{attendee.checkInCode}}
    - Organization tags: {{organization.name}}
  - **Header Image**: URL input for header image (use Media Library to host images)
  - **Test Email**: Send test email to logged-in admin's email address
- **API Endpoints**:
  - `GET /api/email-templates` - List all templates for organization
  - `POST /api/email-templates` - Create new template
  - `PATCH /api/email-templates/:id` - Update template
  - `DELETE /api/email-templates/:id` - Delete template
  - `POST /api/email-templates/:id/test-email` - Send test email to admin

### Media Library
- **Purpose**: Host images for use in email templates and content
- **Database**: `contentAssets` table stores metadata for uploaded files
- **Object Storage**: Uses Replit Object Storage with public ACL for email rendering
- **Features**:
  - Upload images via presigned URLs (direct to object storage)
  - Copy public URL for use in email templates
  - Delete uploaded images
  - Grid view with thumbnails
- **API Endpoints**:
  - `POST /api/content/assets/upload` - Get presigned upload URL
  - `POST /api/content/assets` - Create asset record after upload (sets public ACL)
  - `GET /api/content/assets` - List assets for organization
  - `DELETE /api/content/assets/:id` - Delete asset
  - `GET /objects/*` - Serve uploaded objects (public access)
- **Key Files**:
  - `server/objectStorage.ts` - Object storage service with presigned URL generation
  - `server/objectAcl.ts` - ACL policy management for public/private access
  - `client/src/components/ObjectUploader.tsx` - File upload component
  - Media Library tab in `client/src/pages/content.tsx`

## External Dependencies

### Database
- PostgreSQL (required, configured via `DATABASE_URL` environment variable)
- Session storage uses `sessions` table for authentication persistence

### Authentication
- Replit OIDC (`ISSUER_URL` defaults to `https://replit.com/oidc`)
- Requires `REPL_ID` and `SESSION_SECRET` environment variables

### UI Libraries
- Radix UI primitives for accessible components
- Lucide React for icons
- Embla Carousel for carousel components
- Recharts for data visualization
- date-fns for date formatting

### Development Tools
- Vite with React plugin
- Replit-specific plugins (runtime error overlay, cartographer, dev banner)
- ESBuild for production server bundling
- TSX for TypeScript execution

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier (auto-set in Replit)
- `ISSUER_URL`: OIDC issuer URL (optional, defaults to Replit)
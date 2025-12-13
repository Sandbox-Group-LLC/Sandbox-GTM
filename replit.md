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
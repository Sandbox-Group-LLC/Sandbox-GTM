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
- **Site Builder**: Visual page builder for custom public-facing event pages (Landing, Registration, Portal) with configurable sections and publish workflow.
- **Invite Codes**: Support for invite codes that unlock packages and apply percentage or fixed discounts.
- **Package Visibility**: Packages can be set as "Public" or "Code-Only" for controlled access during registration.
- **Email Templates**: Reusable templates with merge tags, header images, and test email functionality.
- **Media Library**: Hosts images (via Replit Object Storage) for use in templates, with upload, public URL generation, and deletion features.
- **Call for Papers (CFP)**: System for collecting, reviewing, and managing paper/abstract submissions, including admin configuration, public submission forms, and reviewer portals.
- **Email Analytics**: Comprehensive tracking for email campaigns including open tracking (via pixel), click tracking (wrapped links), and unsubscribe handling. Analytics dashboard shows campaign metrics (sent, delivered, opened, clicked, bounced, complained counts with rates). Individual attendee records display email activity history. Uses signed HMAC-SHA256 tokens for secure tracking endpoints and Resend webhook integration for delivery events.
- **Email Marketing Platform Integrations**: Connect external email marketing platforms (Mailchimp) to sync attendee data. Supports connection verification, audience/list fetching, and one-way sync of attendees to platform audiences. API keys stored encrypted (AES-256-GCM). Managed via Settings page with connection status tracking, audience browsing, and sync job history.

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
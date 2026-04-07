# Engage — Standalone Event Engagement App

A standalone attachment app that plugs into external event registration platforms (Rainfocus, Cvent, Eventbrite, etc.) and layers on real-time engagement, lead capture, check-in, and meeting management — without requiring those platforms to be replaced.

## Features

- **Engagement Moments** — Live polls, Q&A, ratings, pulse checks, CTAs with QR codes
- **Engagement Capture** — Program check-in, session check-in, and product interaction (lead) capture via QR scan or manual lookup
- **Product Engagement** — Demo station configuration and management
- **Meetings** — Internal meeting scheduling with attendees + outcome capture

## Architecture

### Integration Layer
External platform attendee data is pulled via a **platform adapter** interface:
- `getEvents()` — list events from the source platform
- `getAttendees(eventId)` — pull full attendee roster
- `lookupAttendee(code | email)` — real-time lookup for check-in scan

Adapters live in `server/integrations/`. Start with `rainfocus.ts`.

### Data Model
Engage maintains its own PostgreSQL database for all engagement activity. Attendee identity is mirrored locally (name, email, company, external ID) but the source of truth for registration data stays in the external platform.

### Stack
- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Node.js + Express + TypeScript (ESM)
- **Database**: PostgreSQL via Drizzle ORM
- **Build**: Vite (client), esbuild (server)

## Project Structure

```
engage/
├── client/src/
│   ├── pages/
│   │   ├── dashboard.tsx         Stats overview
│   │   ├── connect.tsx           Platform connection config
│   │   ├── check-in.tsx          Program + session + lead capture
│   │   ├── moments.tsx           Engagement moments admin
│   │   ├── moment-live.tsx       Public attendee-facing moment page
│   │   ├── demo-stations.tsx     Demo station management
│   │   └── meetings.tsx          Meetings + outcome capture
│   ├── components/
│   │   └── qr-scanner.tsx        Camera QR scanning
│   └── lib/
│       ├── queryClient.ts
│       └── utils.ts
├── server/
│   ├── index.ts                  Express entry point
│   ├── routes/
│   │   ├── attendees.ts          Proxy/cache from external platform
│   │   ├── checkin.ts            Check-in logic
│   │   ├── moments.ts            Moments CRUD + responses
│   │   ├── interactions.ts       Product interaction capture
│   │   └── meetings.ts           Meetings + outcomes
│   └── integrations/
│       ├── base-adapter.ts       Adapter interface
│       └── rainfocus.ts          Rainfocus implementation
└── shared/
    └── schema.ts                 Drizzle schema
```

## Environment Variables

```env
DATABASE_URL=            PostgreSQL connection string
SESSION_SECRET=          Express session secret
PLATFORM_ADAPTER=        rainfocus | cvent | eventbrite
RAINFOCUS_API_URL=       https://api.rainfocus.com
RAINFOCUS_API_KEY=       Your Rainfocus API key
RAINFOCUS_PROFILE_ID=    Your Rainfocus profile ID
```

## Getting Started

```bash
npm install
npm run db:push    # Apply schema to database
npm run dev        # Start dev server
```

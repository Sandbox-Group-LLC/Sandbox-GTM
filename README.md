# Sandbox GTM — Engage

**Branch:** `engage` | **Deployed:** [sandbox-gtm-1.onrender.com](https://sandbox-gtm-1.onrender.com)

Engage is a standalone event engagement platform that attaches to external event registration systems (Rainfocus, Cvent, etc.) via API. It captures attendee signals across check-ins, product demos, meetings, and live moments — then runs them through an intent scoring engine to surface sales-ready leads in real time.

---

## What's Built

### Core Platform
- **Org-centric architecture** — Organizations own attendees across events. PII isolated per org. Intel and Cisco never share a table.
- **Platform connections** — Transactional sync model. Connect → Full Sync → Disconnect. No continuous API meter running. Built for Rainfocus's $2,500/event API fee reality.
- **Dual intent scoring** — Per-event scores for isolation, lifetime scores for cross-event intelligence. Both live on the same attendee record.
- **Engagement Signals Engine** — Tier 1 buying signals (explicit) + Tier 2 momentum (cumulative, capped at 10). Generates prose narratives for CRM sync.

### Portals
- **Admin portal** — Full platform access. Events, connections, signals engine, leads, moments, check-in, stations, meetings.
- **Staff portal** — Phone-first. Station card, scanner, lead capture, hallway capture. Check-in gated behind a toggle so Romeo doesn't click the big blue button by mistake.

### The Hallway Feature 🚶
The best lead at any event happens between sessions. Mike from meetings has a conversation with a DoD executive in the elevator. No booth form. No badge scan. Just a real conversation that every other platform loses forever.

Hallway Capture fixes that. Any staff member — station or not — can capture an unplanned interaction in seconds. Tagged separately from station captures. Feeds the signals engine identically. Hallway Tier 1 is still Tier 1.

**Station: 0. Hallway: 3. Mike Turd is exonerated.**

---

## Architecture

```
engage/
├── client/          React 18 + TypeScript + Vite + Tailwind + shadcn/ui
├── server/          Node.js + Express + TypeScript (ESM)
│   ├── routes/      auth, events, attendees, checkin, moments,
│   │                interactions, meetings, intent
│   ├── auth.ts      bcrypt + jose JWT, httpOnly cookies, rate limiting
│   ├── db.ts        Drizzle ORM + pg pool
│   └── intentScoring.ts  Engagement signals engine
├── shared/
│   └── schema.ts    Drizzle schema — single source of truth
└── dist/            Compiled output (gitignored)
```

**Runtime:** Node 20 · PostgreSQL (Neon, SOC2 Type II) · Render Starter

---

## Database Schema

### Org Layer (PII isolated per org)
| Table | Purpose |
|---|---|
| `organizations` | Root entity. Cisco, Intel, etc. You provision these. |
| `org_attendees` | Canonical identity. PII lives here. One record per person per org. |
| `platform_connections` | Rainfocus / Cvent credentials. Transactional — connect to sync, disconnect to stop the meter. |

### Event Layer (no raw PII)
| Table | Purpose |
|---|---|
| `events` | Event mirror from registration platform |
| `event_attendees` | Event participation. Badge code, check-in status, per-event intent scores. |
| `sessions` | Session/breakout mirror |
| `session_check_ins` | Physical attendance via badge scan or manual |
| `moments` | Live polls, Q&A, ratings, pulse checks, CTAs |
| `moment_responses` | Attendee responses to moments |
| `demo_stations` | Booth/station roster |
| `product_interactions` | Lead capture — station, hallway, walk-up, badge scan |
| `meetings` | Scheduled 1:1s with pre/post intent capture |
| `intent_recompute_history` | Before/after snapshots per engine run, dual-scoped (event + org lifetime) |

### Auth Layer
| Table | Purpose |
|---|---|
| `app_users` | Platform users scoped to org. Roles: sandbox_admin, admin, staff, sponsor_admin |
| `user_tokens` | Token-based auth for sponsor staff, attendee identity, meeting invites |

---

## Engagement Signals Engine

**Core principle:** Explicit intent always beats inferred behavior.

**Tier 1 — Explicit buying signals** (immediate promotion eligible):
- Product outcomes: `wants_trial_pilot`, `asked_for_pricing`, `requested_follow_up`
- Tags: `budget_confirmed`, `urgent_timeline`, `buying_committee`
- Meeting outcomes: `active_opportunity` or `deal_in_progress` + near-term timeline

**Tier 2 — Momentum** (cumulative, capped at 10):
- Intent level: low=1, medium=2, high=3
- Role tags: decision_maker=1, executive=1
- Frequency bonus: +1 per interaction beyond first
- Opportunity potential: $50k–100k=2, $100k+=3
- Session check-ins: up to 2pts

**Promotion thresholds:**
- `engaged` — momentum ≥ 3
- `high_intent` — Tier 1 signal OR momentum ≥ 8
- `hot_lead` — Tier 1 signal AND ($50k+ opportunity OR 2+ Tier 1 signals)

Each promotion generates a human-readable narrative. Contra-signals add nuance without blocking promotion. Recompute is idempotent — rebuilds from raw signal data every time.

**Dual scoring:** Event-level recompute rolls up to org-level lifetime scores automatically. Cisco Live 2025 signals feed Alex Morgan's lifetime intent trajectory.

---

## Capture Methods

| Method | Description | Who |
|---|---|---|
| `scan` | Badge QR scan | Any staff |
| `lookup` | Found in attendee list | Any staff |
| `hallway` | Unplanned interaction, no station | Meeting staff / anyone |
| `walk_up` | Manual entry, person not in system | Any staff |

---

## User Roles

| Role | Access | Auth |
|---|---|---|
| `sandbox_admin` | All orgs, all events, everything | Email + password |
| `admin` | Their org — full platform | Email + password |
| `staff` | Check-in + lead capture + hallway | Email + password → `/staff` portal |
| `sponsor_admin` | Their company's leads + licenses | Email + password |
| `sponsor_staff` | Lead capture scoped to company | Token link |
| `attendee` | Moment responses, identity | Badge QR scan |

---

## Auth

- bcrypt cost 12 for password hashing
- Access token: HS256 JWT, 1h TTL, httpOnly + Secure + SameSite=Strict cookie
- Refresh token: HS256 JWT, 30d TTL, same flags — auto-issues new access token silently
- Rate limiting: 10 failed attempts per IP per 15 min on auth routes
- First account created auto-provisioned as admin

---

## Staff Portal

Phone-first design. Separate from the admin app — same database, different door.

- **Station staff** → primary blue station card with products, Capture button, their captures
- **Meeting staff** (null station) → amber Hallway Mode card, footprints Capture button
- **Check-In toggle** → off by default, gates the Check In buttons so staff can find attendees without accidentally processing them
- **My Captures tab** → splits Hallway vs Station captures visually

Staff login → auto-redirected to `/staff`. They never see the admin app.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | 256-bit random hex — signs access + refresh tokens |
| `SESSION_SECRET` | Express session secret |
| `ADMIN_PASSWORD` | Relay endpoint password (dev only — remove before production) |
| `NODE_ENV` | `production` on Render |
| `PORT` | `10000` on Render |
| `PLATFORM_ADAPTER` | `rainfocus` \| `cvent` |
| `NEON_AUTH_URL` | Neon Auth base URL (reserved for future SSO) |
| `NEON_AUTH_JWKS_URL` | Neon Auth JWKS endpoint |

---

## Developer Relay

Raw SQL execution endpoint for development database access. Protected by `ADMIN_PASSWORD`. **Remove before production launch.**

```bash
curl -X POST https://sandbox-gtm-1.onrender.com/api/admin/relay \
  -H "Content-Type: application/json" \
  -d '{"adminPassword":"sg-relay-2025","query":"SELECT count(*) FROM org_attendees"}'
```

See [PRE-LAUNCH.md](./PRE-LAUNCH.md) for full checklist.

---

## Repo Access Protocol

**Repo:** `Sandbox-Group-LLC/Sandbox-GTM` | **Branch:** `engage`

```
PUT https://api.github.com/repos/Sandbox-Group-LLC/Sandbox-GTM/contents/{path}
```

Body must include `message`, `content` (base64 encoded), `sha` (from the read), and `branch: engage`.

**Rules:**
- Always read the file and capture its SHA before writing — never write blind
- Commit with conventional commits (`feat:`, `fix:`, `refactor:`, `style:`)
- Render auto-deploys on every push to `engage` — no manual deploy needed

---

## Local Development

```bash
cd engage
cp .env.example .env       # add DATABASE_URL + JWT_SECRET
npm install
npm run db:push            # push schema to Neon
npm run dev                # runs server + client concurrently
```

---

## GTM Zingers

Features born from real event floor chaos. Not in any other platform.

| Feature | The Line |
|---|---|
| **Hallway Capture** 🚶 | Because the best leads happen between sessions. |
| **Mike Turd** 💩 | Meeting-only staff. No station. Full hallway privileges. Surprisingly effective. |

---

*Last updated: April 7, 2026 — End of Day 1. Built from scratch in one session.*
*Tomorrow: sponsor portal, attendee identity, meetings booking, admin user management.*

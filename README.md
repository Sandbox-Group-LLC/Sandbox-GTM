# Sandbox GTM — Engage

**Branch:** `engage` | **Deployed:** [sandbox-gtm-1.onrender.com](https://sandbox-gtm-1.onrender.com)

Engage is a standalone event engagement platform that attaches to external event registration systems (Rainfocus, Cvent, etc.) via API. It captures attendee signals across check-ins, product demos, meetings, and live moments — then runs them through an intent scoring engine to surface sales-ready leads in real time.

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
│   └── schema.ts    Drizzle schema — single source of truth for all tables
└── dist/            Compiled output (gitignored)
```

**Runtime:** Node 20 · PostgreSQL (Neon) · Render (auto-deploy on push to `engage`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Wouter, TanStack Query, shadcn/ui, Tailwind CSS |
| Backend | Node.js, Express, TypeScript (ESM) |
| Database | Neon PostgreSQL (SOC2 Type II) |
| ORM | Drizzle |
| Auth | bcrypt (cost 12) + jose JWT, httpOnly cookies |
| Deploy | Render (auto-deploy) |

---

## Database Schema

| Table | Purpose |
|---|---|
| `platform_connections` | Rainfocus / Cvent API credentials |
| `events` | Event mirror from registration platform |
| `attendees` | Attendee roster + intent scoring fields |
| `sessions` | Session/breakout mirror |
| `session_check_ins` | Physical attendance via badge scan |
| `moments` | Live polls, Q&A, ratings, pulse checks |
| `moment_responses` | Attendee responses to moments |
| `demo_stations` | Booth/station roster |
| `product_interactions` | Lead capture from demos and conversations |
| `meetings` | Scheduled 1:1s with pre/post intent capture |
| `intent_recompute_history` | Before/after snapshots from signals engine runs |
| `app_users` | Platform users (admin, staff, sponsor_admin) |
| `user_tokens` | Token-based auth for sponsor staff + attendee identity |

---

## Engagement Signals Engine

Located at `server/intentScoring.ts`. Runs on demand via `POST /api/events/:id/intent/recompute`.

**Core principle:** Explicit intent always beats inferred behavior.

**Tier 1 — Explicit buying signals** (immediate promotion):
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

Each promotion generates a human-readable narrative for CRM sync.

---

## User Roles

| Role | Access | Auth Method |
|---|---|---|
| `admin` | Full platform — config, users, all data | Email + password |
| `staff` | Check-in, lead capture, meetings for assigned station | Email + password |
| `sponsor_admin` | Their company's leads + license management | Email + password |
| `sponsor_staff` | Lead capture only, scoped to company | Token link |
| `attendee` | Moment responses, identity resolution | Badge QR scan |

---

## Auth

- **Credential-based** (admin, staff, sponsor_admin): bcrypt cost 12 + HS256 JWT
- **Access token:** 1h TTL, httpOnly + Secure + SameSite=Strict cookie
- **Refresh token:** 30d TTL, same cookie flags — auto-issues new access token silently
- **Rate limiting:** 10 failed auth attempts per IP per 15 min
- **Token-based** (sponsor staff, attendees): scoped tokens in `user_tokens` table

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | 256-bit random hex — used to sign access + refresh tokens |
| `SESSION_SECRET` | Express session secret |
| `ADMIN_PASSWORD` | Relay endpoint password (dev only — remove before production) |
| `NODE_ENV` | `production` on Render |
| `PORT` | `10000` on Render |
| `PLATFORM_ADAPTER` | `rainfocus` \| `cvent` |
| `NEON_AUTH_URL` | Neon Auth base URL (reserved for future SSO) |
| `NEON_AUTH_JWKS_URL` | Neon Auth JWKS endpoint |

---

## Developer Relay

A raw SQL relay endpoint exists at `POST /api/admin/relay` for development database access. Protected by `ADMIN_PASSWORD`. **Must be removed before production launch.** See pre-launch checklist.

```bash
curl -X POST https://sandbox-gtm-1.onrender.com/api/admin/relay \
  -H "Content-Type: application/json" \
  -d '{"adminPassword":"sg-relay-2025","query":"SELECT count(*) FROM attendees"}'
```

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

## Deployment

Render auto-deploys on every push to the `engage` branch. No manual deploy step.

Build command: `npm install && npm run build`
Start command: `node dist/server/index.js`
Root directory: `engage`

---

## Pre-Launch Checklist

See [PRE-LAUNCH.md](./PRE-LAUNCH.md)

---

## GTM Zingers

Features born from real event floor chaos. These aren't in any other platform.

| Feature | The Line |
|---|---|
| **Hallway Capture** 🚶 | Because the best leads happen between sessions. |

---

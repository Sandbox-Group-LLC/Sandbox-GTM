# Engage — Pre-Launch Checklist

Track this before any real attendee data touches the platform.

---

## 🔴 Security — Must Do

- [ ] **Verify httpOnly cookie flags in production**
  Hit `/api/auth/login`, inspect response headers.
  Cookies must show: `HttpOnly; Secure; SameSite=Strict`
  The `Secure` flag only activates when `NODE_ENV=production` — confirm it's set on Render.

- [ ] **Confirm rate limiting is active**
  Attempt 11 consecutive failed logins from the same IP.
  Should receive `429 Too Many Requests` on the 11th.

- [ ] **Remove any hardcoded credentials from codebase**
  Grep for: `sg-relay-2025`, `npg_`, `ghp_`, any API keys.
  `git grep -n "sg-relay\|npg_\|ghp_"` on the engage branch.

- [ ] **Review Render env vars**
  Confirm no secrets are committed to the repo.
  All sensitive values should only live in Render environment variables.

---

## 🟡 Auth & Access — Must Do

- [ ] **Delete seed/demo app_users before go-live**
  Any test accounts created during development should be removed.
  ```sql
  DELETE FROM app_users WHERE email LIKE '%test%' OR email LIKE '%demo%';
  ```

- [ ] **Provision real admin account**
  Create the production admin via `/login` → Sign Up.
  Confirm first-user auto-admin logic fires correctly.
  Delete any dev admin accounts.

- [ ] **Test staff provisioning end-to-end**
  Admin creates a staff user via `/api/auth/provision`.
  Staff user logs in, confirm they land on `/check-in` and see their station.

- [ ] **Confirm sponsor token flow works**
  Issue a `sponsor_staff` token, hit the scoped URL, confirm lead capture is locked to that company.

- [ ] **Session expiry behavior**
  Log in, wait 1h+ without activity, attempt an API call.
  Should silently refresh via the refresh cookie and continue.
  Wait 30d (or manually expire refresh cookie), confirm redirect to `/login`.

---

## 🟡 Data — Must Do

- [ ] **Clear all seed data before event go-live**
  ```sql
  DELETE FROM product_interactions;
  DELETE FROM session_check_ins;
  DELETE FROM moment_responses;
  DELETE FROM meetings;
  DELETE FROM intent_recompute_history;
  DELETE FROM moments;
  DELETE FROM attendees;
  DELETE FROM sessions;
  DELETE FROM events;
  DELETE FROM platform_connections;
  ```
  Then re-connect via `/connect` with real Rainfocus credentials and run a full sync.

- [ ] **Run db:push after any schema changes**
  If schema.ts was modified, run `npm run db:push` from the Render shell before go-live.

- [ ] **Verify Neon backups are enabled**
  Neon dashboard → your project → Backups.
  Confirm daily backups are active and point-in-time recovery is available.

---

## 🟡 Platform Integration — Must Do

- [ ] **Test Rainfocus connection with real credentials**
  Go to `/connect`, enter production org ID + API token.
  Run Full Sync — confirm events and attendees populate.
  Verify badge codes (`regcode`) are populated on attendee records.

- [ ] **Test badge scan end-to-end**
  Scan a real badge code at `/check-in`.
  Confirm attendee resolves, check-in records in DB, stats update.

- [ ] **Test incremental sync**
  Run a second sync — confirm it doesn't duplicate records (ON CONFLICT upsert).

---

## 🟢 Ops — Nice to Have Before Launch

- [ ] **Custom domain**
  Point `engage.sandbox-gtm.com` (or similar) at the Render service.
  Update Render → Settings → Custom Domains.
  Update any hardcoded `sandbox-gtm-1.onrender.com` references.

- [ ] **Error monitoring**
  Add Sentry or similar. Render logs are fine for dev, not for production incidents.
  `npm install @sentry/node` + init in `server/index.ts`.

- [ ] **Uptime monitoring**
  Point UptimeRobot or Better Uptime at `/api/health`.
  Alert on 2+ consecutive failures.

- [ ] **Render instance size**
  Free tier spins down after inactivity — not acceptable at a live event.
  Upgrade to at least Starter ($7/mo) before go-live so it's always warm.

- [ ] **Log retention**
  Render free tier has limited log history. Consider adding a log drain
  (Papertrail, Logtail) for event-day debugging.

- [ ] **Load test check-in endpoint**
  At a large event, badge scans can spike hard at session transitions.
  Run a quick `k6` or `ab` test against `/api/events/:id/checkin/scan`
  to confirm the server handles burst traffic.

---

## 🔵 Post-Launch — Before Next Event

- [ ] **Add token revocation**
  Currently deactivated users remain valid until their 1h access token expires.
  Add a `revoked_tokens` blocklist table for instant deactivation.

- [ ] **CRM sync**
  Wire intent narratives and lead scores to HubSpot / Salesforce post-event.
  The `intentNarrative` and `intentSources` fields are designed for this.

- [ ] **Sponsor portal**
  Build sponsor admin dashboard with lead feed + license management.

- [ ] **Attendee identity flow**
  Badge QR → persistent session → moment responses mapped to profile.

---

_Last updated: April 2026 — Engage v1.0_

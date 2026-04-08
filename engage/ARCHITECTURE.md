# Engage — Architecture Decision Records

## ADR-001: Org-Level Attendee Isolation Model

**Date:** April 2026  
**Status:** Current implementation  
**Decision:** Shared `org_attendees` table with `org_id` row-level isolation

---

### What We Built

All attendee PII lives in a single `org_attendees` table, segregated by `org_id`:

```
org_attendees
  id
  org_id        ← all queries scoped here
  email
  first_name
  last_name
  ...
```

Cisco's attendees have `org_id: org-cisco-001`.  
Intel's attendees have `org_id: org-intel-001`.  
They cannot appear in each other's queries without explicitly crossing the FK.  
No RLS policies — isolation is enforced at the application layer via `org_id` scoping on every query.

**This is the correct default** for 95% of customers. Maintainable, performant, cross-org reporting works at the platform level.

---

### The Enterprise Exception

Some customers — particularly government, defense, financial services, and large enterprise with strict DPA requirements — will require **physical table isolation**. Not row-level. Not RLS. Separate tables, separate schemas, or separate databases entirely.

Example: Intel may require `intel_attendees` as a dedicated table with no commingling at the database layer, contractual guarantees that no query can reach their data from another org's session, and potentially a separate Neon branch or database entirely.

**This is a custom integration upcharge.** It is not the default. It is physically possible.

---

### How to Implement Physical Isolation (When Required)

The current architecture does not block this. Here's the plug-in path:

#### Option A — Separate Schema Per Org (Recommended)

Neon supports multiple schemas within one database. Each enterprise org gets their own schema:

```sql
CREATE SCHEMA intel;
CREATE TABLE intel.attendees ( ... same columns as org_attendees ... );
CREATE TABLE intel.event_attendees ( ... );
```

The application layer routes queries to the correct schema based on org config:

```typescript
// org config stores schema name
const schema = org.dbSchema || 'public';
const result = await db.execute(
  sql`SELECT * FROM ${sql.identifier(schema)}.attendees WHERE email = ${email}`
);
```

No shared rows. Physical separation. Still one database connection string.

#### Option B — Separate Neon Branch Per Org

Neon's branching feature creates a full copy of the schema on a separate compute endpoint. Each enterprise org gets their own branch with their own connection string stored in `organizations.db_connection_url`.

```typescript
// org config stores override connection string
const orgPool = org.dbConnectionUrl 
  ? new Pool({ connectionString: org.dbConnectionUrl })
  : defaultPool;
```

Full physical database isolation. Highest compliance posture. Higher operational cost.

#### Option C — Separate Neon Project Per Org

Nuclear option. Separate Neon project, separate billing, separate everything. Reserved for orgs with contractual requirements for dedicated infrastructure (e.g., FedRAMP, IL4, certain financial regulators).

---

### What Needs to Exist in `organizations` Table to Support This

Add these columns when the first enterprise isolation customer is onboarded:

```sql
ALTER TABLE organizations ADD COLUMN db_schema VARCHAR(100);         -- Option A
ALTER TABLE organizations ADD COLUMN db_connection_url VARCHAR(500); -- Option B/C
ALTER TABLE organizations ADD COLUMN isolation_tier VARCHAR(50)      -- 'shared' | 'schema' | 'branch' | 'dedicated'
  DEFAULT 'shared';
```

The application query layer checks `isolation_tier` and routes accordingly. Standard orgs never notice. Enterprise orgs get their physical wall.

---

### Pricing Posture

| Tier | Model | Upcharge |
|---|---|---|
| Standard | Shared table, `org_id` isolation | Included |
| Schema isolation | Separate schema, same DB | Custom — one-time setup fee |
| Branch isolation | Separate Neon branch | Custom — monthly infra + setup |
| Dedicated isolation | Separate Neon project | Enterprise contract |

---

### What This Means for Current Development

- **Do not** build anything that hardcodes `public.org_attendees` without going through the org config layer
- **Do** ensure every attendee query goes through a function that accepts an `org` object — that's the future routing hook
- **Do not** build cross-org reporting that joins `org_attendees` directly — always go through the event → org FK path
- The `organizations` table is the right place to store isolation config when the time comes

---

*This document should be updated when the first enterprise isolation customer is onboarded.*
*Owner: Sandbox Group / Brian*

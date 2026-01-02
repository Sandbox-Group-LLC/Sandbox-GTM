-- Add intent recompute tracking for Follow-Up Readiness KPI
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "last_intent_recomputed_at" timestamp;

-- Create intent recompute history table for changelog tracking
CREATE TABLE IF NOT EXISTS "intent_recompute_history" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" varchar NOT NULL REFERENCES "organizations"("id"),
  "event_id" varchar NOT NULL REFERENCES "events"("id"),
  "recomputed_at" timestamp NOT NULL DEFAULT now(),
  "snapshot" jsonb NOT NULL,
  "triggered_by" varchar REFERENCES "users"("id")
);

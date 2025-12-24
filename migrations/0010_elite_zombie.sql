CREATE TABLE "engagement_signals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"session_id" varchar,
	"attendee_id" varchar NOT NULL,
	"engaged" boolean DEFAULT false,
	"engagement_score" integer DEFAULT 0,
	"high_intent" boolean DEFAULT false,
	"last_engaged_at" timestamp,
	"signal_summary_json" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moment_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moment_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"session_id" varchar,
	"attendee_id" varchar NOT NULL,
	"payload_json" jsonb NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"session_id" varchar,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"prompt" text,
	"options_json" jsonb,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"show_results" boolean DEFAULT false,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "device_type" varchar(20);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "browser" varchar(50);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "os" varchar(50);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "country_code" varchar(10);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "is_returning_visitor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "previous_visit_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "day_of_week" integer;--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "hour_of_day" integer;--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD COLUMN "is_bot" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "folder" varchar(100);--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "sponsor_id" varchar;--> statement-breakpoint
ALTER TABLE "content_assets" ADD COLUMN "sponsor_tier" varchar(50);--> statement-breakpoint
ALTER TABLE "custom_fields" ADD COLUMN "attendee_only" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "engagement_signals" ADD CONSTRAINT "engagement_signals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_signals" ADD CONSTRAINT "engagement_signals_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_signals" ADD CONSTRAINT "engagement_signals_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_signals" ADD CONSTRAINT "engagement_signals_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_responses" ADD CONSTRAINT "moment_responses_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_responses" ADD CONSTRAINT "moment_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_responses" ADD CONSTRAINT "moment_responses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_responses" ADD CONSTRAINT "moment_responses_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_responses" ADD CONSTRAINT "moment_responses_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moments" ADD CONSTRAINT "moments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moments" ADD CONSTRAINT "moments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moments" ADD CONSTRAINT "moments_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moments" ADD CONSTRAINT "moments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_sponsor_id_event_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."event_sponsors"("id") ON DELETE no action ON UPDATE no action;
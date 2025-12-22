CREATE TABLE "attendee_interests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" varchar NOT NULL,
	"preferred_tracks" text[],
	"preferred_session_types" text[],
	"interests" text[],
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "attendee_interests_attendee_id_unique" UNIQUE("attendee_id")
);
--> statement-breakpoint
CREATE TABLE "attendee_saved_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendee_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "audience_targeting" jsonb;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "device_type" varchar(20);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "browser" varchar(50);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "os" varchar(50);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "country_code" varchar(3);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "is_returning_visitor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "previous_visit_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "day_of_week" integer;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "hour_of_day" integer;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD COLUMN "is_bot" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "attendee_interests" ADD CONSTRAINT "attendee_interests_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendee_saved_sessions" ADD CONSTRAINT "attendee_saved_sessions_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendee_saved_sessions" ADD CONSTRAINT "attendee_saved_sessions_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_marketing_click_country" ON "marketing_link_clicks" USING btree ("country");--> statement-breakpoint
CREATE INDEX "IDX_marketing_click_device" ON "marketing_link_clicks" USING btree ("device_type");
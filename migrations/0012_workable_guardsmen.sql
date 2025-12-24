CREATE TABLE "api_key_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"route" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" varchar(500),
	"latency_ms" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"key_prefix" varchar(12) NOT NULL,
	"hashed_secret" varchar(255) NOT NULL,
	"scopes" text[] NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 60,
	"rate_limit_per_day" integer DEFAULT 10000,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"last_rotated_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"sponsor_id" varchar,
	"captured_by_user_id" varchar,
	"captured_by_sponsor_contact_id" varchar,
	"capture_method" varchar(50),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(255),
	"phone" varchar(50),
	"job_title" varchar(255),
	"notes" text,
	"tags" text[],
	"attendee_id" varchar,
	"source_code" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session_check_ins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"attendee_id" varchar NOT NULL,
	"scanned_by_user_id" varchar,
	"check_in_method" varchar(50),
	"source_code" varchar(50),
	"checked_in_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sponsor_contact_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"sponsor_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"permissions" text[],
	"invite_code" varchar(64) NOT NULL,
	"invited_by" varchar,
	"status" varchar(20) DEFAULT 'pending',
	"expires_at" timestamp,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"accepted_by" varchar,
	CONSTRAINT "sponsor_contact_invitations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "acquisition_goal" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "acquisition_milestones" jsonb;--> statement-breakpoint
ALTER TABLE "sponsor_contacts" ADD COLUMN "permissions" text[];--> statement-breakpoint
ALTER TABLE "sponsor_contacts" ADD COLUMN "invited_by" varchar;--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ADD CONSTRAINT "api_key_audit_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_audit_logs" ADD CONSTRAINT "api_key_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leads" ADD CONSTRAINT "event_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leads" ADD CONSTRAINT "event_leads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leads" ADD CONSTRAINT "event_leads_sponsor_id_event_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."event_sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leads" ADD CONSTRAINT "event_leads_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leads" ADD CONSTRAINT "event_leads_captured_by_sponsor_contact_id_sponsor_contacts_id_fk" FOREIGN KEY ("captured_by_sponsor_contact_id") REFERENCES "public"."sponsor_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_leads" ADD CONSTRAINT "event_leads_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_check_ins" ADD CONSTRAINT "session_check_ins_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_check_ins" ADD CONSTRAINT "session_check_ins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_check_ins" ADD CONSTRAINT "session_check_ins_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_check_ins" ADD CONSTRAINT "session_check_ins_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_check_ins" ADD CONSTRAINT "session_check_ins_scanned_by_user_id_users_id_fk" FOREIGN KEY ("scanned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_contact_invitations" ADD CONSTRAINT "sponsor_contact_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_contact_invitations" ADD CONSTRAINT "sponsor_contact_invitations_sponsor_id_event_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."event_sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_contact_invitations" ADD CONSTRAINT "sponsor_contact_invitations_invited_by_sponsor_contacts_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."sponsor_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_contact_invitations" ADD CONSTRAINT "sponsor_contact_invitations_accepted_by_sponsor_contacts_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."sponsor_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_audit_key_idx" ON "api_key_audit_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_audit_occurred_idx" ON "api_key_audit_logs" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "api_keys_org_idx" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_keys_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "session_check_ins_session_attendee_idx" ON "session_check_ins" USING btree ("session_id","attendee_id");--> statement-breakpoint
ALTER TABLE "sponsor_contacts" ADD CONSTRAINT "sponsor_contacts_invited_by_sponsor_contacts_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."sponsor_contacts"("id") ON DELETE no action ON UPDATE no action;
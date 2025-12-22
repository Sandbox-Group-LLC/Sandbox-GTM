CREATE TABLE "custom_font_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"custom_font_id" varchar NOT NULL,
	"file_url" text NOT NULL,
	"format" varchar(20) NOT NULL,
	"weight" integer DEFAULT 400,
	"style" varchar(20) DEFAULT 'normal',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_fonts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_translations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"name" varchar(255),
	"description" text,
	"location" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_activation_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"destination_type" varchar(50) DEFAULT 'landing' NOT NULL,
	"destination_url" text NOT NULL,
	"utm_source" varchar(255) NOT NULL,
	"utm_medium" varchar(255) NOT NULL,
	"utm_campaign" varchar(255) NOT NULL,
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"short_code" varchar(16) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"click_count" integer DEFAULT 0,
	"conversion_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "marketing_activation_links_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "marketing_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(255),
	"job_title" varchar(255),
	"phone" varchar(50),
	"message" text,
	"source" varchar(100) DEFAULT 'pricing-page',
	"status" varchar(50) DEFAULT 'new',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketing_link_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketing_link_id" varchar NOT NULL,
	"visitor_hash" varchar(64),
	"ip_hash" varchar(64),
	"user_agent" text,
	"referrer" text,
	"query_params" jsonb,
	"converted_to_lead_id" varchar,
	"converted_at" timestamp,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"permissions" text[],
	"invite_code" varchar(64) NOT NULL,
	"invited_by" varchar NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"expires_at" timestamp,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"accepted_by" varchar,
	CONSTRAINT "team_invitations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "workstream" varchar(100);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "supported_languages" text[];--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "default_language" varchar(10) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "permissions" text[];--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "invited_by" varchar;--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "enable_revenue_roi" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_domain" varchar(500);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_domain_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_domain_verification_token" varchar(64);--> statement-breakpoint
ALTER TABLE "custom_font_variants" ADD CONSTRAINT "custom_font_variants_custom_font_id_custom_fonts_id_fk" FOREIGN KEY ("custom_font_id") REFERENCES "public"."custom_fonts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fonts" ADD CONSTRAINT "custom_fonts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD CONSTRAINT "marketing_link_clicks_marketing_link_id_marketing_activation_links_id_fk" FOREIGN KEY ("marketing_link_id") REFERENCES "public"."marketing_activation_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_link_clicks" ADD CONSTRAINT "marketing_link_clicks_converted_to_lead_id_marketing_leads_id_fk" FOREIGN KEY ("converted_to_lead_id") REFERENCES "public"."marketing_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_font_variants_font_idx" ON "custom_font_variants" USING btree ("custom_font_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_fonts_org_name_idx" ON "custom_fonts" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_event_translation_unique" ON "event_translations" USING btree ("event_id","language_code");--> statement-breakpoint
CREATE INDEX "IDX_marketing_link_short_code" ON "marketing_activation_links" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "IDX_marketing_link_status" ON "marketing_activation_links" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_marketing_click_link" ON "marketing_link_clicks" USING btree ("marketing_link_id");--> statement-breakpoint
CREATE INDEX "IDX_marketing_click_time" ON "marketing_link_clicks" USING btree ("clicked_at");--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
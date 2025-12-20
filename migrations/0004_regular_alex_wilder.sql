CREATE TABLE "activation_link_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activation_link_id" varchar NOT NULL,
	"visitor_hash" varchar(64),
	"ip_hash" varchar(64),
	"user_agent" text,
	"referrer" text,
	"query_params" jsonb,
	"converted_to_attendee_id" varchar,
	"converted_at" timestamp,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activation_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"destination_type" varchar(50) DEFAULT 'registration' NOT NULL,
	"base_url" text,
	"utm_source" varchar(255) NOT NULL,
	"utm_medium" varchar(255) NOT NULL,
	"utm_campaign" varchar(255) NOT NULL,
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"custom_params" jsonb,
	"invite_code_id" varchar,
	"status" varchar(20) DEFAULT 'active',
	"short_code" varchar(50),
	"click_count" integer DEFAULT 0,
	"conversion_count" integer DEFAULT 0,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "activation_links_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"page_type" varchar(50) NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"viewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"category_id" varchar,
	"event_id" varchar,
	"budget_item_id" varchar,
	"description" text,
	"cost" numeric(10, 2) DEFAULT '0',
	"contract_status" varchar(50) DEFAULT 'active',
	"approval_status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "activation_link_id" varchar;--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "utm_source" varchar(255);--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "utm_medium" varchar(255);--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "utm_campaign" varchar(255);--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "utm_content" varchar(255);--> statement-breakpoint
ALTER TABLE "attendees" ADD COLUMN "utm_term" varchar(255);--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD CONSTRAINT "activation_link_clicks_activation_link_id_activation_links_id_fk" FOREIGN KEY ("activation_link_id") REFERENCES "public"."activation_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_link_clicks" ADD CONSTRAINT "activation_link_clicks_converted_to_attendee_id_attendees_id_fk" FOREIGN KEY ("converted_to_attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_links" ADD CONSTRAINT "activation_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_links" ADD CONSTRAINT "activation_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_links" ADD CONSTRAINT "activation_links_invite_code_id_invite_codes_id_fk" FOREIGN KEY ("invite_code_id") REFERENCES "public"."invite_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_links" ADD CONSTRAINT "activation_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_category_id_budget_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_budget_item_id_budget_items_id_fk" FOREIGN KEY ("budget_item_id") REFERENCES "public"."budget_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_activation_link_click_link" ON "activation_link_clicks" USING btree ("activation_link_id");--> statement-breakpoint
CREATE INDEX "IDX_activation_link_click_time" ON "activation_link_clicks" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX "IDX_activation_link_org" ON "activation_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_activation_link_event" ON "activation_links" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "IDX_activation_link_short_code" ON "activation_links" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "IDX_page_view_org" ON "page_views" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_page_view_event" ON "page_views" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "IDX_page_view_time" ON "page_views" USING btree ("viewed_at");--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_activation_link_id_activation_links_id_fk" FOREIGN KEY ("activation_link_id") REFERENCES "public"."activation_links"("id") ON DELETE no action ON UPDATE no action;
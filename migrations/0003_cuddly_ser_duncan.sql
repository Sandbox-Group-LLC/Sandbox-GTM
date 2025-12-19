CREATE TABLE "document_activity" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"actor_type" varchar(50) NOT NULL,
	"actor_id" varchar(255),
	"actor_email" varchar(255),
	"action" varchar(50) NOT NULL,
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"requested_by" varchar,
	"approver_type" varchar(50) NOT NULL,
	"approver_id" varchar NOT NULL,
	"approver_name" varchar(255),
	"status" varchar(50) DEFAULT 'pending',
	"comments" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"parent_id" varchar,
	"content" text NOT NULL,
	"author_type" varchar(50) NOT NULL,
	"author_id" varchar NOT NULL,
	"author_name" varchar(255),
	"is_resolved" boolean DEFAULT false,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_folders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parent_id" varchar,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_shares" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"share_type" varchar(50) NOT NULL,
	"share_value" varchar(255) NOT NULL,
	"permission" varchar(50) DEFAULT 'view',
	"expires_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar,
	"folder_id" varchar,
	"name" varchar(500) NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"object_path" text NOT NULL,
	"access_level" varchar(50) DEFAULT 'private',
	"version" integer DEFAULT 1,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passkey_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"client_id" text,
	"client_secret" text,
	"access_token" text,
	"token_expires_at" timestamp,
	"status" varchar(50) DEFAULT 'disconnected',
	"error_message" text,
	"connected_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passkey_event_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"passkey_event_id" varchar(255) NOT NULL,
	"passkey_event_name" varchar(500),
	"reglink_url" text,
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passkey_reservations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"attendee_id" varchar,
	"passkey_reservation_id" varchar(255),
	"hotel_name" varchar(255),
	"check_in_date" date,
	"check_out_date" date,
	"room_type" varchar(255),
	"confirmation_number" varchar(100),
	"status" varchar(50) DEFAULT 'pending',
	"guest_first_name" varchar(255),
	"guest_last_name" varchar(255),
	"guest_email" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sponsor_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"sponsor_id" varchar NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"job_title" varchar(255),
	"phone" varchar(50),
	"is_primary" boolean DEFAULT false,
	"portal_access_token" varchar(255),
	"portal_token_expires_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sponsor_task_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"sponsor_id" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"submitted_data" jsonb,
	"completed_at" timestamp,
	"completed_by" varchar,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sponsor_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"task_type" varchar(50) NOT NULL,
	"required_fields" jsonb,
	"is_required" boolean DEFAULT false,
	"due_date" date,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN "is_invite_email" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "contact_name" varchar(255);--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "registration_seats" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "seats_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "base_invite_code_id" varchar;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "portal_access_token" varchar(255);--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "portal_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "invite_codes" ADD COLUMN "sponsor_id" varchar;--> statement-breakpoint
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_approvals" ADD CONSTRAINT "document_approvals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_document_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_connections" ADD CONSTRAINT "passkey_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_connections" ADD CONSTRAINT "passkey_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_event_mappings" ADD CONSTRAINT "passkey_event_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_event_mappings" ADD CONSTRAINT "passkey_event_mappings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_reservations" ADD CONSTRAINT "passkey_reservations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_reservations" ADD CONSTRAINT "passkey_reservations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey_reservations" ADD CONSTRAINT "passkey_reservations_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_contacts" ADD CONSTRAINT "sponsor_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_contacts" ADD CONSTRAINT "sponsor_contacts_sponsor_id_event_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."event_sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_task_completions" ADD CONSTRAINT "sponsor_task_completions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_task_completions" ADD CONSTRAINT "sponsor_task_completions_task_id_sponsor_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."sponsor_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_task_completions" ADD CONSTRAINT "sponsor_task_completions_sponsor_id_event_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."event_sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_tasks" ADD CONSTRAINT "sponsor_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_tasks" ADD CONSTRAINT "sponsor_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_document_activity_document" ON "document_activity" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_document_activity_created_at" ON "document_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_document_shares_document" ON "document_shares" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "IDX_document_shares_share_value" ON "document_shares" USING btree ("share_value");--> statement-breakpoint
CREATE UNIQUE INDEX "passkey_connections_org_idx" ON "passkey_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "passkey_event_mappings_event_idx" ON "passkey_event_mappings" USING btree ("event_id");
CREATE TABLE "brand_kits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" varchar(255) DEFAULT 'Default Brand Kit' NOT NULL,
	"source_url" varchar(500),
	"primary_color" varchar(20),
	"secondary_color" varchar(20),
	"accent_color" varchar(20),
	"text_color" varchar(20),
	"background_color" varchar(20),
	"button_color" varchar(20),
	"button_text_color" varchar(20),
	"button_border_color" varchar(20),
	"font_family" varchar(255),
	"heading_font_family" varchar(255),
	"logo_url" varchar(500),
	"status" varchar(20) DEFAULT 'draft',
	"is_default" boolean DEFAULT false,
	"extracted_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deliverables" ADD COLUMN "phase" varchar(50) DEFAULT 'pre_program';--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "execution_time" timestamp;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "planning_start_date" date;--> statement-breakpoint
ALTER TABLE "attendees" DROP COLUMN "emergency_contact";--> statement-breakpoint
ALTER TABLE "attendees" DROP COLUMN "emergency_phone";--> statement-breakpoint
ALTER TABLE "attendees" DROP COLUMN "emergency_email";
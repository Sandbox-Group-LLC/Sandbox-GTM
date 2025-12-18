ALTER TABLE "invite_codes" ADD COLUMN "cfp_submission_id" integer;--> statement-breakpoint
ALTER TABLE "social_posts" ADD COLUMN "connection_id" varchar;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id") ON DELETE no action ON UPDATE no action;
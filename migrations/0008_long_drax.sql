DROP INDEX "IDX_event_page_unique";--> statement-breakpoint
ALTER TABLE "event_pages" ADD COLUMN "name" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_event_page_unique" ON "event_pages" USING btree ("event_id","page_type","slug");
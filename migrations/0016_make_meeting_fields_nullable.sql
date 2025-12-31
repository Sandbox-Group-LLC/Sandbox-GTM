-- Make requester_id nullable for internal/portal meetings
ALTER TABLE "attendee_meetings" ALTER COLUMN "requester_id" DROP NOT NULL;

-- Make start_time and end_time nullable for meetings that aren't scheduled yet
ALTER TABLE "attendee_meetings" ALTER COLUMN "start_time" DROP NOT NULL;
ALTER TABLE "attendee_meetings" ALTER COLUMN "end_time" DROP NOT NULL;

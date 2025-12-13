import { db, pool } from "../server/db";
import {
  organizations,
  organizationMembers,
  users,
  events,
  attendees,
  attendeeTypes,
  speakers,
  eventSessions,
  contentItems,
  budgetItems,
  milestones,
  deliverables,
  emailCampaigns,
  socialPosts,
  emailTemplates,
} from "../shared/schema";
import { eq, isNull, and, notInArray } from "drizzle-orm";

async function backfillOrganization() {
  console.log("Starting organization backfill...");

  try {
    // 1. Create or get default organization
    let [defaultOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, "default"));

    if (!defaultOrg) {
      [defaultOrg] = await db
        .insert(organizations)
        .values({
          name: "Default Organization",
          slug: "default",
        })
        .returning();
      console.log("Created default organization:", defaultOrg.id);
    } else {
      console.log("Default organization already exists:", defaultOrg.id);
    }

    const orgId = defaultOrg.id;

    // 2. Add all existing users as members of the default organization with role "owner"
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to process`);

    for (const user of allUsers) {
      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, user.id)
          )
        );

      if (!existingMember) {
        await db.insert(organizationMembers).values({
          organizationId: orgId,
          userId: user.id,
          role: "owner",
        });
        console.log(`Added user ${user.id} as owner of default organization`);
      } else {
        console.log(`User ${user.id} is already a member of default organization`);
      }
    }

    // 3. Update all existing records that have null organizationId
    
    // Events
    const eventsResult = await db
      .update(events)
      .set({ organizationId: orgId })
      .where(isNull(events.organizationId))
      .returning({ id: events.id });
    console.log(`Updated ${eventsResult.length} events with default organization`);

    // Attendees
    const attendeesResult = await db
      .update(attendees)
      .set({ organizationId: orgId })
      .where(isNull(attendees.organizationId))
      .returning({ id: attendees.id });
    console.log(`Updated ${attendeesResult.length} attendees with default organization`);

    // Attendee Types
    const attendeeTypesResult = await db
      .update(attendeeTypes)
      .set({ organizationId: orgId })
      .where(isNull(attendeeTypes.organizationId))
      .returning({ id: attendeeTypes.id });
    console.log(`Updated ${attendeeTypesResult.length} attendee types with default organization`);

    // Speakers
    const speakersResult = await db
      .update(speakers)
      .set({ organizationId: orgId })
      .where(isNull(speakers.organizationId))
      .returning({ id: speakers.id });
    console.log(`Updated ${speakersResult.length} speakers with default organization`);

    // Event Sessions
    const sessionsResult = await db
      .update(eventSessions)
      .set({ organizationId: orgId })
      .where(isNull(eventSessions.organizationId))
      .returning({ id: eventSessions.id });
    console.log(`Updated ${sessionsResult.length} sessions with default organization`);

    // Content Items
    const contentResult = await db
      .update(contentItems)
      .set({ organizationId: orgId })
      .where(isNull(contentItems.organizationId))
      .returning({ id: contentItems.id });
    console.log(`Updated ${contentResult.length} content items with default organization`);

    // Budget Items
    const budgetResult = await db
      .update(budgetItems)
      .set({ organizationId: orgId })
      .where(isNull(budgetItems.organizationId))
      .returning({ id: budgetItems.id });
    console.log(`Updated ${budgetResult.length} budget items with default organization`);

    // Milestones
    const milestonesResult = await db
      .update(milestones)
      .set({ organizationId: orgId })
      .where(isNull(milestones.organizationId))
      .returning({ id: milestones.id });
    console.log(`Updated ${milestonesResult.length} milestones with default organization`);

    // Deliverables
    const deliverablesResult = await db
      .update(deliverables)
      .set({ organizationId: orgId })
      .where(isNull(deliverables.organizationId))
      .returning({ id: deliverables.id });
    console.log(`Updated ${deliverablesResult.length} deliverables with default organization`);

    // Email Campaigns
    const emailCampaignsResult = await db
      .update(emailCampaigns)
      .set({ organizationId: orgId })
      .where(isNull(emailCampaigns.organizationId))
      .returning({ id: emailCampaigns.id });
    console.log(`Updated ${emailCampaignsResult.length} email campaigns with default organization`);

    // Social Posts
    const socialPostsResult = await db
      .update(socialPosts)
      .set({ organizationId: orgId })
      .where(isNull(socialPosts.organizationId))
      .returning({ id: socialPosts.id });
    console.log(`Updated ${socialPostsResult.length} social posts with default organization`);

    // Email Templates
    const emailTemplatesResult = await db
      .update(emailTemplates)
      .set({ organizationId: orgId })
      .where(isNull(emailTemplates.organizationId))
      .returning({ id: emailTemplates.id });
    console.log(`Updated ${emailTemplatesResult.length} email templates with default organization`);

    console.log("\nBackfill complete!");
    console.log("Summary:");
    console.log(`  - Default Organization ID: ${orgId}`);
    console.log(`  - Users added as members: ${allUsers.length}`);
    console.log(`  - Events updated: ${eventsResult.length}`);
    console.log(`  - Attendees updated: ${attendeesResult.length}`);
    console.log(`  - Attendee Types updated: ${attendeeTypesResult.length}`);
    console.log(`  - Speakers updated: ${speakersResult.length}`);
    console.log(`  - Sessions updated: ${sessionsResult.length}`);
    console.log(`  - Content Items updated: ${contentResult.length}`);
    console.log(`  - Budget Items updated: ${budgetResult.length}`);
    console.log(`  - Milestones updated: ${milestonesResult.length}`);
    console.log(`  - Deliverables updated: ${deliverablesResult.length}`);
    console.log(`  - Email Campaigns updated: ${emailCampaignsResult.length}`);
    console.log(`  - Social Posts updated: ${socialPostsResult.length}`);
    console.log(`  - Email Templates updated: ${emailTemplatesResult.length}`);

  } catch (error) {
    console.error("Error during backfill:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

backfillOrganization().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});

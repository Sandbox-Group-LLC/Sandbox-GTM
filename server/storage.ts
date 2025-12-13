import {
  users,
  events,
  attendees,
  attendeeTypes,
  packages,
  eventPackages,
  inviteCodes,
  speakers,
  eventSessions,
  sessionSpeakers,
  contentItems,
  budgetItems,
  milestones,
  deliverables,
  emailCampaigns,
  socialPosts,
  emailTemplates,
  socialConnections,
  organizations,
  organizationMembers,
  type User,
  type UpsertUser,
  type Event,
  type InsertEvent,
  type Attendee,
  type InsertAttendee,
  type AttendeeType,
  type InsertAttendeeType,
  type Package,
  type InsertPackage,
  type EventPackage,
  type InsertEventPackage,
  type InviteCode,
  type InsertInviteCode,
  type Speaker,
  type InsertSpeaker,
  type EventSession,
  type InsertSession,
  type ContentItem,
  type InsertContentItem,
  type BudgetItem,
  type InsertBudgetItem,
  type Milestone,
  type InsertMilestone,
  type Deliverable,
  type InsertDeliverable,
  type EmailCampaign,
  type InsertEmailCampaign,
  type SocialPost,
  type InsertSocialPost,
  type EmailTemplate,
  type InsertEmailTemplate,
  type SocialConnection,
  type InsertSocialConnection,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getUserOrganizations(userId: string): Promise<OrganizationMember[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;

  // Event operations
  getEvents(organizationId: string): Promise<Event[]>;
  getEvent(organizationId: string, id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(organizationId: string, id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(organizationId: string, id: string): Promise<void>;

  // Attendee operations
  getAttendees(organizationId: string, eventId?: string): Promise<Attendee[]>;
  getAttendee(organizationId: string, id: string): Promise<Attendee | undefined>;
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  updateAttendee(organizationId: string, id: string, attendee: Partial<InsertAttendee>): Promise<Attendee | undefined>;
  deleteAttendee(organizationId: string, id: string): Promise<void>;

  // Attendee Type operations
  getAttendeeTypes(organizationId: string, eventId?: string): Promise<AttendeeType[]>;
  getAttendeeType(organizationId: string, id: string): Promise<AttendeeType | undefined>;
  createAttendeeType(attendeeType: InsertAttendeeType): Promise<AttendeeType>;
  updateAttendeeType(organizationId: string, id: string, attendeeType: Partial<InsertAttendeeType>): Promise<AttendeeType | undefined>;
  deleteAttendeeType(organizationId: string, id: string): Promise<void>;

  // Package operations (global to organization, not event-specific)
  getPackages(organizationId: string): Promise<Package[]>;
  getPackage(organizationId: string, id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(organizationId: string, id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(organizationId: string, id: string): Promise<void>;

  // Event Package operations (per-event package overrides)
  getEventPackages(organizationId: string, eventId: string): Promise<EventPackage[]>;
  getEventPackage(organizationId: string, eventId: string, packageId: string): Promise<EventPackage | undefined>;
  upsertEventPackage(eventPackage: InsertEventPackage): Promise<EventPackage>;
  deleteEventPackage(organizationId: string, eventId: string, packageId: string): Promise<void>;

  // Invite Code operations
  getInviteCodes(organizationId: string, eventId?: string): Promise<InviteCode[]>;
  getInviteCode(organizationId: string, id: string): Promise<InviteCode | undefined>;
  getInviteCodeByCode(organizationId: string, eventId: string, code: string): Promise<InviteCode | undefined>;
  createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode>;
  updateInviteCode(organizationId: string, id: string, inviteCode: Partial<InsertInviteCode>): Promise<InviteCode | undefined>;
  deleteInviteCode(organizationId: string, id: string): Promise<void>;

  // Speaker operations
  getSpeakers(organizationId: string, eventId?: string): Promise<Speaker[]>;
  getSpeaker(organizationId: string, id: string): Promise<Speaker | undefined>;
  createSpeaker(speaker: InsertSpeaker): Promise<Speaker>;
  updateSpeaker(organizationId: string, id: string, speaker: Partial<InsertSpeaker>): Promise<Speaker | undefined>;
  deleteSpeaker(organizationId: string, id: string): Promise<void>;

  // Session operations
  getSessions(organizationId: string, eventId?: string): Promise<EventSession[]>;
  getSession(organizationId: string, id: string): Promise<EventSession | undefined>;
  createSession(session: InsertSession): Promise<EventSession>;
  updateSession(organizationId: string, id: string, session: Partial<InsertSession>): Promise<EventSession | undefined>;
  deleteSession(organizationId: string, id: string): Promise<void>;

  // Content operations
  getContentItems(organizationId: string, eventId?: string): Promise<ContentItem[]>;
  getContentItem(organizationId: string, id: string): Promise<ContentItem | undefined>;
  createContentItem(item: InsertContentItem): Promise<ContentItem>;
  updateContentItem(organizationId: string, id: string, item: Partial<InsertContentItem>): Promise<ContentItem | undefined>;
  deleteContentItem(organizationId: string, id: string): Promise<void>;

  // Budget operations
  getBudgetItems(organizationId: string, eventId?: string): Promise<BudgetItem[]>;
  getBudgetItem(organizationId: string, id: string): Promise<BudgetItem | undefined>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(organizationId: string, id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(organizationId: string, id: string): Promise<void>;

  // Milestone operations
  getMilestones(organizationId: string, eventId?: string): Promise<Milestone[]>;
  getMilestone(organizationId: string, id: string): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(organizationId: string, id: string, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(organizationId: string, id: string): Promise<void>;

  // Deliverable operations
  getDeliverables(organizationId: string, eventId?: string): Promise<Deliverable[]>;
  getDeliverable(organizationId: string, id: string): Promise<Deliverable | undefined>;
  createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable>;
  updateDeliverable(organizationId: string, id: string, deliverable: Partial<InsertDeliverable>): Promise<Deliverable | undefined>;
  deleteDeliverable(organizationId: string, id: string): Promise<void>;

  // Email campaign operations
  getEmailCampaigns(organizationId: string, eventId?: string): Promise<EmailCampaign[]>;
  getEmailCampaign(organizationId: string, id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(organizationId: string, id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(organizationId: string, id: string): Promise<void>;

  // Social post operations
  getSocialPosts(organizationId: string, eventId?: string): Promise<SocialPost[]>;
  getSocialPost(organizationId: string, id: string): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(organizationId: string, id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined>;
  deleteSocialPost(organizationId: string, id: string): Promise<void>;

  // Email template operations
  getEmailTemplates(organizationId: string, eventId?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(organizationId: string, id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(organizationId: string, id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(organizationId: string, id: string): Promise<void>;

  // Check-in operations (code-based access - no organizationId needed)
  getAttendeeByCheckInCode(code: string): Promise<Attendee | undefined>;
  checkInAttendee(id: string): Promise<Attendee | undefined>;

  // Public event operations (public access - no organizationId needed)
  getEventBySlug(slug: string): Promise<Event | undefined>;

  // Social connection operations (user-scoped - no organizationId needed)
  getSocialConnections(userId: string): Promise<SocialConnection[]>;
  getSocialConnection(id: string): Promise<SocialConnection | undefined>;
  getSocialConnectionByPlatform(userId: string, platform: string): Promise<SocialConnection | undefined>;
  createSocialConnection(connection: InsertSocialConnection): Promise<SocialConnection>;
  updateSocialConnection(id: string, connection: Partial<InsertSocialConnection>): Promise<SocialConnection | undefined>;
  deleteSocialConnection(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const adminEmails = ['brian@makemysandbox.com'];
    const isAdmin = userData.email ? adminEmails.includes(userData.email.toLowerCase()) : false;
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    if (isAdmin && !user.isAdmin) {
      const [updatedUser] = await db
        .update(users)
        .set({ isAdmin: true })
        .where(eq(users.id, user.id))
        .returning();
      return updatedUser;
    }
    
    return user;
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [newMember] = await db.insert(organizationMembers).values(member).returning();
    return newMember;
  }

  // Event operations
  async getEvents(organizationId: string): Promise<Event[]> {
    return db.select().from(events).where(eq(events.organizationId, organizationId)).orderBy(desc(events.createdAt));
  }

  async getEvent(organizationId: string, id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.id, id)));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(organizationId: string, id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db
      .update(events)
      .set({ ...event, updatedAt: new Date() })
      .where(and(eq(events.organizationId, organizationId), eq(events.id, id)))
      .returning();
    return updated;
  }

  async deleteEvent(organizationId: string, id: string): Promise<void> {
    await db.delete(events).where(and(eq(events.organizationId, organizationId), eq(events.id, id)));
  }

  // Attendee operations
  async getAttendees(organizationId: string, eventId?: string): Promise<Attendee[]> {
    if (eventId) {
      return db.select().from(attendees).where(and(eq(attendees.organizationId, organizationId), eq(attendees.eventId, eventId))).orderBy(desc(attendees.createdAt));
    }
    return db.select().from(attendees).where(eq(attendees.organizationId, organizationId)).orderBy(desc(attendees.createdAt));
  }

  async getAttendee(organizationId: string, id: string): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees)
      .where(and(eq(attendees.organizationId, organizationId), eq(attendees.id, id)));
    return attendee;
  }

  async createAttendee(attendee: InsertAttendee): Promise<Attendee> {
    const [newAttendee] = await db.insert(attendees).values(attendee).returning();
    return newAttendee;
  }

  async updateAttendee(organizationId: string, id: string, attendee: Partial<InsertAttendee>): Promise<Attendee | undefined> {
    const [updated] = await db
      .update(attendees)
      .set({ ...attendee, updatedAt: new Date() })
      .where(and(eq(attendees.organizationId, organizationId), eq(attendees.id, id)))
      .returning();
    return updated;
  }

  async deleteAttendee(organizationId: string, id: string): Promise<void> {
    await db.delete(attendees).where(and(eq(attendees.organizationId, organizationId), eq(attendees.id, id)));
  }

  // Attendee Type operations
  async getAttendeeTypes(organizationId: string, eventId?: string): Promise<AttendeeType[]> {
    if (eventId) {
      return db.select().from(attendeeTypes).where(and(eq(attendeeTypes.organizationId, organizationId), eq(attendeeTypes.eventId, eventId))).orderBy(desc(attendeeTypes.createdAt));
    }
    return db.select().from(attendeeTypes).where(eq(attendeeTypes.organizationId, organizationId)).orderBy(desc(attendeeTypes.createdAt));
  }

  async getAttendeeType(organizationId: string, id: string): Promise<AttendeeType | undefined> {
    const [attendeeType] = await db.select().from(attendeeTypes)
      .where(and(eq(attendeeTypes.organizationId, organizationId), eq(attendeeTypes.id, id)));
    return attendeeType;
  }

  async createAttendeeType(attendeeType: InsertAttendeeType): Promise<AttendeeType> {
    const [newAttendeeType] = await db.insert(attendeeTypes).values(attendeeType).returning();
    return newAttendeeType;
  }

  async updateAttendeeType(organizationId: string, id: string, attendeeType: Partial<InsertAttendeeType>): Promise<AttendeeType | undefined> {
    const [updated] = await db
      .update(attendeeTypes)
      .set({ ...attendeeType, updatedAt: new Date() })
      .where(and(eq(attendeeTypes.organizationId, organizationId), eq(attendeeTypes.id, id)))
      .returning();
    return updated;
  }

  async deleteAttendeeType(organizationId: string, id: string): Promise<void> {
    await db.delete(attendeeTypes).where(and(eq(attendeeTypes.organizationId, organizationId), eq(attendeeTypes.id, id)));
  }

  // Package operations (global to organization, not event-specific)
  async getPackages(organizationId: string): Promise<Package[]> {
    return db.select().from(packages).where(eq(packages.organizationId, organizationId)).orderBy(desc(packages.createdAt));
  }

  async getPackage(organizationId: string, id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages)
      .where(and(eq(packages.organizationId, organizationId), eq(packages.id, id)));
    return pkg;
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [newPackage] = await db.insert(packages).values(pkg).returning();
    return newPackage;
  }

  async updatePackage(organizationId: string, id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined> {
    const [updated] = await db
      .update(packages)
      .set({ ...pkg, updatedAt: new Date() })
      .where(and(eq(packages.organizationId, organizationId), eq(packages.id, id)))
      .returning();
    return updated;
  }

  async deletePackage(organizationId: string, id: string): Promise<void> {
    await db.delete(packages).where(and(eq(packages.organizationId, organizationId), eq(packages.id, id)));
  }

  // Event Package operations
  async getEventPackages(organizationId: string, eventId: string): Promise<EventPackage[]> {
    return db.select().from(eventPackages)
      .where(and(eq(eventPackages.organizationId, organizationId), eq(eventPackages.eventId, eventId)));
  }

  async getEventPackage(organizationId: string, eventId: string, packageId: string): Promise<EventPackage | undefined> {
    const [eventPackage] = await db.select().from(eventPackages)
      .where(and(
        eq(eventPackages.organizationId, organizationId),
        eq(eventPackages.eventId, eventId),
        eq(eventPackages.packageId, packageId)
      ));
    return eventPackage;
  }

  async upsertEventPackage(eventPackage: InsertEventPackage): Promise<EventPackage> {
    const [result] = await db
      .insert(eventPackages)
      .values(eventPackage)
      .onConflictDoUpdate({
        target: [eventPackages.eventId, eventPackages.packageId],
        set: {
          priceOverride: eventPackage.priceOverride,
          featuresOverride: eventPackage.featuresOverride,
          isEnabled: eventPackage.isEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async deleteEventPackage(organizationId: string, eventId: string, packageId: string): Promise<void> {
    await db.delete(eventPackages).where(and(
      eq(eventPackages.organizationId, organizationId),
      eq(eventPackages.eventId, eventId),
      eq(eventPackages.packageId, packageId)
    ));
  }

  // Invite Code operations
  async getInviteCodes(organizationId: string, eventId?: string): Promise<InviteCode[]> {
    if (eventId) {
      return db.select().from(inviteCodes).where(and(eq(inviteCodes.organizationId, organizationId), eq(inviteCodes.eventId, eventId))).orderBy(desc(inviteCodes.createdAt));
    }
    return db.select().from(inviteCodes).where(eq(inviteCodes.organizationId, organizationId)).orderBy(desc(inviteCodes.createdAt));
  }

  async getInviteCode(organizationId: string, id: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes)
      .where(and(eq(inviteCodes.organizationId, organizationId), eq(inviteCodes.id, id)));
    return inviteCode;
  }

  async getInviteCodeByCode(organizationId: string, eventId: string, code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes)
      .where(and(
        eq(inviteCodes.organizationId, organizationId),
        eq(inviteCodes.eventId, eventId),
        eq(inviteCodes.code, code)
      ));
    return inviteCode;
  }

  async createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode> {
    const [newInviteCode] = await db.insert(inviteCodes).values(inviteCode).returning();
    return newInviteCode;
  }

  async updateInviteCode(organizationId: string, id: string, inviteCode: Partial<InsertInviteCode>): Promise<InviteCode | undefined> {
    const [updated] = await db
      .update(inviteCodes)
      .set({ ...inviteCode, updatedAt: new Date() })
      .where(and(eq(inviteCodes.organizationId, organizationId), eq(inviteCodes.id, id)))
      .returning();
    return updated;
  }

  async deleteInviteCode(organizationId: string, id: string): Promise<void> {
    await db.delete(inviteCodes).where(and(eq(inviteCodes.organizationId, organizationId), eq(inviteCodes.id, id)));
  }

  // Speaker operations
  async getSpeakers(organizationId: string, eventId?: string): Promise<Speaker[]> {
    if (eventId) {
      return db.select().from(speakers).where(and(eq(speakers.organizationId, organizationId), eq(speakers.eventId, eventId))).orderBy(desc(speakers.createdAt));
    }
    return db.select().from(speakers).where(eq(speakers.organizationId, organizationId)).orderBy(desc(speakers.createdAt));
  }

  async getSpeaker(organizationId: string, id: string): Promise<Speaker | undefined> {
    const [speaker] = await db.select().from(speakers)
      .where(and(eq(speakers.organizationId, organizationId), eq(speakers.id, id)));
    return speaker;
  }

  async createSpeaker(speaker: InsertSpeaker): Promise<Speaker> {
    const [newSpeaker] = await db.insert(speakers).values(speaker as typeof speakers.$inferInsert).returning();
    return newSpeaker;
  }

  async updateSpeaker(organizationId: string, id: string, speaker: Partial<InsertSpeaker>): Promise<Speaker | undefined> {
    const updatePayload = { ...speaker, updatedAt: new Date() } as Partial<typeof speakers.$inferInsert> & { updatedAt: Date };
    const [updated] = await db
      .update(speakers)
      .set(updatePayload)
      .where(and(eq(speakers.organizationId, organizationId), eq(speakers.id, id)))
      .returning();
    return updated;
  }

  async deleteSpeaker(organizationId: string, id: string): Promise<void> {
    await db.delete(speakers).where(and(eq(speakers.organizationId, organizationId), eq(speakers.id, id)));
  }

  // Session operations
  async getSessions(organizationId: string, eventId?: string): Promise<EventSession[]> {
    if (eventId) {
      return db.select().from(eventSessions).where(and(eq(eventSessions.organizationId, organizationId), eq(eventSessions.eventId, eventId))).orderBy(eventSessions.sessionDate);
    }
    return db.select().from(eventSessions).where(eq(eventSessions.organizationId, organizationId)).orderBy(eventSessions.sessionDate);
  }

  async getSession(organizationId: string, id: string): Promise<EventSession | undefined> {
    const [session] = await db.select().from(eventSessions)
      .where(and(eq(eventSessions.organizationId, organizationId), eq(eventSessions.id, id)));
    return session;
  }

  async createSession(session: InsertSession): Promise<EventSession> {
    const [newSession] = await db.insert(eventSessions).values(session).returning();
    return newSession;
  }

  async updateSession(organizationId: string, id: string, session: Partial<InsertSession>): Promise<EventSession | undefined> {
    const [updated] = await db
      .update(eventSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(and(eq(eventSessions.organizationId, organizationId), eq(eventSessions.id, id)))
      .returning();
    return updated;
  }

  async deleteSession(organizationId: string, id: string): Promise<void> {
    await db.delete(eventSessions).where(and(eq(eventSessions.organizationId, organizationId), eq(eventSessions.id, id)));
  }

  // Content operations
  async getContentItems(organizationId: string, eventId?: string): Promise<ContentItem[]> {
    if (eventId) {
      return db.select().from(contentItems).where(and(eq(contentItems.organizationId, organizationId), eq(contentItems.eventId, eventId))).orderBy(desc(contentItems.createdAt));
    }
    return db.select().from(contentItems).where(eq(contentItems.organizationId, organizationId)).orderBy(desc(contentItems.createdAt));
  }

  async getContentItem(organizationId: string, id: string): Promise<ContentItem | undefined> {
    const [item] = await db.select().from(contentItems)
      .where(and(eq(contentItems.organizationId, organizationId), eq(contentItems.id, id)));
    return item;
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const [newItem] = await db.insert(contentItems).values(item).returning();
    return newItem;
  }

  async updateContentItem(organizationId: string, id: string, item: Partial<InsertContentItem>): Promise<ContentItem | undefined> {
    const [updated] = await db
      .update(contentItems)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(contentItems.organizationId, organizationId), eq(contentItems.id, id)))
      .returning();
    return updated;
  }

  async deleteContentItem(organizationId: string, id: string): Promise<void> {
    await db.delete(contentItems).where(and(eq(contentItems.organizationId, organizationId), eq(contentItems.id, id)));
  }

  // Budget operations
  async getBudgetItems(organizationId: string, eventId?: string): Promise<BudgetItem[]> {
    if (eventId) {
      return db.select().from(budgetItems).where(and(eq(budgetItems.organizationId, organizationId), eq(budgetItems.eventId, eventId))).orderBy(desc(budgetItems.createdAt));
    }
    return db.select().from(budgetItems).where(eq(budgetItems.organizationId, organizationId)).orderBy(desc(budgetItems.createdAt));
  }

  async getBudgetItem(organizationId: string, id: string): Promise<BudgetItem | undefined> {
    const [item] = await db.select().from(budgetItems)
      .where(and(eq(budgetItems.organizationId, organizationId), eq(budgetItems.id, id)));
    return item;
  }

  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const [newItem] = await db.insert(budgetItems).values(item).returning();
    return newItem;
  }

  async updateBudgetItem(organizationId: string, id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const [updated] = await db
      .update(budgetItems)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(budgetItems.organizationId, organizationId), eq(budgetItems.id, id)))
      .returning();
    return updated;
  }

  async deleteBudgetItem(organizationId: string, id: string): Promise<void> {
    await db.delete(budgetItems).where(and(eq(budgetItems.organizationId, organizationId), eq(budgetItems.id, id)));
  }

  // Milestone operations
  async getMilestones(organizationId: string, eventId?: string): Promise<Milestone[]> {
    if (eventId) {
      return db.select().from(milestones).where(and(eq(milestones.organizationId, organizationId), eq(milestones.eventId, eventId))).orderBy(milestones.dueDate);
    }
    return db.select().from(milestones).where(eq(milestones.organizationId, organizationId)).orderBy(milestones.dueDate);
  }

  async getMilestone(organizationId: string, id: string): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones)
      .where(and(eq(milestones.organizationId, organizationId), eq(milestones.id, id)));
    return milestone;
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async updateMilestone(organizationId: string, id: string, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [updated] = await db
      .update(milestones)
      .set({ ...milestone, updatedAt: new Date() })
      .where(and(eq(milestones.organizationId, organizationId), eq(milestones.id, id)))
      .returning();
    return updated;
  }

  async deleteMilestone(organizationId: string, id: string): Promise<void> {
    await db.delete(milestones).where(and(eq(milestones.organizationId, organizationId), eq(milestones.id, id)));
  }

  // Deliverable operations
  async getDeliverables(organizationId: string, eventId?: string): Promise<Deliverable[]> {
    if (eventId) {
      return db.select().from(deliverables).where(and(eq(deliverables.organizationId, organizationId), eq(deliverables.eventId, eventId))).orderBy(desc(deliverables.createdAt));
    }
    return db.select().from(deliverables).where(eq(deliverables.organizationId, organizationId)).orderBy(desc(deliverables.createdAt));
  }

  async getDeliverable(organizationId: string, id: string): Promise<Deliverable | undefined> {
    const [deliverable] = await db.select().from(deliverables)
      .where(and(eq(deliverables.organizationId, organizationId), eq(deliverables.id, id)));
    return deliverable;
  }

  async createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable> {
    const [newDeliverable] = await db.insert(deliverables).values(deliverable).returning();
    return newDeliverable;
  }

  async updateDeliverable(organizationId: string, id: string, deliverable: Partial<InsertDeliverable>): Promise<Deliverable | undefined> {
    const [updated] = await db
      .update(deliverables)
      .set({ ...deliverable, updatedAt: new Date() })
      .where(and(eq(deliverables.organizationId, organizationId), eq(deliverables.id, id)))
      .returning();
    return updated;
  }

  async deleteDeliverable(organizationId: string, id: string): Promise<void> {
    await db.delete(deliverables).where(and(eq(deliverables.organizationId, organizationId), eq(deliverables.id, id)));
  }

  // Email campaign operations
  async getEmailCampaigns(organizationId: string, eventId?: string): Promise<EmailCampaign[]> {
    if (eventId) {
      return db.select().from(emailCampaigns).where(and(eq(emailCampaigns.organizationId, organizationId), eq(emailCampaigns.eventId, eventId))).orderBy(desc(emailCampaigns.createdAt));
    }
    return db.select().from(emailCampaigns).where(eq(emailCampaigns.organizationId, organizationId)).orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(organizationId: string, id: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns)
      .where(and(eq(emailCampaigns.organizationId, organizationId), eq(emailCampaigns.id, id)));
    return campaign;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [newCampaign] = await db.insert(emailCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateEmailCampaign(organizationId: string, id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [updated] = await db
      .update(emailCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(and(eq(emailCampaigns.organizationId, organizationId), eq(emailCampaigns.id, id)))
      .returning();
    return updated;
  }

  async deleteEmailCampaign(organizationId: string, id: string): Promise<void> {
    await db.delete(emailCampaigns).where(and(eq(emailCampaigns.organizationId, organizationId), eq(emailCampaigns.id, id)));
  }

  // Social post operations
  async getSocialPosts(organizationId: string, eventId?: string): Promise<SocialPost[]> {
    if (eventId) {
      return db.select().from(socialPosts).where(and(eq(socialPosts.organizationId, organizationId), eq(socialPosts.eventId, eventId))).orderBy(desc(socialPosts.createdAt));
    }
    return db.select().from(socialPosts).where(eq(socialPosts.organizationId, organizationId)).orderBy(desc(socialPosts.createdAt));
  }

  async getSocialPost(organizationId: string, id: string): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts)
      .where(and(eq(socialPosts.organizationId, organizationId), eq(socialPosts.id, id)));
    return post;
  }

  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [newPost] = await db.insert(socialPosts).values(post).returning();
    return newPost;
  }

  async updateSocialPost(organizationId: string, id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined> {
    const [updated] = await db
      .update(socialPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(and(eq(socialPosts.organizationId, organizationId), eq(socialPosts.id, id)))
      .returning();
    return updated;
  }

  async deleteSocialPost(organizationId: string, id: string): Promise<void> {
    await db.delete(socialPosts).where(and(eq(socialPosts.organizationId, organizationId), eq(socialPosts.id, id)));
  }

  // Email template operations
  async getEmailTemplates(organizationId: string, eventId?: string): Promise<EmailTemplate[]> {
    if (eventId) {
      return db.select().from(emailTemplates).where(and(eq(emailTemplates.organizationId, organizationId), eq(emailTemplates.eventId, eventId))).orderBy(desc(emailTemplates.createdAt));
    }
    return db.select().from(emailTemplates).where(eq(emailTemplates.organizationId, organizationId)).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(organizationId: string, id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates)
      .where(and(eq(emailTemplates.organizationId, organizationId), eq(emailTemplates.id, id)));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(organizationId: string, id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(emailTemplates.organizationId, organizationId), eq(emailTemplates.id, id)))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(organizationId: string, id: string): Promise<void> {
    await db.delete(emailTemplates).where(and(eq(emailTemplates.organizationId, organizationId), eq(emailTemplates.id, id)));
  }

  // Check-in operations (code-based access - no organizationId needed)
  async getAttendeeByCheckInCode(code: string): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees).where(eq(attendees.checkInCode, code));
    return attendee;
  }

  async checkInAttendee(id: string): Promise<Attendee | undefined> {
    const [updated] = await db
      .update(attendees)
      .set({ checkedIn: true, checkInTime: new Date(), updatedAt: new Date() })
      .where(eq(attendees.id, id))
      .returning();
    return updated;
  }

  // Public event operations (public access - no organizationId needed)
  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.publicSlug, slug));
    return event;
  }

  // Social connection operations (user-scoped - no organizationId needed)
  async getSocialConnections(userId: string): Promise<SocialConnection[]> {
    return db.select().from(socialConnections).where(eq(socialConnections.userId, userId)).orderBy(desc(socialConnections.createdAt));
  }

  async getSocialConnection(id: string): Promise<SocialConnection | undefined> {
    const [connection] = await db.select().from(socialConnections).where(eq(socialConnections.id, id));
    return connection;
  }

  async getSocialConnectionByPlatform(userId: string, platform: string): Promise<SocialConnection | undefined> {
    const [connection] = await db.select().from(socialConnections)
      .where(and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platform)));
    return connection;
  }

  async createSocialConnection(connection: InsertSocialConnection): Promise<SocialConnection> {
    const [newConnection] = await db.insert(socialConnections).values(connection).returning();
    return newConnection;
  }

  async updateSocialConnection(id: string, connection: Partial<InsertSocialConnection>): Promise<SocialConnection | undefined> {
    const [updated] = await db
      .update(socialConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(socialConnections.id, id))
      .returning();
    return updated;
  }

  async deleteSocialConnection(id: string): Promise<void> {
    await db.delete(socialConnections).where(eq(socialConnections.id, id));
  }
}

export const storage = new DatabaseStorage();

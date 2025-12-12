import {
  users,
  events,
  attendees,
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
  type User,
  type UpsertUser,
  type Event,
  type InsertEvent,
  type Attendee,
  type InsertAttendee,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Event operations
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;

  // Attendee operations
  getAttendees(eventId?: string): Promise<Attendee[]>;
  getAttendee(id: string): Promise<Attendee | undefined>;
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  updateAttendee(id: string, attendee: Partial<InsertAttendee>): Promise<Attendee | undefined>;
  deleteAttendee(id: string): Promise<void>;

  // Speaker operations
  getSpeakers(eventId?: string): Promise<Speaker[]>;
  getSpeaker(id: string): Promise<Speaker | undefined>;
  createSpeaker(speaker: InsertSpeaker): Promise<Speaker>;
  updateSpeaker(id: string, speaker: Partial<InsertSpeaker>): Promise<Speaker | undefined>;
  deleteSpeaker(id: string): Promise<void>;

  // Session operations
  getSessions(eventId?: string): Promise<EventSession[]>;
  getSession(id: string): Promise<EventSession | undefined>;
  createSession(session: InsertSession): Promise<EventSession>;
  updateSession(id: string, session: Partial<InsertSession>): Promise<EventSession | undefined>;
  deleteSession(id: string): Promise<void>;

  // Content operations
  getContentItems(eventId?: string): Promise<ContentItem[]>;
  getContentItem(id: string): Promise<ContentItem | undefined>;
  createContentItem(item: InsertContentItem): Promise<ContentItem>;
  updateContentItem(id: string, item: Partial<InsertContentItem>): Promise<ContentItem | undefined>;
  deleteContentItem(id: string): Promise<void>;

  // Budget operations
  getBudgetItems(eventId?: string): Promise<BudgetItem[]>;
  getBudgetItem(id: string): Promise<BudgetItem | undefined>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: string): Promise<void>;

  // Milestone operations
  getMilestones(eventId?: string): Promise<Milestone[]>;
  getMilestone(id: string): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<void>;

  // Deliverable operations
  getDeliverables(eventId?: string): Promise<Deliverable[]>;
  getDeliverable(id: string): Promise<Deliverable | undefined>;
  createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable>;
  updateDeliverable(id: string, deliverable: Partial<InsertDeliverable>): Promise<Deliverable | undefined>;
  deleteDeliverable(id: string): Promise<void>;

  // Email campaign operations
  getEmailCampaigns(eventId?: string): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: string): Promise<void>;

  // Social post operations
  getSocialPosts(eventId?: string): Promise<SocialPost[]>;
  getSocialPost(id: string): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined>;
  deleteSocialPost(id: string): Promise<void>;

  // Email template operations
  getEmailTemplates(eventId?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Check-in operations
  getAttendeeByCheckInCode(code: string): Promise<Attendee | undefined>;
  checkInAttendee(id: string): Promise<Attendee | undefined>;

  // Public event operations
  getEventBySlug(slug: string): Promise<Event | undefined>;

  // Social connection operations
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

  // Event operations
  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db
      .update(events)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Attendee operations
  async getAttendees(eventId?: string): Promise<Attendee[]> {
    if (eventId) {
      return db.select().from(attendees).where(eq(attendees.eventId, eventId)).orderBy(desc(attendees.createdAt));
    }
    return db.select().from(attendees).orderBy(desc(attendees.createdAt));
  }

  async getAttendee(id: string): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees).where(eq(attendees.id, id));
    return attendee;
  }

  async createAttendee(attendee: InsertAttendee): Promise<Attendee> {
    const [newAttendee] = await db.insert(attendees).values(attendee).returning();
    return newAttendee;
  }

  async updateAttendee(id: string, attendee: Partial<InsertAttendee>): Promise<Attendee | undefined> {
    const [updated] = await db
      .update(attendees)
      .set({ ...attendee, updatedAt: new Date() })
      .where(eq(attendees.id, id))
      .returning();
    return updated;
  }

  async deleteAttendee(id: string): Promise<void> {
    await db.delete(attendees).where(eq(attendees.id, id));
  }

  // Speaker operations
  async getSpeakers(eventId?: string): Promise<Speaker[]> {
    if (eventId) {
      return db.select().from(speakers).where(eq(speakers.eventId, eventId)).orderBy(desc(speakers.createdAt));
    }
    return db.select().from(speakers).orderBy(desc(speakers.createdAt));
  }

  async getSpeaker(id: string): Promise<Speaker | undefined> {
    const [speaker] = await db.select().from(speakers).where(eq(speakers.id, id));
    return speaker;
  }

  async createSpeaker(speaker: InsertSpeaker): Promise<Speaker> {
    const [newSpeaker] = await db.insert(speakers).values(speaker).returning();
    return newSpeaker;
  }

  async updateSpeaker(id: string, speaker: Partial<InsertSpeaker>): Promise<Speaker | undefined> {
    const [updated] = await db
      .update(speakers)
      .set({ ...speaker, updatedAt: new Date() })
      .where(eq(speakers.id, id))
      .returning();
    return updated;
  }

  async deleteSpeaker(id: string): Promise<void> {
    await db.delete(speakers).where(eq(speakers.id, id));
  }

  // Session operations
  async getSessions(eventId?: string): Promise<EventSession[]> {
    if (eventId) {
      return db.select().from(eventSessions).where(eq(eventSessions.eventId, eventId)).orderBy(eventSessions.sessionDate);
    }
    return db.select().from(eventSessions).orderBy(eventSessions.sessionDate);
  }

  async getSession(id: string): Promise<EventSession | undefined> {
    const [session] = await db.select().from(eventSessions).where(eq(eventSessions.id, id));
    return session;
  }

  async createSession(session: InsertSession): Promise<EventSession> {
    const [newSession] = await db.insert(eventSessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: string, session: Partial<InsertSession>): Promise<EventSession | undefined> {
    const [updated] = await db
      .update(eventSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(eventSessions.id, id))
      .returning();
    return updated;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(eventSessions).where(eq(eventSessions.id, id));
  }

  // Content operations
  async getContentItems(eventId?: string): Promise<ContentItem[]> {
    if (eventId) {
      return db.select().from(contentItems).where(eq(contentItems.eventId, eventId)).orderBy(desc(contentItems.createdAt));
    }
    return db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
  }

  async getContentItem(id: string): Promise<ContentItem | undefined> {
    const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id));
    return item;
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const [newItem] = await db.insert(contentItems).values(item).returning();
    return newItem;
  }

  async updateContentItem(id: string, item: Partial<InsertContentItem>): Promise<ContentItem | undefined> {
    const [updated] = await db
      .update(contentItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(contentItems.id, id))
      .returning();
    return updated;
  }

  async deleteContentItem(id: string): Promise<void> {
    await db.delete(contentItems).where(eq(contentItems.id, id));
  }

  // Budget operations
  async getBudgetItems(eventId?: string): Promise<BudgetItem[]> {
    if (eventId) {
      return db.select().from(budgetItems).where(eq(budgetItems.eventId, eventId)).orderBy(desc(budgetItems.createdAt));
    }
    return db.select().from(budgetItems).orderBy(desc(budgetItems.createdAt));
  }

  async getBudgetItem(id: string): Promise<BudgetItem | undefined> {
    const [item] = await db.select().from(budgetItems).where(eq(budgetItems.id, id));
    return item;
  }

  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const [newItem] = await db.insert(budgetItems).values(item).returning();
    return newItem;
  }

  async updateBudgetItem(id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const [updated] = await db
      .update(budgetItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(budgetItems.id, id))
      .returning();
    return updated;
  }

  async deleteBudgetItem(id: string): Promise<void> {
    await db.delete(budgetItems).where(eq(budgetItems.id, id));
  }

  // Milestone operations
  async getMilestones(eventId?: string): Promise<Milestone[]> {
    if (eventId) {
      return db.select().from(milestones).where(eq(milestones.eventId, eventId)).orderBy(milestones.dueDate);
    }
    return db.select().from(milestones).orderBy(milestones.dueDate);
  }

  async getMilestone(id: string): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async updateMilestone(id: string, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [updated] = await db
      .update(milestones)
      .set({ ...milestone, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return updated;
  }

  async deleteMilestone(id: string): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // Deliverable operations
  async getDeliverables(eventId?: string): Promise<Deliverable[]> {
    if (eventId) {
      return db.select().from(deliverables).where(eq(deliverables.eventId, eventId)).orderBy(desc(deliverables.createdAt));
    }
    return db.select().from(deliverables).orderBy(desc(deliverables.createdAt));
  }

  async getDeliverable(id: string): Promise<Deliverable | undefined> {
    const [deliverable] = await db.select().from(deliverables).where(eq(deliverables.id, id));
    return deliverable;
  }

  async createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable> {
    const [newDeliverable] = await db.insert(deliverables).values(deliverable).returning();
    return newDeliverable;
  }

  async updateDeliverable(id: string, deliverable: Partial<InsertDeliverable>): Promise<Deliverable | undefined> {
    const [updated] = await db
      .update(deliverables)
      .set({ ...deliverable, updatedAt: new Date() })
      .where(eq(deliverables.id, id))
      .returning();
    return updated;
  }

  async deleteDeliverable(id: string): Promise<void> {
    await db.delete(deliverables).where(eq(deliverables.id, id));
  }

  // Email campaign operations
  async getEmailCampaigns(eventId?: string): Promise<EmailCampaign[]> {
    if (eventId) {
      return db.select().from(emailCampaigns).where(eq(emailCampaigns.eventId, eventId)).orderBy(desc(emailCampaigns.createdAt));
    }
    return db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [newCampaign] = await db.insert(emailCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateEmailCampaign(id: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [updated] = await db
      .update(emailCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(emailCampaigns.id, id))
      .returning();
    return updated;
  }

  async deleteEmailCampaign(id: string): Promise<void> {
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
  }

  // Social post operations
  async getSocialPosts(eventId?: string): Promise<SocialPost[]> {
    if (eventId) {
      return db.select().from(socialPosts).where(eq(socialPosts.eventId, eventId)).orderBy(desc(socialPosts.createdAt));
    }
    return db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt));
  }

  async getSocialPost(id: string): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post;
  }

  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [newPost] = await db.insert(socialPosts).values(post).returning();
    return newPost;
  }

  async updateSocialPost(id: string, post: Partial<InsertSocialPost>): Promise<SocialPost | undefined> {
    const [updated] = await db
      .update(socialPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
      .returning();
    return updated;
  }

  async deleteSocialPost(id: string): Promise<void> {
    await db.delete(socialPosts).where(eq(socialPosts.id, id));
  }

  // Email template operations
  async getEmailTemplates(eventId?: string): Promise<EmailTemplate[]> {
    if (eventId) {
      return db.select().from(emailTemplates).where(eq(emailTemplates.eventId, eventId)).orderBy(desc(emailTemplates.createdAt));
    }
    return db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Check-in operations
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

  // Public event operations
  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.publicSlug, slug));
    return event;
  }

  // Social connection operations
  async getSocialConnections(userId: string): Promise<SocialConnection[]> {
    return db.select().from(socialConnections).where(eq(socialConnections.userId, userId)).orderBy(desc(socialConnections.createdAt));
  }

  async getSocialConnection(id: string): Promise<SocialConnection | undefined> {
    const [connection] = await db.select().from(socialConnections).where(eq(socialConnections.id, id));
    return connection;
  }

  async getSocialConnectionByPlatform(userId: string, platform: string): Promise<SocialConnection | undefined> {
    const connections = await db.select().from(socialConnections)
      .where(eq(socialConnections.userId, userId));
    return connections.find(c => c.platform === platform);
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

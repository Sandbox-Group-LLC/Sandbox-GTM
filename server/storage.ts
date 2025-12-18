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
  sessionTracks,
  sessionRooms,
  contentItems,
  budgetItems,
  budgetCategories,
  budgetOffsets,
  eventBudgetSettings,
  budgetPayments,
  milestones,
  deliverables,
  emailCampaigns,
  socialPosts,
  emailTemplates,
  socialConnections,
  organizations,
  organizationMembers,
  eventPages,
  pageVersions,
  registrationConfigs,
  customFields,
  contentAssets,
  eventSponsors,
  emailMessages,
  emailEvents,
  emailSuppressions,
  socialMediaCredentials,
  emailPlatformConnections,
  emailPlatformAudiences,
  emailSyncJobs,
  signupInviteCodes,
  signupInviteCodeRedemptions,
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
  type SessionTrack,
  type InsertSessionTrack,
  type SessionRoom,
  type InsertSessionRoom,
  type SessionSpeaker,
  type InsertSessionSpeaker,
  type ContentItem,
  type InsertContentItem,
  type BudgetItem,
  type InsertBudgetItem,
  type BudgetCategory,
  type InsertBudgetCategory,
  type BudgetOffset,
  type InsertBudgetOffset,
  type EventBudgetSettings,
  type InsertEventBudgetSettings,
  type BudgetPayment,
  type InsertBudgetPayment,
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
  type EventPage,
  type InsertEventPage,
  type PageVersion,
  type InsertPageVersion,
  type RegistrationConfig,
  type InsertRegistrationConfig,
  type CustomField,
  type InsertCustomField,
  type ContentAsset,
  type InsertContentAsset,
  type EventSponsor,
  type InsertEventSponsor,
  cfpConfigs,
  cfpTopics,
  cfpSubmissions,
  cfpReviewers,
  cfpReviews,
  type CfpConfig,
  type InsertCfpConfig,
  type CfpTopic,
  type InsertCfpTopic,
  type CfpSubmission,
  type InsertCfpSubmission,
  type CfpReviewer,
  type InsertCfpReviewer,
  type CfpReview,
  type InsertCfpReview,
  type EmailMessage,
  type InsertEmailMessage,
  type EmailEvent,
  type InsertEmailEvent,
  type EmailSuppression,
  type InsertEmailSuppression,
  type SocialMediaCredential,
  type InsertSocialMediaCredential,
  type EmailPlatformConnection,
  type InsertEmailPlatformConnection,
  type EmailPlatformAudience,
  type InsertEmailPlatformAudience,
  type EmailSyncJob,
  type InsertEmailSyncJob,
  type SignupInviteCode,
  type InsertSignupInviteCode,
  type SignupInviteCodeRedemption,
  type InsertSignupInviteCodeRedemption,
} from "@shared/schema";
import { encrypt, decrypt } from "./encryption";
import { db } from "./db";
import { eq, desc, and, ilike, or, isNull, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<OrganizationMember[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  getAllOrganizationsWithStats(): Promise<Array<Organization & { memberCount: number; eventCount: number; attendeeCount: number }>>;
  deleteOrganization(id: string): Promise<void>;

  // Event operations
  getEvents(organizationId: string): Promise<Event[]>;
  getEvent(organizationId: string, id: string): Promise<Event | undefined>;
  getEventByPublicSlug(slug: string): Promise<Event | undefined>;
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
  getEventPackagesByPackageId(organizationId: string, packageId: string): Promise<EventPackage[]>;
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

  // Event Sponsor operations
  getEventSponsors(organizationId: string, eventId: string, options?: { tier?: string; limit?: number; activeOnly?: boolean }): Promise<EventSponsor[]>;
  getEventSponsor(organizationId: string, id: string): Promise<EventSponsor | undefined>;
  createEventSponsor(sponsor: InsertEventSponsor): Promise<EventSponsor>;
  updateEventSponsor(organizationId: string, id: string, sponsor: Partial<InsertEventSponsor>): Promise<EventSponsor | undefined>;
  deleteEventSponsor(organizationId: string, id: string): Promise<void>;

  // Session operations
  getSessions(organizationId: string, eventId?: string): Promise<EventSession[]>;
  getSession(organizationId: string, id: string): Promise<EventSession | undefined>;
  createSession(session: InsertSession): Promise<EventSession>;
  updateSession(organizationId: string, id: string, session: Partial<InsertSession>): Promise<EventSession | undefined>;
  deleteSession(organizationId: string, id: string): Promise<void>;

  // Session Track operations
  getSessionTracks(organizationId: string): Promise<SessionTrack[]>;
  getSessionTrack(organizationId: string, id: string): Promise<SessionTrack | undefined>;
  createSessionTrack(track: InsertSessionTrack): Promise<SessionTrack>;
  updateSessionTrack(organizationId: string, id: string, track: Partial<InsertSessionTrack>): Promise<SessionTrack | undefined>;
  deleteSessionTrack(organizationId: string, id: string): Promise<void>;

  // Session Room operations
  getSessionRooms(organizationId: string): Promise<SessionRoom[]>;
  getSessionRoom(organizationId: string, id: string): Promise<SessionRoom | undefined>;
  createSessionRoom(room: InsertSessionRoom): Promise<SessionRoom>;
  updateSessionRoom(organizationId: string, id: string, room: Partial<InsertSessionRoom>): Promise<SessionRoom | undefined>;
  deleteSessionRoom(organizationId: string, id: string): Promise<void>;

  // Session Speaker operations (junction table)
  getSessionSpeakersBySession(organizationId: string, sessionId: string): Promise<SessionSpeaker[]>;
  getSessionSpeakersBySpeaker(organizationId: string, speakerId: string): Promise<SessionSpeaker[]>;
  createSessionSpeaker(sessionSpeaker: InsertSessionSpeaker): Promise<SessionSpeaker>;
  deleteSessionSpeaker(sessionId: string, speakerId: string): Promise<void>;
  setSessionSpeakers(organizationId: string, sessionId: string, speakerIds: string[]): Promise<void>;
  setSpeakerSessions(organizationId: string, speakerId: string, sessionIds: string[]): Promise<void>;

  // Content operations
  getContentItems(organizationId: string, eventId?: string, sessionId?: string): Promise<ContentItem[]>;
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

  // Budget Category operations
  getBudgetCategories(organizationId: string): Promise<BudgetCategory[]>;
  getBudgetCategory(organizationId: string, id: string): Promise<BudgetCategory | undefined>;
  createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory>;
  updateBudgetCategory(organizationId: string, id: string, category: Partial<InsertBudgetCategory>): Promise<BudgetCategory | undefined>;
  deleteBudgetCategory(organizationId: string, id: string): Promise<void>;

  // Budget Offset operations
  getBudgetOffsets(organizationId: string, eventId?: string): Promise<BudgetOffset[]>;
  getBudgetOffset(organizationId: string, id: string): Promise<BudgetOffset | undefined>;
  createBudgetOffset(offset: InsertBudgetOffset): Promise<BudgetOffset>;
  updateBudgetOffset(organizationId: string, id: string, offset: Partial<InsertBudgetOffset>): Promise<BudgetOffset | undefined>;
  deleteBudgetOffset(organizationId: string, id: string): Promise<void>;

  // Event Budget Settings operations
  getEventBudgetSettings(eventId: string): Promise<EventBudgetSettings | undefined>;
  upsertEventBudgetSettings(settings: InsertEventBudgetSettings): Promise<EventBudgetSettings>;

  // Budget Payment operations
  getBudgetPayments(organizationId: string, eventId?: string): Promise<BudgetPayment[]>;
  getBudgetPayment(organizationId: string, id: string): Promise<BudgetPayment | undefined>;
  createBudgetPayment(payment: InsertBudgetPayment): Promise<BudgetPayment>;
  updateBudgetPayment(organizationId: string, id: string, payment: Partial<InsertBudgetPayment>): Promise<BudgetPayment | undefined>;
  deleteBudgetPayment(organizationId: string, id: string): Promise<void>;

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

  // Attendee lookup for login (efficient single query)
  getAttendeeByEventAndEmail(eventId: string, email: string): Promise<Attendee | undefined>;

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

  // Event Page operations (site builder)
  getEventPages(organizationId: string, eventId: string): Promise<EventPage[]>;
  getEventPage(organizationId: string, id: string): Promise<EventPage | undefined>;
  getEventPageByType(organizationId: string, eventId: string, pageType: string): Promise<EventPage | undefined>;
  createEventPage(page: InsertEventPage): Promise<EventPage>;
  updateEventPage(organizationId: string, id: string, page: Partial<InsertEventPage>): Promise<EventPage | undefined>;
  upsertEventPage(page: InsertEventPage): Promise<EventPage>;
  deleteEventPage(organizationId: string, id: string): Promise<void>;
  getPublishedLandingPagesForSitemap(): Promise<Array<{ slug: string | null; updatedAt: Date | null }>>;

  // Page Version operations (version history)
  getPageVersions(organizationId: string, eventPageId: string): Promise<PageVersion[]>;
  getPageVersion(organizationId: string, id: string): Promise<PageVersion | undefined>;
  createPageVersion(version: InsertPageVersion): Promise<PageVersion>;
  getLatestVersionNumber(organizationId: string, eventPageId: string): Promise<number>;

  // Registration Config operations
  getRegistrationConfig(organizationId: string, eventId: string): Promise<RegistrationConfig | undefined>;
  upsertRegistrationConfig(config: InsertRegistrationConfig): Promise<RegistrationConfig>;

  // Custom Field operations
  getCustomFields(organizationId: string): Promise<CustomField[]>;
  getCustomField(organizationId: string, id: string): Promise<CustomField | undefined>;
  createCustomField(field: InsertCustomField): Promise<CustomField>;
  updateCustomField(organizationId: string, id: string, field: Partial<InsertCustomField>): Promise<CustomField | undefined>;
  deleteCustomField(organizationId: string, id: string): Promise<void>;
  getActiveCustomFieldsByEventSlug(slug: string): Promise<CustomField[]>;

  // Content Asset operations
  createContentAsset(asset: InsertContentAsset): Promise<ContentAsset>;
  getContentAssets(organizationId: string): Promise<ContentAsset[]>;
  getContentAsset(id: string, organizationId: string): Promise<ContentAsset | undefined>;
  deleteContentAsset(id: string, organizationId: string): Promise<void>;

  // CFP Config operations
  getCfpConfig(eventId: string, organizationId: string): Promise<CfpConfig | undefined>;
  createCfpConfig(config: InsertCfpConfig): Promise<CfpConfig>;
  updateCfpConfig(id: number, organizationId: string, updates: Partial<InsertCfpConfig>): Promise<CfpConfig | undefined>;

  // CFP Topic operations
  getCfpTopics(cfpConfigId: number, organizationId: string): Promise<CfpTopic[]>;
  createCfpTopic(topic: InsertCfpTopic): Promise<CfpTopic>;
  updateCfpTopic(id: number, organizationId: string, updates: Partial<InsertCfpTopic>): Promise<CfpTopic | undefined>;
  deleteCfpTopic(id: number, organizationId: string): Promise<boolean>;

  // CFP Submission operations
  getCfpSubmissions(cfpConfigId: number, organizationId: string): Promise<CfpSubmission[]>;
  getCfpSubmission(id: number, organizationId: string): Promise<CfpSubmission | undefined>;
  createCfpSubmission(submission: InsertCfpSubmission): Promise<CfpSubmission>;
  updateCfpSubmission(id: number, organizationId: string, updates: Partial<InsertCfpSubmission>): Promise<CfpSubmission | undefined>;
  deleteCfpSubmission(id: number, organizationId: string): Promise<boolean>;
  getCfpSubmissionsByEmail(cfpConfigId: number, email: string): Promise<CfpSubmission[]>;

  // CFP Reviewer operations
  getCfpReviewers(cfpConfigId: number, organizationId: string): Promise<CfpReviewer[]>;
  getCfpReviewer(id: number, organizationId: string): Promise<CfpReviewer | undefined>;
  getCfpReviewerByEmail(cfpConfigId: number, email: string): Promise<CfpReviewer | undefined>;
  getCfpReviewersByEmail(email: string): Promise<CfpReviewer[]>;
  getCfpReviewersByUserId(userId: string): Promise<CfpReviewer[]>;
  createCfpReviewer(reviewer: InsertCfpReviewer): Promise<CfpReviewer>;
  updateCfpReviewer(id: number, organizationId: string, updates: Partial<InsertCfpReviewer>): Promise<CfpReviewer | undefined>;
  deleteCfpReviewer(id: number, organizationId: string): Promise<boolean>;

  // CFP Review operations
  getCfpReviews(submissionId: number, organizationId: string): Promise<CfpReview[]>;
  getCfpReviewsByReviewer(reviewerId: number, organizationId: string): Promise<CfpReview[]>;
  createCfpReview(review: InsertCfpReview): Promise<CfpReview>;
  updateCfpReview(id: number, organizationId: string, updates: Partial<InsertCfpReview>): Promise<CfpReview | undefined>;
  assignReviewerToSubmission(submissionId: number, reviewerId: number, organizationId: string): Promise<CfpReview>;

  // Email Message operations
  createEmailMessage(message: InsertEmailMessage): Promise<EmailMessage>;
  getEmailMessage(id: string): Promise<EmailMessage | undefined>;
  getEmailMessagesByAttendee(organizationId: string, attendeeId: string): Promise<EmailMessage[]>;
  getEmailMessagesByCampaign(organizationId: string, campaignId: string): Promise<EmailMessage[]>;
  getEmailMessageByResendId(resendMessageId: string): Promise<EmailMessage | undefined>;
  updateEmailMessage(id: string, updates: Partial<InsertEmailMessage>): Promise<EmailMessage | undefined>;
  incrementEmailOpenCount(id: string): Promise<EmailMessage | undefined>;
  incrementEmailClickCount(id: string): Promise<EmailMessage | undefined>;

  // Email Event operations
  createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent>;
  getEmailEventsByMessage(messageId: string): Promise<EmailEvent[]>;

  // Email Suppression operations
  createEmailSuppression(suppression: InsertEmailSuppression): Promise<EmailSuppression>;
  getEmailSuppression(organizationId: string, email: string): Promise<EmailSuppression | undefined>;
  getEmailSuppressions(organizationId: string): Promise<EmailSuppression[]>;
  deleteEmailSuppression(organizationId: string, email: string): Promise<void>;

  // Email Analytics
  getEmailAnalyticsByCampaign(organizationId: string, campaignId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    uniqueOpens: number;
    uniqueClicks: number;
  }>;

  // Social Media Credentials operations
  getSocialMediaCredentials(organizationId: string): Promise<SocialMediaCredential[]>;
  getSocialMediaCredential(organizationId: string, provider: string): Promise<SocialMediaCredential | null>;
  upsertSocialMediaCredential(organizationId: string, provider: string, clientId: string, clientSecret: string, userId: string): Promise<SocialMediaCredential>;
  deleteSocialMediaCredential(organizationId: string, provider: string): Promise<void>;

  // Email Platform Connection operations
  getEmailPlatformConnections(organizationId: string): Promise<EmailPlatformConnection[]>;
  getEmailPlatformConnection(organizationId: string, id: string): Promise<EmailPlatformConnection | undefined>;
  getEmailPlatformConnectionByProvider(organizationId: string, provider: string): Promise<EmailPlatformConnection | undefined>;
  createEmailPlatformConnection(data: InsertEmailPlatformConnection): Promise<EmailPlatformConnection>;
  updateEmailPlatformConnection(organizationId: string, id: string, data: Partial<InsertEmailPlatformConnection>): Promise<EmailPlatformConnection | undefined>;
  deleteEmailPlatformConnection(organizationId: string, id: string): Promise<void>;

  // Email Platform Audience operations
  getEmailPlatformAudiences(connectionId: string): Promise<EmailPlatformAudience[]>;
  upsertEmailPlatformAudience(data: InsertEmailPlatformAudience): Promise<EmailPlatformAudience>;
  deleteEmailPlatformAudiences(connectionId: string): Promise<void>;

  // Email Sync Job operations
  getEmailSyncJobs(organizationId: string, connectionId?: string): Promise<EmailSyncJob[]>;
  createEmailSyncJob(data: InsertEmailSyncJob): Promise<EmailSyncJob>;
  updateEmailSyncJob(id: string, data: Partial<InsertEmailSyncJob>): Promise<EmailSyncJob | undefined>;

  // Signup Invite Code operations (super admin only)
  getSignupInviteCodes(): Promise<SignupInviteCode[]>;
  getSignupInviteCode(id: string): Promise<SignupInviteCode | undefined>;
  getSignupInviteCodeByCode(code: string): Promise<SignupInviteCode | undefined>;
  createSignupInviteCode(data: InsertSignupInviteCode): Promise<SignupInviteCode>;
  updateSignupInviteCode(id: string, data: Partial<InsertSignupInviteCode>): Promise<SignupInviteCode | undefined>;
  deleteSignupInviteCode(id: string): Promise<void>;
  validateSignupInviteCode(code: string): Promise<{ valid: boolean; discountPercent?: number | null }>;
  redeemSignupInviteCode(code: string, userId: string, organizationId: string | null): Promise<SignupInviteCodeRedemption>;
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

  async updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db
      .update(organizations)
      .set({ ...org, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async getUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    return db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          or(eq(organizations.isArchived, false), isNull(organizations.isArchived))
        )
      );
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [newMember] = await db.insert(organizationMembers).values(member).returning();
    return newMember;
  }

  async getAllOrganizationsWithStats(): Promise<Array<Organization & { memberCount: number; eventCount: number; attendeeCount: number }>> {
    const allOrgs = await db
      .select()
      .from(organizations)
      .where(or(eq(organizations.isArchived, false), isNull(organizations.isArchived)))
      .orderBy(desc(organizations.createdAt));
    
    const orgsWithStats = await Promise.all(allOrgs.map(async (org) => {
      const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, org.id));
      const orgEvents = await db.select().from(events).where(eq(events.organizationId, org.id));
      const orgAttendees = await db.select().from(attendees).where(eq(attendees.organizationId, org.id));
      
      return {
        ...org,
        memberCount: members.length,
        eventCount: orgEvents.length,
        attendeeCount: orgAttendees.length,
      };
    }));
    
    return orgsWithStats;
  }

  async deleteOrganization(id: string): Promise<void> {
    await db.delete(budgetPayments).where(eq(budgetPayments.organizationId, id));
    await db.delete(budgetOffsets).where(eq(budgetOffsets.organizationId, id));
    await db.delete(budgetItems).where(eq(budgetItems.organizationId, id));
    await db.delete(budgetCategories).where(eq(budgetCategories.organizationId, id));
    const orgEvents = await db.select({ id: events.id }).from(events).where(eq(events.organizationId, id));
    for (const event of orgEvents) {
      await db.delete(eventBudgetSettings).where(eq(eventBudgetSettings.eventId, event.id));
    }
    await db.delete(eventPackages).where(eq(eventPackages.organizationId, id));
    await db.delete(packages).where(eq(packages.organizationId, id));
    await db.delete(inviteCodes).where(eq(inviteCodes.organizationId, id));
    await db.delete(eventPages).where(eq(eventPages.organizationId, id));
    await db.delete(registrationConfigs).where(eq(registrationConfigs.organizationId, id));
    await db.delete(customFields).where(eq(customFields.organizationId, id));
    await db.delete(contentAssets).where(eq(contentAssets.organizationId, id));
    await db.delete(emailTemplates).where(eq(emailTemplates.organizationId, id));
    await db.delete(emailCampaigns).where(eq(emailCampaigns.organizationId, id));
    await db.delete(socialPosts).where(eq(socialPosts.organizationId, id));
    const orgMembers = await db.select({ userId: organizationMembers.userId }).from(organizationMembers).where(eq(organizationMembers.organizationId, id));
    for (const member of orgMembers) {
      await db.delete(socialConnections).where(eq(socialConnections.userId, member.userId));
    }
    await db.delete(deliverables).where(eq(deliverables.organizationId, id));
    await db.delete(milestones).where(eq(milestones.organizationId, id));
    await db.delete(contentItems).where(eq(contentItems.organizationId, id));
    // Delete sessionSpeakers junction table entries before sessions/speakers
    const orgSessions = await db.select({ id: eventSessions.id }).from(eventSessions).where(eq(eventSessions.organizationId, id));
    for (const session of orgSessions) {
      await db.delete(sessionSpeakers).where(eq(sessionSpeakers.sessionId, session.id));
    }
    await db.delete(eventSessions).where(eq(eventSessions.organizationId, id));
    await db.delete(eventSponsors).where(eq(eventSponsors.organizationId, id));
    await db.delete(speakers).where(eq(speakers.organizationId, id));
    await db.delete(attendeeTypes).where(eq(attendeeTypes.organizationId, id));
    await db.delete(attendees).where(eq(attendees.organizationId, id));
    await db.delete(events).where(eq(events.organizationId, id));
    await db.delete(organizationMembers).where(eq(organizationMembers.organizationId, id));
    await db.delete(organizations).where(eq(organizations.id, id));
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

  async getEventByPublicSlug(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events)
      .where(eq(events.publicSlug, slug));
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
    // Delete all related records first (cascade delete)
    await db.delete(attendees).where(eq(attendees.eventId, id));
    await db.delete(attendeeTypes).where(eq(attendeeTypes.eventId, id));
    await db.delete(eventPackages).where(eq(eventPackages.eventId, id));
    await db.delete(inviteCodes).where(eq(inviteCodes.eventId, id));
    await db.delete(eventSponsors).where(eq(eventSponsors.eventId, id));
    await db.delete(speakers).where(eq(speakers.eventId, id));
    await db.delete(eventSessions).where(eq(eventSessions.eventId, id));
    await db.delete(contentItems).where(eq(contentItems.eventId, id));
    await db.delete(budgetItems).where(eq(budgetItems.eventId, id));
    await db.delete(budgetOffsets).where(eq(budgetOffsets.eventId, id));
    await db.delete(eventBudgetSettings).where(eq(eventBudgetSettings.eventId, id));
    await db.delete(budgetPayments).where(eq(budgetPayments.eventId, id));
    await db.delete(milestones).where(eq(milestones.eventId, id));
    await db.delete(deliverables).where(eq(deliverables.eventId, id));
    await db.delete(emailCampaigns).where(eq(emailCampaigns.eventId, id));
    await db.delete(socialPosts).where(eq(socialPosts.eventId, id));
    await db.delete(emailTemplates).where(eq(emailTemplates.eventId, id));
    await db.delete(eventPages).where(eq(eventPages.eventId, id));
    await db.delete(registrationConfigs).where(eq(registrationConfigs.eventId, id));
    
    // Now delete the event itself
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

  async getAttendeeByEventAndEmail(eventId: string, email: string): Promise<Attendee | undefined> {
    const [attendee] = await db.select().from(attendees)
      .where(and(eq(attendees.eventId, eventId), ilike(attendees.email, email)));
    return attendee;
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

  async getEventPackagesByPackageId(organizationId: string, packageId: string): Promise<EventPackage[]> {
    return db.select().from(eventPackages)
      .where(and(eq(eventPackages.organizationId, organizationId), eq(eventPackages.packageId, packageId)));
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

  // Event Sponsor operations
  async getEventSponsors(organizationId: string, eventId: string, options?: { tier?: string; limit?: number; activeOnly?: boolean }): Promise<EventSponsor[]> {
    let results = await db.select().from(eventSponsors)
      .where(and(eq(eventSponsors.organizationId, organizationId), eq(eventSponsors.eventId, eventId)))
      .orderBy(eventSponsors.displayOrder);
    
    let filtered = results;
    if (options?.activeOnly) {
      filtered = filtered.filter(s => s.isActive);
    }
    if (options?.tier) {
      filtered = filtered.filter(s => s.tier === options.tier);
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    return filtered;
  }

  async getEventSponsor(organizationId: string, id: string): Promise<EventSponsor | undefined> {
    const [sponsor] = await db.select().from(eventSponsors)
      .where(and(eq(eventSponsors.organizationId, organizationId), eq(eventSponsors.id, id)));
    return sponsor;
  }

  async createEventSponsor(sponsor: InsertEventSponsor): Promise<EventSponsor> {
    const [newSponsor] = await db.insert(eventSponsors).values(sponsor).returning();
    return newSponsor;
  }

  async updateEventSponsor(organizationId: string, id: string, sponsor: Partial<InsertEventSponsor>): Promise<EventSponsor | undefined> {
    const [updated] = await db
      .update(eventSponsors)
      .set(sponsor)
      .where(and(eq(eventSponsors.organizationId, organizationId), eq(eventSponsors.id, id)))
      .returning();
    return updated;
  }

  async deleteEventSponsor(organizationId: string, id: string): Promise<void> {
    await db.delete(eventSponsors).where(and(eq(eventSponsors.organizationId, organizationId), eq(eventSponsors.id, id)));
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

  // Session Track operations
  async getSessionTracks(organizationId: string): Promise<SessionTrack[]> {
    return db.select().from(sessionTracks).where(eq(sessionTracks.organizationId, organizationId)).orderBy(sessionTracks.name);
  }

  async getSessionTrack(organizationId: string, id: string): Promise<SessionTrack | undefined> {
    const [track] = await db.select().from(sessionTracks)
      .where(and(eq(sessionTracks.organizationId, organizationId), eq(sessionTracks.id, id)));
    return track;
  }

  async createSessionTrack(track: InsertSessionTrack): Promise<SessionTrack> {
    const [newTrack] = await db.insert(sessionTracks).values(track).returning();
    return newTrack;
  }

  async updateSessionTrack(organizationId: string, id: string, track: Partial<InsertSessionTrack>): Promise<SessionTrack | undefined> {
    const [updated] = await db
      .update(sessionTracks)
      .set({ ...track, updatedAt: new Date() })
      .where(and(eq(sessionTracks.organizationId, organizationId), eq(sessionTracks.id, id)))
      .returning();
    return updated;
  }

  async deleteSessionTrack(organizationId: string, id: string): Promise<void> {
    await db.delete(sessionTracks).where(and(eq(sessionTracks.organizationId, organizationId), eq(sessionTracks.id, id)));
  }

  // Session Room operations
  async getSessionRooms(organizationId: string): Promise<SessionRoom[]> {
    return db.select().from(sessionRooms).where(eq(sessionRooms.organizationId, organizationId)).orderBy(sessionRooms.name);
  }

  async getSessionRoom(organizationId: string, id: string): Promise<SessionRoom | undefined> {
    const [room] = await db.select().from(sessionRooms)
      .where(and(eq(sessionRooms.organizationId, organizationId), eq(sessionRooms.id, id)));
    return room;
  }

  async createSessionRoom(room: InsertSessionRoom): Promise<SessionRoom> {
    const [newRoom] = await db.insert(sessionRooms).values(room).returning();
    return newRoom;
  }

  async updateSessionRoom(organizationId: string, id: string, room: Partial<InsertSessionRoom>): Promise<SessionRoom | undefined> {
    const [updated] = await db
      .update(sessionRooms)
      .set({ ...room, updatedAt: new Date() })
      .where(and(eq(sessionRooms.organizationId, organizationId), eq(sessionRooms.id, id)))
      .returning();
    return updated;
  }

  async deleteSessionRoom(organizationId: string, id: string): Promise<void> {
    await db.delete(sessionRooms).where(and(eq(sessionRooms.organizationId, organizationId), eq(sessionRooms.id, id)));
  }

  // Session Speaker operations
  async getSessionSpeakersBySession(organizationId: string, sessionId: string): Promise<SessionSpeaker[]> {
    const [session] = await db.select().from(eventSessions)
      .where(and(eq(eventSessions.organizationId, organizationId), eq(eventSessions.id, sessionId)));
    if (!session) {
      return [];
    }
    return db.select().from(sessionSpeakers).where(eq(sessionSpeakers.sessionId, sessionId));
  }

  async getSessionSpeakersBySpeaker(organizationId: string, speakerId: string): Promise<SessionSpeaker[]> {
    const [speaker] = await db.select().from(speakers)
      .where(and(eq(speakers.organizationId, organizationId), eq(speakers.id, speakerId)));
    if (!speaker) {
      return [];
    }
    return db.select().from(sessionSpeakers).where(eq(sessionSpeakers.speakerId, speakerId));
  }

  async createSessionSpeaker(sessionSpeaker: InsertSessionSpeaker): Promise<SessionSpeaker> {
    const [newSessionSpeaker] = await db.insert(sessionSpeakers).values(sessionSpeaker).returning();
    return newSessionSpeaker;
  }

  async deleteSessionSpeaker(sessionId: string, speakerId: string): Promise<void> {
    await db.delete(sessionSpeakers).where(
      and(eq(sessionSpeakers.sessionId, sessionId), eq(sessionSpeakers.speakerId, speakerId))
    );
  }

  async setSessionSpeakers(organizationId: string, sessionId: string, speakerIds: string[]): Promise<void> {
    const [session] = await db.select().from(eventSessions)
      .where(and(eq(eventSessions.organizationId, organizationId), eq(eventSessions.id, sessionId)));
    if (!session) {
      throw new Error("Session not found or does not belong to organization");
    }
    if (speakerIds.length > 0) {
      const validSpeakers = await db.select().from(speakers)
        .where(and(eq(speakers.organizationId, organizationId)));
      const validSpeakerIds = new Set(validSpeakers.map(s => s.id));
      for (const speakerId of speakerIds) {
        if (!validSpeakerIds.has(speakerId)) {
          throw new Error("One or more speakers do not belong to organization");
        }
      }
    }
    await db.delete(sessionSpeakers).where(eq(sessionSpeakers.sessionId, sessionId));
    if (speakerIds.length > 0) {
      await db.insert(sessionSpeakers).values(speakerIds.map(speakerId => ({ sessionId, speakerId })));
    }
  }

  async setSpeakerSessions(organizationId: string, speakerId: string, sessionIds: string[]): Promise<void> {
    const [speaker] = await db.select().from(speakers)
      .where(and(eq(speakers.organizationId, organizationId), eq(speakers.id, speakerId)));
    if (!speaker) {
      throw new Error("Speaker not found or does not belong to organization");
    }
    if (sessionIds.length > 0) {
      const validSessions = await db.select().from(eventSessions)
        .where(and(eq(eventSessions.organizationId, organizationId)));
      const validSessionIds = new Set(validSessions.map(s => s.id));
      for (const sessionId of sessionIds) {
        if (!validSessionIds.has(sessionId)) {
          throw new Error("One or more sessions do not belong to organization");
        }
      }
    }
    await db.delete(sessionSpeakers).where(eq(sessionSpeakers.speakerId, speakerId));
    if (sessionIds.length > 0) {
      await db.insert(sessionSpeakers).values(sessionIds.map(sessionId => ({ sessionId, speakerId })));
    }
  }

  // Content operations
  async getContentItems(organizationId: string, eventId?: string, sessionId?: string): Promise<ContentItem[]> {
    const conditions = [eq(contentItems.organizationId, organizationId)];
    if (eventId) {
      conditions.push(eq(contentItems.eventId, eventId));
    }
    if (sessionId) {
      conditions.push(eq(contentItems.sessionId, sessionId));
    }
    return db.select().from(contentItems).where(and(...conditions)).orderBy(desc(contentItems.createdAt));
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
    // Trim whitespace and use case-insensitive comparison for slug matching
    const trimmedSlug = slug.trim();
    const [event] = await db.select().from(events).where(ilike(events.publicSlug, trimmedSlug));
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

  // Event Page operations (site builder)
  async getEventPages(organizationId: string, eventId: string): Promise<EventPage[]> {
    return db.select().from(eventPages)
      .where(and(eq(eventPages.organizationId, organizationId), eq(eventPages.eventId, eventId)));
  }

  async getEventPage(organizationId: string, id: string): Promise<EventPage | undefined> {
    const [page] = await db.select().from(eventPages)
      .where(and(eq(eventPages.organizationId, organizationId), eq(eventPages.id, id)));
    return page;
  }

  async getEventPageByType(organizationId: string, eventId: string, pageType: string): Promise<EventPage | undefined> {
    const [page] = await db.select().from(eventPages)
      .where(and(
        eq(eventPages.organizationId, organizationId),
        eq(eventPages.eventId, eventId),
        eq(eventPages.pageType, pageType)
      ));
    return page;
  }

  async createEventPage(page: InsertEventPage): Promise<EventPage> {
    const [newPage] = await db.insert(eventPages).values(page as typeof eventPages.$inferInsert).returning();
    return newPage;
  }

  async updateEventPage(organizationId: string, id: string, page: Partial<InsertEventPage>): Promise<EventPage | undefined> {
    const updatePayload = { ...page, updatedAt: new Date() } as Partial<typeof eventPages.$inferInsert> & { updatedAt: Date };
    const [updated] = await db
      .update(eventPages)
      .set(updatePayload)
      .where(and(eq(eventPages.organizationId, organizationId), eq(eventPages.id, id)))
      .returning();
    return updated;
  }

  async upsertEventPage(page: InsertEventPage): Promise<EventPage> {
    const insertValue = page as typeof eventPages.$inferInsert;
    const [result] = await db
      .insert(eventPages)
      .values(insertValue)
      .onConflictDoUpdate({
        target: [eventPages.eventId, eventPages.pageType],
        set: {
          slug: insertValue.slug,
          isPublished: insertValue.isPublished,
          theme: insertValue.theme,
          seo: insertValue.seo,
          sections: insertValue.sections,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async deleteEventPage(organizationId: string, id: string): Promise<void> {
    await db.delete(eventPages).where(and(eq(eventPages.organizationId, organizationId), eq(eventPages.id, id)));
  }

  async getPublishedLandingPagesForSitemap(): Promise<Array<{ slug: string | null; updatedAt: Date | null }>> {
    const result = await db.select({
      slug: events.publicSlug,
      updatedAt: eventPages.updatedAt,
    })
    .from(eventPages)
    .innerJoin(events, eq(eventPages.eventId, events.id))
    .where(and(eq(eventPages.isPublished, true), eq(eventPages.pageType, 'landing')));
    return result;
  }

  // Page Version operations
  async getPageVersions(organizationId: string, eventPageId: string): Promise<PageVersion[]> {
    return db.select().from(pageVersions)
      .where(and(
        eq(pageVersions.organizationId, organizationId),
        eq(pageVersions.eventPageId, eventPageId)
      ))
      .orderBy(desc(pageVersions.version));
  }

  async getPageVersion(organizationId: string, id: string): Promise<PageVersion | undefined> {
    const [version] = await db.select().from(pageVersions)
      .where(and(
        eq(pageVersions.organizationId, organizationId),
        eq(pageVersions.id, id)
      ));
    return version;
  }

  async createPageVersion(version: InsertPageVersion): Promise<PageVersion> {
    const [created] = await db.insert(pageVersions).values(version).returning();
    return created;
  }

  async getLatestVersionNumber(organizationId: string, eventPageId: string): Promise<number> {
    const [latest] = await db.select({ version: pageVersions.version })
      .from(pageVersions)
      .where(and(
        eq(pageVersions.organizationId, organizationId),
        eq(pageVersions.eventPageId, eventPageId)
      ))
      .orderBy(desc(pageVersions.version))
      .limit(1);
    return latest?.version ?? 0;
  }

  // Registration Config operations
  async getRegistrationConfig(organizationId: string, eventId: string): Promise<RegistrationConfig | undefined> {
    const [config] = await db.select().from(registrationConfigs)
      .where(and(eq(registrationConfigs.organizationId, organizationId), eq(registrationConfigs.eventId, eventId)));
    return config;
  }

  async upsertRegistrationConfig(config: InsertRegistrationConfig): Promise<RegistrationConfig> {
    const insertValue = config as typeof registrationConfigs.$inferInsert;
    const [result] = await db
      .insert(registrationConfigs)
      .values(insertValue)
      .onConflictDoUpdate({
        target: registrationConfigs.eventId,
        set: {
          steps: insertValue.steps,
          step1Config: insertValue.step1Config,
          step2Config: insertValue.step2Config,
          step3Config: insertValue.step3Config,
          step4Config: insertValue.step4Config,
          step5Config: insertValue.step5Config,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Custom Field operations
  async getCustomFields(organizationId: string): Promise<CustomField[]> {
    return db.select().from(customFields)
      .where(eq(customFields.organizationId, organizationId))
      .orderBy(customFields.displayOrder);
  }

  async getCustomField(organizationId: string, id: string): Promise<CustomField | undefined> {
    const [field] = await db.select().from(customFields)
      .where(and(eq(customFields.organizationId, organizationId), eq(customFields.id, id)));
    return field;
  }

  async createCustomField(field: InsertCustomField): Promise<CustomField> {
    const [newField] = await db.insert(customFields).values(field).returning();
    return newField;
  }

  async updateCustomField(organizationId: string, id: string, field: Partial<InsertCustomField>): Promise<CustomField | undefined> {
    const [updated] = await db
      .update(customFields)
      .set({ ...field, updatedAt: new Date() })
      .where(and(eq(customFields.organizationId, organizationId), eq(customFields.id, id)))
      .returning();
    return updated;
  }

  async deleteCustomField(organizationId: string, id: string): Promise<void> {
    await db.delete(customFields).where(and(eq(customFields.organizationId, organizationId), eq(customFields.id, id)));
  }

  async getActiveCustomFieldsByEventSlug(slug: string): Promise<CustomField[]> {
    const event = await this.getEventBySlug(slug);
    if (!event) return [];
    return db.select().from(customFields)
      .where(and(
        eq(customFields.organizationId, event.organizationId),
        eq(customFields.isActive, true)
      ))
      .orderBy(customFields.displayOrder);
  }

  // Content Asset operations
  async createContentAsset(asset: InsertContentAsset): Promise<ContentAsset> {
    const [newAsset] = await db.insert(contentAssets).values(asset).returning();
    return newAsset;
  }

  async getContentAssets(organizationId: string): Promise<ContentAsset[]> {
    return db.select().from(contentAssets)
      .where(eq(contentAssets.organizationId, organizationId))
      .orderBy(desc(contentAssets.createdAt));
  }

  async getContentAsset(id: string, organizationId: string): Promise<ContentAsset | undefined> {
    const [asset] = await db.select().from(contentAssets)
      .where(and(eq(contentAssets.id, id), eq(contentAssets.organizationId, organizationId)));
    return asset;
  }

  async deleteContentAsset(id: string, organizationId: string): Promise<void> {
    await db.delete(contentAssets)
      .where(and(eq(contentAssets.id, id), eq(contentAssets.organizationId, organizationId)));
  }

  // Budget Category operations
  async getBudgetCategories(organizationId: string): Promise<BudgetCategory[]> {
    return db.select().from(budgetCategories)
      .where(eq(budgetCategories.organizationId, organizationId))
      .orderBy(budgetCategories.sortOrder);
  }

  async getBudgetCategory(organizationId: string, id: string): Promise<BudgetCategory | undefined> {
    const [category] = await db.select().from(budgetCategories)
      .where(and(eq(budgetCategories.organizationId, organizationId), eq(budgetCategories.id, id)));
    return category;
  }

  async createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory> {
    const [newCategory] = await db.insert(budgetCategories).values(category).returning();
    return newCategory;
  }

  async updateBudgetCategory(organizationId: string, id: string, category: Partial<InsertBudgetCategory>): Promise<BudgetCategory | undefined> {
    const [updated] = await db
      .update(budgetCategories)
      .set(category)
      .where(and(eq(budgetCategories.organizationId, organizationId), eq(budgetCategories.id, id)))
      .returning();
    return updated;
  }

  async deleteBudgetCategory(organizationId: string, id: string): Promise<void> {
    await db.delete(budgetCategories).where(and(eq(budgetCategories.organizationId, organizationId), eq(budgetCategories.id, id)));
  }

  // Budget Offset operations
  async getBudgetOffsets(organizationId: string, eventId?: string): Promise<BudgetOffset[]> {
    if (eventId) {
      return db.select().from(budgetOffsets)
        .where(and(eq(budgetOffsets.organizationId, organizationId), eq(budgetOffsets.eventId, eventId)));
    }
    return db.select().from(budgetOffsets)
      .where(eq(budgetOffsets.organizationId, organizationId));
  }

  async getBudgetOffset(organizationId: string, id: string): Promise<BudgetOffset | undefined> {
    const [offset] = await db.select().from(budgetOffsets)
      .where(and(eq(budgetOffsets.organizationId, organizationId), eq(budgetOffsets.id, id)));
    return offset;
  }

  async createBudgetOffset(offset: InsertBudgetOffset): Promise<BudgetOffset> {
    const [newOffset] = await db.insert(budgetOffsets).values(offset).returning();
    return newOffset;
  }

  async updateBudgetOffset(organizationId: string, id: string, offset: Partial<InsertBudgetOffset>): Promise<BudgetOffset | undefined> {
    const [updated] = await db
      .update(budgetOffsets)
      .set({ ...offset, updatedAt: new Date() })
      .where(and(eq(budgetOffsets.organizationId, organizationId), eq(budgetOffsets.id, id)))
      .returning();
    return updated;
  }

  async deleteBudgetOffset(organizationId: string, id: string): Promise<void> {
    await db.delete(budgetOffsets).where(and(eq(budgetOffsets.organizationId, organizationId), eq(budgetOffsets.id, id)));
  }

  // Event Budget Settings operations
  async getEventBudgetSettings(eventId: string): Promise<EventBudgetSettings | undefined> {
    const [settings] = await db.select().from(eventBudgetSettings)
      .where(eq(eventBudgetSettings.eventId, eventId));
    return settings;
  }

  async upsertEventBudgetSettings(settings: InsertEventBudgetSettings): Promise<EventBudgetSettings> {
    const [result] = await db
      .insert(eventBudgetSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: eventBudgetSettings.eventId,
        set: {
          budgetCap: settings.budgetCap,
          totalBudget: settings.totalBudget,
          currency: settings.currency,
          fiscalYearStart: settings.fiscalYearStart,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Budget Payment operations
  async getBudgetPayments(organizationId: string, eventId?: string): Promise<BudgetPayment[]> {
    if (eventId) {
      return db.select().from(budgetPayments)
        .where(and(eq(budgetPayments.organizationId, organizationId), eq(budgetPayments.eventId, eventId)))
        .orderBy(desc(budgetPayments.createdAt));
    }
    return db.select().from(budgetPayments)
      .where(eq(budgetPayments.organizationId, organizationId))
      .orderBy(desc(budgetPayments.createdAt));
  }

  async getBudgetPayment(organizationId: string, id: string): Promise<BudgetPayment | undefined> {
    const [payment] = await db.select().from(budgetPayments)
      .where(and(eq(budgetPayments.organizationId, organizationId), eq(budgetPayments.id, id)));
    return payment;
  }

  async createBudgetPayment(payment: InsertBudgetPayment): Promise<BudgetPayment> {
    const [newPayment] = await db.insert(budgetPayments).values(payment).returning();
    return newPayment;
  }

  async updateBudgetPayment(organizationId: string, id: string, payment: Partial<InsertBudgetPayment>): Promise<BudgetPayment | undefined> {
    const [updated] = await db
      .update(budgetPayments)
      .set({ ...payment, updatedAt: new Date() })
      .where(and(eq(budgetPayments.organizationId, organizationId), eq(budgetPayments.id, id)))
      .returning();
    return updated;
  }

  async deleteBudgetPayment(organizationId: string, id: string): Promise<void> {
    await db.delete(budgetPayments).where(and(eq(budgetPayments.organizationId, organizationId), eq(budgetPayments.id, id)));
  }

  // CFP Config operations
  async getCfpConfig(eventId: string, organizationId: string): Promise<CfpConfig | undefined> {
    const [config] = await db.select().from(cfpConfigs)
      .where(and(eq(cfpConfigs.eventId, eventId), eq(cfpConfigs.organizationId, organizationId)));
    return config;
  }

  async createCfpConfig(config: InsertCfpConfig): Promise<CfpConfig> {
    const [newConfig] = await db.insert(cfpConfigs).values(config).returning();
    return newConfig;
  }

  async updateCfpConfig(id: number, organizationId: string, updates: Partial<InsertCfpConfig>): Promise<CfpConfig | undefined> {
    const [updated] = await db
      .update(cfpConfigs)
      .set(updates)
      .where(and(eq(cfpConfigs.id, id), eq(cfpConfigs.organizationId, organizationId)))
      .returning();
    return updated;
  }

  // CFP Topic operations
  async getCfpTopics(cfpConfigId: number, organizationId: string): Promise<CfpTopic[]> {
    return db.select().from(cfpTopics)
      .where(and(eq(cfpTopics.cfpConfigId, cfpConfigId), eq(cfpTopics.organizationId, organizationId)))
      .orderBy(cfpTopics.sortOrder);
  }

  async createCfpTopic(topic: InsertCfpTopic): Promise<CfpTopic> {
    const [newTopic] = await db.insert(cfpTopics).values(topic).returning();
    return newTopic;
  }

  async updateCfpTopic(id: number, organizationId: string, updates: Partial<InsertCfpTopic>): Promise<CfpTopic | undefined> {
    const [updated] = await db
      .update(cfpTopics)
      .set(updates)
      .where(and(eq(cfpTopics.id, id), eq(cfpTopics.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async deleteCfpTopic(id: number, organizationId: string): Promise<boolean> {
    const result = await db.delete(cfpTopics)
      .where(and(eq(cfpTopics.id, id), eq(cfpTopics.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // CFP Submission operations
  async getCfpSubmissions(cfpConfigId: number, organizationId: string): Promise<CfpSubmission[]> {
    return db.select().from(cfpSubmissions)
      .where(and(eq(cfpSubmissions.cfpConfigId, cfpConfigId), eq(cfpSubmissions.organizationId, organizationId)))
      .orderBy(desc(cfpSubmissions.submittedAt));
  }

  async getCfpSubmission(id: number, organizationId: string): Promise<CfpSubmission | undefined> {
    const [submission] = await db.select().from(cfpSubmissions)
      .where(and(eq(cfpSubmissions.id, id), eq(cfpSubmissions.organizationId, organizationId)));
    return submission;
  }

  async createCfpSubmission(submission: InsertCfpSubmission): Promise<CfpSubmission> {
    const [newSubmission] = await db.insert(cfpSubmissions).values(submission).returning();
    return newSubmission;
  }

  async updateCfpSubmission(id: number, organizationId: string, updates: Partial<InsertCfpSubmission>): Promise<CfpSubmission | undefined> {
    const [updated] = await db
      .update(cfpSubmissions)
      .set(updates)
      .where(and(eq(cfpSubmissions.id, id), eq(cfpSubmissions.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async deleteCfpSubmission(id: number, organizationId: string): Promise<boolean> {
    const result = await db.delete(cfpSubmissions)
      .where(and(eq(cfpSubmissions.id, id), eq(cfpSubmissions.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getCfpSubmissionsByEmail(cfpConfigId: number, email: string): Promise<CfpSubmission[]> {
    return db.select().from(cfpSubmissions)
      .where(and(eq(cfpSubmissions.cfpConfigId, cfpConfigId), eq(cfpSubmissions.authorEmail, email)))
      .orderBy(desc(cfpSubmissions.submittedAt));
  }

  // CFP Reviewer operations
  async getCfpReviewers(cfpConfigId: number, organizationId: string): Promise<CfpReviewer[]> {
    return db.select().from(cfpReviewers)
      .where(and(eq(cfpReviewers.cfpConfigId, cfpConfigId), eq(cfpReviewers.organizationId, organizationId)));
  }

  async getCfpReviewer(id: number, organizationId: string): Promise<CfpReviewer | undefined> {
    const [reviewer] = await db.select().from(cfpReviewers)
      .where(and(eq(cfpReviewers.id, id), eq(cfpReviewers.organizationId, organizationId)));
    return reviewer;
  }

  async getCfpReviewerByEmail(cfpConfigId: number, email: string): Promise<CfpReviewer | undefined> {
    const [reviewer] = await db.select().from(cfpReviewers)
      .where(and(eq(cfpReviewers.cfpConfigId, cfpConfigId), eq(cfpReviewers.email, email)));
    return reviewer;
  }

  async getCfpReviewersByEmail(email: string): Promise<CfpReviewer[]> {
    return db.select().from(cfpReviewers)
      .where(eq(cfpReviewers.email, email));
  }

  async getCfpReviewersByUserId(userId: string): Promise<CfpReviewer[]> {
    return db.select().from(cfpReviewers)
      .where(eq(cfpReviewers.userId, userId));
  }

  async createCfpReviewer(reviewer: InsertCfpReviewer): Promise<CfpReviewer> {
    const [newReviewer] = await db.insert(cfpReviewers).values(reviewer).returning();
    return newReviewer;
  }

  async updateCfpReviewer(id: number, organizationId: string, updates: Partial<InsertCfpReviewer>): Promise<CfpReviewer | undefined> {
    const [updated] = await db
      .update(cfpReviewers)
      .set(updates)
      .where(and(eq(cfpReviewers.id, id), eq(cfpReviewers.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async deleteCfpReviewer(id: number, organizationId: string): Promise<boolean> {
    const result = await db.delete(cfpReviewers)
      .where(and(eq(cfpReviewers.id, id), eq(cfpReviewers.organizationId, organizationId)));
    return (result.rowCount ?? 0) > 0;
  }

  // CFP Review operations
  async getCfpReviews(submissionId: number, organizationId: string): Promise<CfpReview[]> {
    return db.select().from(cfpReviews)
      .where(and(eq(cfpReviews.submissionId, submissionId), eq(cfpReviews.organizationId, organizationId)));
  }

  async getCfpReviewsByReviewer(reviewerId: number, organizationId: string): Promise<CfpReview[]> {
    return db.select().from(cfpReviews)
      .where(and(eq(cfpReviews.reviewerId, reviewerId), eq(cfpReviews.organizationId, organizationId)));
  }

  async createCfpReview(review: InsertCfpReview): Promise<CfpReview> {
    const [newReview] = await db.insert(cfpReviews).values(review).returning();
    return newReview;
  }

  async updateCfpReview(id: number, organizationId: string, updates: Partial<InsertCfpReview>): Promise<CfpReview | undefined> {
    const [updated] = await db
      .update(cfpReviews)
      .set(updates)
      .where(and(eq(cfpReviews.id, id), eq(cfpReviews.organizationId, organizationId)))
      .returning();
    return updated;
  }

  async assignReviewerToSubmission(submissionId: number, reviewerId: number, organizationId: string): Promise<CfpReview> {
    const [review] = await db.insert(cfpReviews).values({
      submissionId,
      reviewerId,
      organizationId,
      status: 'assigned',
    }).returning();
    return review;
  }

  // Email Message operations
  async createEmailMessage(message: InsertEmailMessage): Promise<EmailMessage> {
    const [newMessage] = await db.insert(emailMessages).values(message).returning();
    return newMessage;
  }

  async getEmailMessage(id: string): Promise<EmailMessage | undefined> {
    const [message] = await db.select().from(emailMessages).where(eq(emailMessages.id, id));
    return message;
  }

  async getEmailMessagesByAttendee(organizationId: string, attendeeId: string): Promise<EmailMessage[]> {
    return db.select().from(emailMessages)
      .where(and(
        eq(emailMessages.organizationId, organizationId),
        eq(emailMessages.attendeeId, attendeeId)
      ))
      .orderBy(desc(emailMessages.sentAt));
  }

  async getEmailMessagesByCampaign(organizationId: string, campaignId: string): Promise<EmailMessage[]> {
    return db.select().from(emailMessages)
      .where(and(
        eq(emailMessages.organizationId, organizationId),
        eq(emailMessages.campaignId, campaignId)
      ))
      .orderBy(desc(emailMessages.sentAt));
  }

  async getEmailMessageByResendId(resendMessageId: string): Promise<EmailMessage | undefined> {
    const [message] = await db.select().from(emailMessages)
      .where(eq(emailMessages.resendMessageId, resendMessageId));
    return message;
  }

  async updateEmailMessage(id: string, updates: Partial<InsertEmailMessage>): Promise<EmailMessage | undefined> {
    const [updated] = await db
      .update(emailMessages)
      .set(updates)
      .where(eq(emailMessages.id, id))
      .returning();
    return updated;
  }

  async incrementEmailOpenCount(id: string): Promise<EmailMessage | undefined> {
    const [updated] = await db
      .update(emailMessages)
      .set({
        openCount: sql`COALESCE(${emailMessages.openCount}, 0) + 1`,
        openedAt: sql`COALESCE(${emailMessages.openedAt}, NOW())`,
      })
      .where(eq(emailMessages.id, id))
      .returning();
    return updated;
  }

  async incrementEmailClickCount(id: string): Promise<EmailMessage | undefined> {
    const [updated] = await db
      .update(emailMessages)
      .set({
        clickCount: sql`COALESCE(${emailMessages.clickCount}, 0) + 1`,
        clickedAt: sql`COALESCE(${emailMessages.clickedAt}, NOW())`,
      })
      .where(eq(emailMessages.id, id))
      .returning();
    return updated;
  }

  // Email Event operations
  async createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent> {
    const [newEvent] = await db.insert(emailEvents).values(event).returning();
    return newEvent;
  }

  async getEmailEventsByMessage(messageId: string): Promise<EmailEvent[]> {
    return db.select().from(emailEvents)
      .where(eq(emailEvents.messageId, messageId))
      .orderBy(desc(emailEvents.occurredAt));
  }

  // Email Suppression operations
  async createEmailSuppression(suppression: InsertEmailSuppression): Promise<EmailSuppression> {
    const [newSuppression] = await db.insert(emailSuppressions).values(suppression).returning();
    return newSuppression;
  }

  async getEmailSuppression(organizationId: string, email: string): Promise<EmailSuppression | undefined> {
    const [suppression] = await db.select().from(emailSuppressions)
      .where(and(
        eq(emailSuppressions.organizationId, organizationId),
        eq(emailSuppressions.email, email.toLowerCase())
      ));
    return suppression;
  }

  async getEmailSuppressions(organizationId: string): Promise<EmailSuppression[]> {
    return db.select().from(emailSuppressions)
      .where(eq(emailSuppressions.organizationId, organizationId))
      .orderBy(desc(emailSuppressions.createdAt));
  }

  async deleteEmailSuppression(organizationId: string, email: string): Promise<void> {
    await db.delete(emailSuppressions)
      .where(and(
        eq(emailSuppressions.organizationId, organizationId),
        eq(emailSuppressions.email, email.toLowerCase())
      ));
  }

  // Email Analytics
  async getEmailAnalyticsByCampaign(organizationId: string, campaignId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    uniqueOpens: number;
    uniqueClicks: number;
  }> {
    const messages = await db.select().from(emailMessages)
      .where(and(
        eq(emailMessages.organizationId, organizationId),
        eq(emailMessages.campaignId, campaignId)
      ));

    const totalSent = messages.length;
    const totalDelivered = messages.filter(m => m.deliveredAt !== null).length;
    const totalBounced = messages.filter(m => m.bouncedAt !== null).length;
    const uniqueOpens = messages.filter(m => m.openedAt !== null).length;
    const uniqueClicks = messages.filter(m => m.clickedAt !== null).length;
    const totalOpened = messages.reduce((sum, m) => sum + (m.openCount || 0), 0);
    const totalClicked = messages.reduce((sum, m) => sum + (m.clickCount || 0), 0);

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      uniqueOpens,
      uniqueClicks,
    };
  }

  // Social Media Credentials operations
  async getSocialMediaCredentials(organizationId: string): Promise<SocialMediaCredential[]> {
    return db.select().from(socialMediaCredentials)
      .where(eq(socialMediaCredentials.organizationId, organizationId));
  }

  async getSocialMediaCredential(organizationId: string, provider: string): Promise<SocialMediaCredential | null> {
    const [credential] = await db.select().from(socialMediaCredentials)
      .where(and(
        eq(socialMediaCredentials.organizationId, organizationId),
        eq(socialMediaCredentials.provider, provider)
      ));
    return credential || null;
  }

  async upsertSocialMediaCredential(
    organizationId: string,
    provider: string,
    clientId: string,
    clientSecret: string,
    userId: string
  ): Promise<SocialMediaCredential> {
    const encryptedClientId = encrypt(clientId);
    const encryptedClientSecret = encrypt(clientSecret);
    
    const [credential] = await db
      .insert(socialMediaCredentials)
      .values({
        organizationId,
        provider,
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
        isConfigured: true,
        configuredAt: new Date(),
        configuredBy: userId,
      })
      .onConflictDoUpdate({
        target: [socialMediaCredentials.organizationId, socialMediaCredentials.provider],
        set: {
          clientId: encryptedClientId,
          clientSecret: encryptedClientSecret,
          isConfigured: true,
          configuredAt: new Date(),
          configuredBy: userId,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return credential;
  }

  async deleteSocialMediaCredential(organizationId: string, provider: string): Promise<void> {
    await db.delete(socialMediaCredentials)
      .where(and(
        eq(socialMediaCredentials.organizationId, organizationId),
        eq(socialMediaCredentials.provider, provider)
      ));
  }

  // Email Platform Connection operations
  async getEmailPlatformConnections(organizationId: string): Promise<EmailPlatformConnection[]> {
    return db.select().from(emailPlatformConnections)
      .where(eq(emailPlatformConnections.organizationId, organizationId))
      .orderBy(desc(emailPlatformConnections.createdAt));
  }

  async getEmailPlatformConnection(organizationId: string, id: string): Promise<EmailPlatformConnection | undefined> {
    const [connection] = await db.select().from(emailPlatformConnections)
      .where(and(
        eq(emailPlatformConnections.organizationId, organizationId),
        eq(emailPlatformConnections.id, id)
      ));
    return connection;
  }

  async getEmailPlatformConnectionByProvider(organizationId: string, provider: string): Promise<EmailPlatformConnection | undefined> {
    const [connection] = await db.select().from(emailPlatformConnections)
      .where(and(
        eq(emailPlatformConnections.organizationId, organizationId),
        eq(emailPlatformConnections.provider, provider)
      ));
    return connection;
  }

  async createEmailPlatformConnection(data: InsertEmailPlatformConnection): Promise<EmailPlatformConnection> {
    const encryptedData = { ...data };
    if (data.accessToken) {
      encryptedData.accessToken = encrypt(data.accessToken);
    }
    if (data.refreshToken) {
      encryptedData.refreshToken = encrypt(data.refreshToken);
    }
    if (data.apiKey) {
      encryptedData.apiKey = encrypt(data.apiKey);
    }
    
    const [connection] = await db.insert(emailPlatformConnections)
      .values(encryptedData)
      .returning();
    return connection;
  }

  async updateEmailPlatformConnection(
    organizationId: string,
    id: string,
    data: Partial<InsertEmailPlatformConnection>
  ): Promise<EmailPlatformConnection | undefined> {
    const updateData = { ...data, updatedAt: new Date() };
    if (data.accessToken) {
      updateData.accessToken = encrypt(data.accessToken);
    }
    if (data.refreshToken) {
      updateData.refreshToken = encrypt(data.refreshToken);
    }
    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey);
    }
    
    const [updated] = await db.update(emailPlatformConnections)
      .set(updateData)
      .where(and(
        eq(emailPlatformConnections.organizationId, organizationId),
        eq(emailPlatformConnections.id, id)
      ))
      .returning();
    return updated;
  }

  async deleteEmailPlatformConnection(organizationId: string, id: string): Promise<void> {
    await db.delete(emailPlatformConnections)
      .where(and(
        eq(emailPlatformConnections.organizationId, organizationId),
        eq(emailPlatformConnections.id, id)
      ));
  }

  // Email Platform Audience operations
  async getEmailPlatformAudiences(connectionId: string): Promise<EmailPlatformAudience[]> {
    return db.select().from(emailPlatformAudiences)
      .where(eq(emailPlatformAudiences.connectionId, connectionId))
      .orderBy(desc(emailPlatformAudiences.createdAt));
  }

  async upsertEmailPlatformAudience(data: InsertEmailPlatformAudience): Promise<EmailPlatformAudience> {
    const [audience] = await db.insert(emailPlatformAudiences)
      .values(data)
      .onConflictDoUpdate({
        target: [emailPlatformAudiences.connectionId, emailPlatformAudiences.externalId],
        set: {
          name: data.name,
          memberCount: data.memberCount,
          listType: data.listType,
          isPrimary: data.isPrimary,
          lastSyncedAt: data.lastSyncedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return audience;
  }

  async deleteEmailPlatformAudiences(connectionId: string): Promise<void> {
    await db.delete(emailPlatformAudiences)
      .where(eq(emailPlatformAudiences.connectionId, connectionId));
  }

  // Email Sync Job operations
  async getEmailSyncJobs(organizationId: string, connectionId?: string): Promise<EmailSyncJob[]> {
    if (connectionId) {
      return db.select().from(emailSyncJobs)
        .where(and(
          eq(emailSyncJobs.organizationId, organizationId),
          eq(emailSyncJobs.connectionId, connectionId)
        ))
        .orderBy(desc(emailSyncJobs.createdAt));
    }
    return db.select().from(emailSyncJobs)
      .where(eq(emailSyncJobs.organizationId, organizationId))
      .orderBy(desc(emailSyncJobs.createdAt));
  }

  async createEmailSyncJob(data: InsertEmailSyncJob): Promise<EmailSyncJob> {
    const [job] = await db.insert(emailSyncJobs)
      .values(data)
      .returning();
    return job;
  }

  async updateEmailSyncJob(id: string, data: Partial<InsertEmailSyncJob>): Promise<EmailSyncJob | undefined> {
    const [updated] = await db.update(emailSyncJobs)
      .set(data)
      .where(eq(emailSyncJobs.id, id))
      .returning();
    return updated;
  }

  // Signup Invite Code operations
  async getSignupInviteCodes(): Promise<SignupInviteCode[]> {
    return db.select().from(signupInviteCodes).orderBy(desc(signupInviteCodes.createdAt));
  }

  async getSignupInviteCode(id: string): Promise<SignupInviteCode | undefined> {
    const [code] = await db.select().from(signupInviteCodes).where(eq(signupInviteCodes.id, id));
    return code;
  }

  async getSignupInviteCodeByCode(code: string): Promise<SignupInviteCode | undefined> {
    const [inviteCode] = await db.select().from(signupInviteCodes).where(eq(signupInviteCodes.code, code));
    return inviteCode;
  }

  async createSignupInviteCode(data: InsertSignupInviteCode): Promise<SignupInviteCode> {
    const [code] = await db.insert(signupInviteCodes).values(data).returning();
    return code;
  }

  async updateSignupInviteCode(id: string, data: Partial<InsertSignupInviteCode>): Promise<SignupInviteCode | undefined> {
    const [updated] = await db.update(signupInviteCodes)
      .set(data)
      .where(eq(signupInviteCodes.id, id))
      .returning();
    return updated;
  }

  async deleteSignupInviteCode(id: string): Promise<void> {
    await db.delete(signupInviteCodes).where(eq(signupInviteCodes.id, id));
  }

  async validateSignupInviteCode(code: string): Promise<{ valid: boolean; discountPercent?: number | null }> {
    const inviteCode = await this.getSignupInviteCodeByCode(code);
    
    if (!inviteCode) {
      return { valid: false };
    }

    if (!inviteCode.isActive) {
      return { valid: false };
    }

    if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
      return { valid: false };
    }

    if (inviteCode.maxUses !== null && (inviteCode.usesCount ?? 0) >= inviteCode.maxUses) {
      return { valid: false };
    }

    return { valid: true, discountPercent: inviteCode.discountPercent };
  }

  async redeemSignupInviteCode(code: string, userId: string, organizationId: string | null): Promise<SignupInviteCodeRedemption> {
    const inviteCode = await this.getSignupInviteCodeByCode(code);
    
    if (!inviteCode) {
      throw new Error("Invite code not found");
    }

    await db.update(signupInviteCodes)
      .set({ usesCount: (inviteCode.usesCount ?? 0) + 1 })
      .where(eq(signupInviteCodes.id, inviteCode.id));

    const [redemption] = await db.insert(signupInviteCodeRedemptions)
      .values({
        inviteCodeId: inviteCode.id,
        userId,
        organizationId,
      })
      .returning();

    return redemption;
  }
}

export const storage = new DatabaseStorage();

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
  sessionTopics,
  contentItems,
  budgetItems,
  budgetCategories,
  budgetOffsets,
  eventBudgetSettings,
  budgetPayments,
  vendors,
  milestones,
  deliverables,
  emailCampaigns,
  socialPosts,
  emailTemplates,
  emailTemplateLibrary,
  socialConnections,
  organizations,
  organizationMembers,
  eventPages,
  pageVersions,
  registrationConfigs,
  customFields,
  contentAssets,
  eventSponsors,
  sponsorContacts,
  sponsorContactInvitations,
  sponsorTasks,
  sponsorTaskCompletions,
  emailMessages,
  emailEvents,
  emailSuppressions,
  socialMediaCredentials,
  emailPlatformConnections,
  emailPlatformAudiences,
  emailSyncJobs,
  signupInviteCodes,
  signupInviteCodeRedemptions,
  passkeyConnections,
  passkeyEventMappings,
  passkeyReservations,
  documents,
  documentFolders,
  documentShares,
  documentActivity,
  documentComments,
  documentApprovals,
  activationLinks,
  activationLinkClicks,
  pageViews,
  marketingLeads,
  marketingActivationLinks,
  marketingLinkClicks,
  eventTranslations,
  moments,
  momentResponses,
  engagementSignals,
  eventLeads,
  sessionCheckIns,
  productInteractions,
  apiKeys,
  apiKeyAuditLogs,
  demoStations,
  helpArticles,
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
  type ActivationLink,
  type InsertActivationLink,
  type ActivationLinkClick,
  type InsertActivationLinkClick,
  type InsertPageView,
  type PageView,
  type Speaker,
  type InsertSpeaker,
  type EventSession,
  type InsertSession,
  type SessionTrack,
  type InsertSessionTrack,
  type SessionRoom,
  type InsertSessionRoom,
  type SessionTopic,
  type InsertSessionTopic,
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
  type Vendor,
  type InsertVendor,
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
  type EmailTemplateLibrary,
  type InsertEmailTemplateLibrary,
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
  customFieldTemplates,
  type CustomFieldTemplate,
  type InsertCustomFieldTemplate,
  eventCustomFieldSettings,
  type EventCustomFieldSetting,
  type InsertEventCustomFieldSetting,
  type ContentAsset,
  type InsertContentAsset,
  type EventSponsor,
  type InsertEventSponsor,
  type SponsorContact,
  type InsertSponsorContact,
  type SponsorContactInvitation,
  type InsertSponsorContactInvitation,
  type SponsorTask,
  type InsertSponsorTask,
  type SponsorTaskCompletion,
  type InsertSponsorTaskCompletion,
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
  type PasskeyConnection,
  type InsertPasskeyConnection,
  type PasskeyEventMapping,
  type InsertPasskeyEventMapping,
  type PasskeyReservation,
  type InsertPasskeyReservation,
  type Document,
  type InsertDocument,
  type DocumentFolder,
  type InsertDocumentFolder,
  type DocumentShare,
  type InsertDocumentShare,
  type DocumentActivity,
  type InsertDocumentActivity,
  type DocumentComment,
  type InsertDocumentComment,
  type DocumentApproval,
  type InsertDocumentApproval,
  teamInvitations,
  type TeamInvitation,
  type InsertTeamInvitation,
  customFonts,
  customFontVariants,
  brandKits,
  type CustomFont,
  type InsertCustomFont,
  type CustomFontVariant,
  type InsertCustomFontVariant,
  type BrandKit,
  type InsertBrandKit,
  type MarketingLead,
  type InsertMarketingLead,
  type MarketingActivationLink,
  type InsertMarketingActivationLink,
  type MarketingLinkClick,
  type InsertMarketingLinkClick,
  type EventTranslation,
  type InsertEventTranslation,
  attendeeSavedSessions,
  attendeeInterests,
  sessionFeedback,
  eventFeedback,
  feedbackConfigs,
  type AttendeeSavedSession,
  type InsertAttendeeSavedSession,
  type AttendeeInterests,
  type InsertAttendeeInterests,
  type SessionFeedback,
  type InsertSessionFeedback,
  type EventFeedback,
  type InsertEventFeedback,
  type FeedbackConfig,
  type InsertFeedbackConfig,
  type Moment,
  type InsertMoment,
  type MomentResponse,
  type InsertMomentResponse,
  type EngagementSignal,
  type InsertEngagementSignal,
  type EventLead,
  type InsertEventLead,
  type SessionCheckIn,
  type InsertSessionCheckIn,
  type ProductInteraction,
  type InsertProductInteraction,
  type ApiKey,
  type InsertApiKey,
  type ApiKeyAuditLog,
  type InsertApiKeyAuditLog,
  superAdminAuditLogs,
  type SuperAdminAuditLog,
  type InsertSuperAdminAuditLog,
  attendeeMeetings,
  type AttendeeMeeting,
  type InsertAttendeeMeeting,
  meetingPortalMembers,
  meetingPortalInvitations,
  type MeetingPortalMember,
  type InsertMeetingPortalMember,
  type MeetingPortalInvitation,
  type InsertMeetingPortalInvitation,
  roomOpenHours,
  memberRoomAssignments,
  intentRecomputeHistory,
  type InsertRoomOpenHours,
  type RoomOpenHours,
  type InsertMemberRoomAssignment,
  type MemberRoomAssignment,
  type IntentRecomputeHistory,
  type InsertIntentRecomputeHistory,
  type DemoStation,
  type InsertDemoStation,
  type HelpArticle,
  type InsertHelpArticle,
} from "@shared/schema";
import crypto from "crypto";
import { encrypt, decrypt } from "./encryption";
import { db } from "./db";
import {
  buildIntentExplanation,
  qualifiesForHighIntent,
  qualifiesForHotLead,
  getPrimaryTriggers,
  computeMomentumScore,
} from "./intentScoring";
import { eq, desc, and, ilike, or, isNull, isNotNull, sql, count, inArray, gt, lt, gte, lte, ne } from "drizzle-orm";

export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, updates: { firstName?: string; lastName?: string }): Promise<User | undefined>;

  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationByCustomDomain(domain: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<OrganizationMember[]>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  getAllOrganizationsWithStats(): Promise<Array<Organization & { memberCount: number; eventCount: number; attendeeCount: number; ownerEmail?: string; inviteCodeUsed?: string }>>;
  deleteOrganization(id: string): Promise<void>;
  seedDefaultCustomFields(organizationId: string): Promise<{ seeded: number; skipped: number }>;

  // Organization Member operations
  getOrganizationMembers(organizationId: string): Promise<Array<OrganizationMember & { user: User }>>;
  getOrganizationMember(organizationId: string, userId: string): Promise<OrganizationMember | undefined>;
  updateOrganizationMember(organizationId: string, userId: string, updates: Partial<InsertOrganizationMember>): Promise<OrganizationMember | undefined>;
  removeOrganizationMember(organizationId: string, userId: string): Promise<void>;

  // Team Invitation operations
  createTeamInvitation(invitation: Omit<InsertTeamInvitation, 'inviteCode'>): Promise<TeamInvitation>;
  getTeamInvitations(organizationId: string): Promise<TeamInvitation[]>;
  getTeamInvitation(organizationId: string, id: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationsForEmail(email: string): Promise<TeamInvitation[]>;
  getTeamInvitationByCode(inviteCode: string): Promise<TeamInvitation | undefined>;
  updateTeamInvitation(id: string, updates: Partial<InsertTeamInvitation>): Promise<TeamInvitation | undefined>;
  acceptTeamInvitation(inviteCode: string, userId: string): Promise<OrganizationMember | undefined>;
  revokeTeamInvitation(organizationId: string, id: string): Promise<void>;

  // Event operations
  getEvents(organizationId: string): Promise<Event[]>;
  getEvent(organizationId: string, id: string): Promise<Event | undefined>;
  getEventById(id: string): Promise<Event | undefined>;
  getEventByPublicSlug(slug: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(organizationId: string, id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(organizationId: string, id: string): Promise<void>;

  // Event Translation operations
  getEventTranslations(organizationId: string, eventId: string): Promise<EventTranslation[]>;
  getEventTranslation(organizationId: string, eventId: string, languageCode: string): Promise<EventTranslation | undefined>;
  upsertEventTranslation(translation: InsertEventTranslation): Promise<EventTranslation>;
  deleteEventTranslation(organizationId: string, eventId: string, languageCode: string): Promise<void>;

  // Attendee operations
  getAttendees(organizationId: string, eventId?: string): Promise<Attendee[]>;
  getAttendee(organizationId: string, id: string): Promise<Attendee | undefined>;
  getAttendeesByInviteCode(organizationId: string, inviteCodeId: string): Promise<Attendee[]>;
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
  getInviteCodeBySubmission(organizationId: string, eventId: string, submissionId: number): Promise<InviteCode | undefined>;
  createInviteCode(inviteCode: InsertInviteCode): Promise<InviteCode>;
  updateInviteCode(organizationId: string, id: string, inviteCode: Partial<InsertInviteCode>): Promise<InviteCode | undefined>;
  deleteInviteCode(organizationId: string, id: string): Promise<void>;

  // Activation Link operations
  getActivationLinks(organizationId: string, eventId?: string): Promise<ActivationLink[]>;
  getActivationLink(organizationId: string, id: string): Promise<ActivationLink | undefined>;
  getActivationLinkByShortCode(shortCode: string): Promise<ActivationLink | undefined>;
  getActivationLinkById(id: string): Promise<ActivationLink | undefined>;
  createActivationLink(link: InsertActivationLink): Promise<ActivationLink>;
  updateActivationLink(organizationId: string, id: string, link: Partial<InsertActivationLink>): Promise<ActivationLink | undefined>;
  deleteActivationLink(organizationId: string, id: string): Promise<void>;
  incrementActivationLinkClicks(id: string): Promise<void>;
  incrementActivationLinkConversions(id: string): Promise<void>;

  // Activation Link Click operations
  getActivationLinkClicks(activationLinkId: string): Promise<ActivationLinkClick[]>;
  createActivationLinkClick(click: InsertActivationLinkClick): Promise<ActivationLinkClick>;
  updateActivationLinkClickConversion(clickId: string, attendeeId: string): Promise<void>;

  // Page View operations
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getActiveVisitors(organizationId: string, minutesAgo?: number): Promise<Array<{
    eventId: string;
    eventName: string;
    pageType: string;
    activeVisitors: number;
  }>>;

  // Acquisition Metrics operations
  getAcquisitionMetrics(organizationId: string): Promise<{
    uniqueVisitors: number;
    registrations: number;
    conversionRate: number;
    topSource: string | null;
    channelBreakdown: Array<{ channel: string; visits: number }>;
  }>;

  // Acquisition Funnel operations
  getAcquisitionFunnel(organizationId: string, eventId?: string): Promise<{
    emailFunnel: Array<{
      stage: string;
      count: number;
      percentFromPrevious: number | null;
      tooltip: string;
    }>;
    activationFunnel: Array<{
      stage: string;
      count: number;
      percentFromPrevious: number | null;
      tooltip: string;
    }>;
  }>;

  // Speaker operations
  getSpeakers(organizationId: string, eventId?: string): Promise<Speaker[]>;
  getSpeaker(organizationId: string, id: string): Promise<Speaker | undefined>;
  getSpeakerByEmail(organizationId: string, eventId: string, email: string): Promise<Speaker | undefined>;
  createSpeaker(speaker: InsertSpeaker): Promise<Speaker>;
  updateSpeaker(organizationId: string, id: string, speaker: Partial<InsertSpeaker>): Promise<Speaker | undefined>;
  deleteSpeaker(organizationId: string, id: string): Promise<void>;

  // Event Sponsor operations
  getEventSponsors(organizationId: string, eventId: string, options?: { tier?: string; limit?: number; activeOnly?: boolean }): Promise<EventSponsor[]>;
  getEventSponsor(organizationId: string, id: string): Promise<EventSponsor | undefined>;
  createEventSponsor(sponsor: InsertEventSponsor): Promise<EventSponsor>;
  updateEventSponsor(organizationId: string, id: string, sponsor: Partial<InsertEventSponsor>): Promise<EventSponsor | undefined>;
  deleteEventSponsor(organizationId: string, id: string): Promise<void>;
  getEventSponsorByToken(token: string): Promise<EventSponsor | undefined>;

  // Sponsor Contact operations
  getSponsorContacts(organizationId: string, sponsorId: string): Promise<SponsorContact[]>;
  getSponsorContact(organizationId: string, id: string): Promise<SponsorContact | undefined>;
  getSponsorContactByToken(token: string): Promise<SponsorContact | undefined>;
  getSponsorContactByEmail(organizationId: string, sponsorId: string, email: string): Promise<SponsorContact | undefined>;
  createSponsorContact(contact: InsertSponsorContact): Promise<SponsorContact>;
  updateSponsorContact(organizationId: string, id: string, contact: Partial<InsertSponsorContact>): Promise<SponsorContact | undefined>;
  deleteSponsorContact(organizationId: string, id: string): Promise<void>;

  // Sponsor Task operations
  getSponsorTasks(organizationId: string, eventId: string): Promise<SponsorTask[]>;
  getSponsorTask(organizationId: string, id: string): Promise<SponsorTask | undefined>;
  createSponsorTask(task: InsertSponsorTask): Promise<SponsorTask>;
  updateSponsorTask(organizationId: string, id: string, task: Partial<InsertSponsorTask>): Promise<SponsorTask | undefined>;
  deleteSponsorTask(organizationId: string, id: string): Promise<void>;

  // Sponsor Task Completion operations
  getSponsorTaskCompletions(organizationId: string, sponsorId: string): Promise<SponsorTaskCompletion[]>;
  getSponsorTaskCompletion(organizationId: string, taskId: string, sponsorId: string): Promise<SponsorTaskCompletion | undefined>;
  upsertSponsorTaskCompletion(completion: InsertSponsorTaskCompletion): Promise<SponsorTaskCompletion>;
  updateSponsorTaskCompletion(organizationId: string, id: string, completion: Partial<InsertSponsorTaskCompletion>): Promise<SponsorTaskCompletion | undefined>;

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
  getSessionRooms(organizationId: string, eventId?: string): Promise<SessionRoom[]>;
  getSessionRoom(organizationId: string, id: string): Promise<SessionRoom | undefined>;
  createSessionRoom(room: InsertSessionRoom): Promise<SessionRoom>;
  updateSessionRoom(organizationId: string, id: string, room: Partial<InsertSessionRoom>): Promise<SessionRoom | undefined>;
  deleteSessionRoom(organizationId: string, id: string): Promise<void>;

  // Session Topic operations
  getSessionTopics(organizationId: string, eventId?: string): Promise<SessionTopic[]>;
  getSessionTopic(organizationId: string, id: string): Promise<SessionTopic | undefined>;
  createSessionTopic(topic: InsertSessionTopic): Promise<SessionTopic>;
  updateSessionTopic(organizationId: string, id: string, topic: Partial<InsertSessionTopic>): Promise<SessionTopic | undefined>;
  deleteSessionTopic(organizationId: string, id: string): Promise<void>;

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

  // Vendor operations
  getVendors(organizationId: string): Promise<Vendor[]>;
  getVendor(organizationId: string, id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(organizationId: string, id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(organizationId: string, id: string): Promise<void>;

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

  // Email Template Library operations (system-wide shared templates)
  getEmailTemplateLibrary(id: string): Promise<EmailTemplateLibrary | undefined>;
  listEmailTemplateLibrary(): Promise<EmailTemplateLibrary[]>;
  createEmailTemplateLibrary(template: InsertEmailTemplateLibrary): Promise<EmailTemplateLibrary>;
  updateEmailTemplateLibrary(id: string, template: Partial<InsertEmailTemplateLibrary>): Promise<EmailTemplateLibrary | undefined>;
  deleteEmailTemplateLibrary(id: string): Promise<boolean>;
  importLibraryTemplate(libraryTemplateId: string, targetOrganizationId: string, eventId?: string): Promise<EmailTemplate>;

  // Attendee lookup for login (efficient single query)
  getAttendeeByEventAndEmail(eventId: string, email: string): Promise<Attendee | undefined>;

  // Check-in operations (code-based access - no organizationId needed)
  getAttendeeByCheckInCode(code: string): Promise<Attendee | undefined>;
  checkInAttendee(id: string): Promise<Attendee | undefined>;

  // Public event operations (public access - no organizationId needed)
  getEventBySlug(slug: string): Promise<Event | undefined>;
  getEventBySlugAndOrganization(slug: string, organizationId: string): Promise<Event | undefined>;

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
  upsertEventPage(page: InsertEventPage & { id?: string }): Promise<EventPage>;
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

  // Custom Field Template operations (super admin only - system-wide templates)
  getCustomFieldTemplates(): Promise<CustomFieldTemplate[]>;
  getCustomFieldTemplate(id: string): Promise<CustomFieldTemplate | undefined>;
  createCustomFieldTemplate(template: InsertCustomFieldTemplate): Promise<CustomFieldTemplate>;
  updateCustomFieldTemplate(id: string, template: Partial<InsertCustomFieldTemplate>): Promise<CustomFieldTemplate | undefined>;
  deleteCustomFieldTemplate(id: string): Promise<void>;
  pushTemplatesToAllOrganizations(): Promise<{ organizationsUpdated: number; fieldsCreated: number }>;

  // Event Custom Field Settings operations (per-event overrides)
  getEventCustomFieldSettings(organizationId: string, eventId: string): Promise<EventCustomFieldSetting[]>;
  getEventCustomFieldSetting(organizationId: string, eventId: string, customFieldId: string): Promise<EventCustomFieldSetting | undefined>;
  upsertEventCustomFieldSetting(setting: InsertEventCustomFieldSetting): Promise<EventCustomFieldSetting>;
  deleteEventCustomFieldSetting(organizationId: string, eventId: string, customFieldId: string): Promise<void>;
  bulkUpsertEventCustomFieldSettings(settings: InsertEventCustomFieldSetting[]): Promise<EventCustomFieldSetting[]>;

  // Content Asset operations
  createContentAsset(asset: InsertContentAsset): Promise<ContentAsset>;
  getContentAssets(organizationId: string): Promise<ContentAsset[]>;
  getContentAsset(id: string, organizationId: string): Promise<ContentAsset | undefined>;
  deleteContentAsset(id: string, organizationId: string): Promise<void>;
  updateContentAssetBySponsorUrl(organizationId: string, url: string, sponsorId: string, sponsorTier: string): Promise<boolean>;

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
  getSignupRedemptionForUser(userId: string): Promise<{ redemption: SignupInviteCodeRedemption; inviteCode: SignupInviteCode } | null>;

  // Passkey (Cvent) Housing Integration operations
  getPasskeyConnection(organizationId: string): Promise<PasskeyConnection | undefined>;
  createPasskeyConnection(data: InsertPasskeyConnection): Promise<PasskeyConnection>;
  updatePasskeyConnection(organizationId: string, data: Partial<InsertPasskeyConnection>): Promise<PasskeyConnection | undefined>;
  deletePasskeyConnection(organizationId: string): Promise<void>;
  
  // Passkey Event Mapping operations
  getPasskeyEventMappings(organizationId: string): Promise<PasskeyEventMapping[]>;
  getPasskeyEventMapping(organizationId: string, eventId: string): Promise<PasskeyEventMapping | undefined>;
  createPasskeyEventMapping(data: InsertPasskeyEventMapping): Promise<PasskeyEventMapping>;
  updatePasskeyEventMapping(organizationId: string, eventId: string, data: Partial<InsertPasskeyEventMapping>): Promise<PasskeyEventMapping | undefined>;
  deletePasskeyEventMapping(organizationId: string, eventId: string): Promise<void>;
  
  // Passkey Reservation operations
  getPasskeyReservations(organizationId: string, eventId?: string): Promise<PasskeyReservation[]>;
  getPasskeyReservation(organizationId: string, id: string): Promise<PasskeyReservation | undefined>;
  getPasskeyReservationByAttendee(organizationId: string, attendeeId: string): Promise<PasskeyReservation | undefined>;
  createPasskeyReservation(data: InsertPasskeyReservation): Promise<PasskeyReservation>;
  updatePasskeyReservation(organizationId: string, id: string, data: Partial<InsertPasskeyReservation>): Promise<PasskeyReservation | undefined>;

  // Document operations
  getDocuments(organizationId: string, eventId?: string, folderId?: string): Promise<Document[]>;
  getDocument(organizationId: string, id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, organizationId: string, doc: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string, organizationId: string): Promise<void>;

  // Document Folder operations
  getDocumentFolders(organizationId: string, eventId?: string): Promise<DocumentFolder[]>;
  getDocumentFolder(organizationId: string, id: string): Promise<DocumentFolder | undefined>;
  createDocumentFolder(folder: InsertDocumentFolder): Promise<DocumentFolder>;
  updateDocumentFolder(id: string, organizationId: string, folder: Partial<InsertDocumentFolder>): Promise<DocumentFolder | undefined>;
  deleteDocumentFolder(id: string, organizationId: string): Promise<void>;

  // Document Share operations
  getDocumentShares(organizationId: string, documentId: string): Promise<DocumentShare[]>;
  getDocumentShareByToken(token: string): Promise<{ share: DocumentShare; document: Document } | undefined>;
  createDocumentShare(share: InsertDocumentShare): Promise<DocumentShare>;
  deleteDocumentShare(id: string, organizationId: string): Promise<void>;

  // Document Comment operations
  getDocumentComments(organizationId: string, documentId: string): Promise<DocumentComment[]>;
  getDocumentComment(organizationId: string, id: string): Promise<DocumentComment | undefined>;
  createDocumentComment(comment: InsertDocumentComment): Promise<DocumentComment>;
  updateDocumentComment(id: string, organizationId: string, updates: Partial<InsertDocumentComment>): Promise<DocumentComment | undefined>;

  // Document Approval operations
  getDocumentApprovals(organizationId: string, documentId: string): Promise<DocumentApproval[]>;
  getDocumentApproval(organizationId: string, id: string): Promise<DocumentApproval | undefined>;
  createDocumentApproval(approval: InsertDocumentApproval): Promise<DocumentApproval>;
  updateDocumentApproval(id: string, organizationId: string, updates: Partial<InsertDocumentApproval>): Promise<DocumentApproval | undefined>;

  // Document Activity operations
  createDocumentActivity(activity: InsertDocumentActivity): Promise<DocumentActivity>;
  getDocumentActivity(organizationId: string, documentId: string): Promise<DocumentActivity[]>;

  // Custom Font operations
  getCustomFonts(organizationId: string): Promise<CustomFont[]>;
  getCustomFont(organizationId: string, id: string): Promise<CustomFont | undefined>;
  getCustomFontByName(organizationId: string, name: string): Promise<CustomFont | undefined>;
  createCustomFont(font: InsertCustomFont): Promise<CustomFont>;
  updateCustomFont(id: string, organizationId: string, updates: Partial<InsertCustomFont>): Promise<CustomFont | undefined>;
  deleteCustomFont(id: string, organizationId: string): Promise<void>;

  // Custom Font Variant operations
  getCustomFontVariants(customFontId: string): Promise<CustomFontVariant[]>;
  createCustomFontVariant(variant: InsertCustomFontVariant): Promise<CustomFontVariant>;
  deleteCustomFontVariant(id: string): Promise<void>;

  // Brand Kit operations
  getBrandKits(organizationId: string): Promise<BrandKit[]>;
  getBrandKit(id: string, organizationId: string): Promise<BrandKit | undefined>;
  createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit>;
  updateBrandKit(id: string, organizationId: string, updates: Partial<InsertBrandKit>): Promise<BrandKit | undefined>;
  deleteBrandKit(id: string, organizationId: string): Promise<void>;
  getDefaultBrandKit(organizationId: string): Promise<BrandKit | undefined>;

  // Attendee Saved Sessions operations (personal schedule)
  getAttendeeSavedSessions(attendeeId: string): Promise<AttendeeSavedSession[]>;
  saveSession(attendeeId: string, sessionId: string): Promise<AttendeeSavedSession>;
  unsaveSession(attendeeId: string, sessionId: string): Promise<void>;
  isSessionSaved(attendeeId: string, sessionId: string): Promise<boolean>;
  getSessionSaveCount(sessionId: string): Promise<number>;

  // Attendee Interests operations (preferences for recommendations)
  getAttendeeInterests(attendeeId: string): Promise<AttendeeInterests | undefined>;
  upsertAttendeeInterests(attendeeId: string, interests: InsertAttendeeInterests): Promise<AttendeeInterests>;

  // Session Feedback operations
  getSessionFeedback(organizationId: string, sessionId: string): Promise<SessionFeedback[]>;
  getAttendeeSessionFeedback(attendeeId: string, sessionId: string): Promise<SessionFeedback | undefined>;
  createSessionFeedback(data: InsertSessionFeedback): Promise<SessionFeedback>;

  // Event Feedback operations
  getEventFeedback(organizationId: string, eventId: string): Promise<EventFeedback[]>;
  getAllEventFeedback(organizationId: string, eventId?: string): Promise<EventFeedback[]>;
  getAttendeeEventFeedback(attendeeId: string, eventId: string): Promise<EventFeedback | undefined>;
  createEventFeedback(data: InsertEventFeedback): Promise<EventFeedback>;

  // Feedback Config operations
  getFeedbackConfig(eventId: string): Promise<FeedbackConfig | undefined>;
  upsertFeedbackConfig(data: InsertFeedbackConfig): Promise<FeedbackConfig>;

  // Moments - Live engagement operations
  getMoments(organizationId: string, eventId?: string): Promise<Moment[]>;
  getMoment(organizationId: string, id: string): Promise<Moment | undefined>;
  getMomentsBySession(organizationId: string, sessionId: string): Promise<Moment[]>;
  getLiveMoments(organizationId: string, eventId: string): Promise<Moment[]>;
  createMoment(data: InsertMoment): Promise<Moment>;
  updateMoment(organizationId: string, id: string, updates: Partial<InsertMoment>): Promise<Moment | undefined>;
  deleteMoment(organizationId: string, id: string): Promise<void>;

  // Moment Responses
  getMomentResponses(momentId: string): Promise<MomentResponse[]>;
  getAttendeeMomentResponse(momentId: string, attendeeId: string): Promise<MomentResponse | undefined>;
  createMomentResponse(data: InsertMomentResponse): Promise<MomentResponse>;

  // Engagement Signals
  getEngagementSignals(organizationId: string, eventId: string): Promise<EngagementSignal[]>;
  getAttendeeEngagementSignal(eventId: string, attendeeId: string): Promise<EngagementSignal | undefined>;
  upsertEngagementSignal(data: InsertEngagementSignal): Promise<EngagementSignal>;

  // Event Leads (Lead Capture)
  getEventLeads(organizationId: string, eventId: string): Promise<EventLead[]>;
  getEventLead(organizationId: string, id: string): Promise<EventLead | undefined>;
  createEventLead(data: InsertEventLead): Promise<EventLead>;
  updateEventLead(organizationId: string, id: string, updates: Partial<InsertEventLead>): Promise<EventLead | undefined>;
  deleteEventLead(organizationId: string, id: string): Promise<void>;
  getEventLeadStats(organizationId: string, eventId: string): Promise<{ total: number; today: number; byMethod: { qr_scan: number; manual: number } }>;
  
  // Sponsor-specific Lead Capture operations
  getSponsorEventLeads(organizationId: string, eventId: string, sponsorId: string): Promise<EventLead[]>;
  getSponsorEventLeadStats(organizationId: string, eventId: string, sponsorId: string): Promise<{ total: number; today: number; byMethod: { qr_scan: number; manual: number } }>;
  
  // Sponsor Contact Invitation operations
  getSponsorContactInvitations(organizationId: string, sponsorId: string): Promise<SponsorContactInvitation[]>;
  getSponsorContactInvitation(organizationId: string, id: string): Promise<SponsorContactInvitation | undefined>;
  getSponsorContactInvitationByCode(inviteCode: string): Promise<SponsorContactInvitation | undefined>;
  createSponsorContactInvitation(data: InsertSponsorContactInvitation): Promise<SponsorContactInvitation>;
  updateSponsorContactInvitation(organizationId: string, id: string, updates: Partial<InsertSponsorContactInvitation>): Promise<SponsorContactInvitation | undefined>;

  // Session Check-Ins
  getSessionCheckIns(organizationId: string, sessionId: string): Promise<SessionCheckIn[]>;
  getSessionCheckIn(organizationId: string, sessionId: string, attendeeId: string): Promise<SessionCheckIn | undefined>;
  createSessionCheckIn(data: InsertSessionCheckIn): Promise<SessionCheckIn>;
  getSessionCheckInStats(organizationId: string, eventId: string): Promise<{ totalCheckIns: number; uniqueAttendees: number; sessionsWithCheckIns: number }>;
  getSessionCheckInsByEvent(organizationId: string, eventId: string): Promise<SessionCheckIn[]>;

  // Product Interactions (Intent Capture)
  getProductInteractions(organizationId: string, eventId: string): Promise<ProductInteraction[]>;
  getProductInteraction(organizationId: string, id: string): Promise<ProductInteraction | undefined>;
  getProductInteractionsByAttendee(organizationId: string, eventId: string, attendeeId: string): Promise<ProductInteraction[]>;
  createProductInteraction(data: InsertProductInteraction): Promise<ProductInteraction>;
  updateProductInteraction(organizationId: string, id: string, updates: Partial<InsertProductInteraction>): Promise<ProductInteraction | undefined>;
  deleteProductInteraction(organizationId: string, id: string): Promise<void>;
  getProductInteractionStats(organizationId: string, eventId: string): Promise<{ 
    total: number; 
    today: number; 
    byMethod: { qr_scan: number; manual: number; lookup: number };
    byIntentLevel: { low: number; medium: number; high: number };
  }>;
  getAttendeeInteractionScore(organizationId: string, eventId: string, attendeeId: string): Promise<{
    score: number;
    interactionCount: number;
    highestIntentLevel: string | null;
    latestOutcome: string | null;
    maxOpportunityPotential: string | null;
    reasons: string[];
  }>;

  // Moments Analytics
  getMomentsAnalytics(organizationId: string, eventId?: string): Promise<MomentsAnalytics>;

  // API Keys
  getApiKeys(organizationId: string): Promise<ApiKey[]>;
  getApiKey(organizationId: string, id: string): Promise<ApiKey | undefined>;
  getApiKeyByPrefix(keyPrefix: string): Promise<ApiKey | undefined>;
  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  updateApiKey(organizationId: string, id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  rotateApiKey(organizationId: string, id: string, newHashedSecret: string): Promise<ApiKey | undefined>;
  revokeApiKey(organizationId: string, id: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  
  // API Key Audit Logs
  createApiKeyAuditLog(data: InsertApiKeyAuditLog): Promise<ApiKeyAuditLog>;
  getApiKeyAuditLogs(organizationId: string, apiKeyId?: string, limit?: number): Promise<ApiKeyAuditLog[]>;

  // Super Admin Audit Log operations
  createSuperAdminAuditLog(data: InsertSuperAdminAuditLog): Promise<SuperAdminAuditLog>;
  getSuperAdminAuditLogs(limit?: number): Promise<SuperAdminAuditLog[]>;

  // Super Admin operations
  getAllOrganizationsBasic(): Promise<Array<{ id: string; name: string; slug: string }>>;

  // Attendee Meeting operations
  getAttendeeMeetings(organizationId: string, eventId: string, filters?: { status?: string; intentType?: string; isInternal?: boolean }): Promise<AttendeeMeeting[]>;
  getAttendeeMeeting(organizationId: string, id: string): Promise<AttendeeMeeting | undefined>;
  createAttendeeMeeting(data: InsertAttendeeMeeting): Promise<AttendeeMeeting>;
  updateAttendeeMeeting(organizationId: string, id: string, data: Partial<InsertAttendeeMeeting>): Promise<AttendeeMeeting | undefined>;
  captureAttendeeOutcome(organizationId: string, meetingId: string, data: { outcomeType: string; outcomeConfidence?: string; dealRange?: string; timeline?: string; outcomeNotes?: string; outcomeCapturedBy: string }): Promise<AttendeeMeeting | undefined>;
  getMeetingQualityStats(organizationId: string, eventId: string): Promise<{ totalMeetings: number; pendingMeetings: number; completedMeetings: number; outcomesRecorded: number; highIntentMeetings: number; mediumIntentMeetings: number; lowIntentMeetings: number; outcomeBreakdown: { type: string; count: number }[]; intentBreakdown: { type: string; count: number }[] }>;
  
  // Contact Intent Promotion
  promoteAttendeeIntent(organizationId: string, attendeeId: string, source: { type: string; id: string }, outcomeType: string, dealRange?: string): Promise<Attendee | undefined>;
  getHotLeads(organizationId: string, eventId?: string): Promise<Attendee[]>;
  getHighIntentContacts(organizationId: string, eventId?: string): Promise<Attendee[]>;

  // Meeting Portal Member operations
  getMeetingPortalMembersByEvent(eventId: string): Promise<MeetingPortalMember[]>;
  getMeetingPortalMember(id: string): Promise<MeetingPortalMember | undefined>;
  getMeetingPortalMemberByEmail(eventId: string, email: string): Promise<MeetingPortalMember | undefined>;
  getMeetingPortalMemberByToken(token: string): Promise<MeetingPortalMember | undefined>;
  getMeetingPortalMemberByMagicToken(token: string): Promise<MeetingPortalMember | undefined>;
  getMeetingPortalMembersByEmail(email: string): Promise<MeetingPortalMember[]>;
  createMeetingPortalMember(data: InsertMeetingPortalMember): Promise<MeetingPortalMember>;
  updateMeetingPortalMember(id: string, data: Partial<InsertMeetingPortalMember>): Promise<MeetingPortalMember | undefined>;
  deleteMeetingPortalMember(id: string): Promise<void>;

  // Meeting Portal Invitation operations
  getMeetingPortalInvitationsByEvent(eventId: string): Promise<MeetingPortalInvitation[]>;
  getMeetingPortalInvitationByCode(code: string): Promise<MeetingPortalInvitation | undefined>;
  createMeetingPortalInvitation(data: InsertMeetingPortalInvitation): Promise<MeetingPortalInvitation>;
  updateMeetingPortalInvitation(id: string, data: Partial<InsertMeetingPortalInvitation>): Promise<MeetingPortalInvitation | undefined>;
  deleteMeetingPortalInvitation(id: string): Promise<void>;

  // Room Open Hours operations
  getRoomOpenHours(roomId: string): Promise<RoomOpenHours[]>;
  setRoomOpenHours(roomId: string, hours: InsertRoomOpenHours[]): Promise<RoomOpenHours[]>;

  // Member Room Assignment operations
  getMemberRoomAssignments(organizationId: string, eventId: string): Promise<any[]>;
  getRoomAssignmentsForMember(organizationId: string, eventId: string, opts: { meetingPortalMemberId?: string; adminUserId?: string }): Promise<MemberRoomAssignment[]>;
  createMemberRoomAssignment(data: InsertMemberRoomAssignment): Promise<MemberRoomAssignment>;
  deleteMemberRoomAssignment(id: string): Promise<void>;
  updateMemberRoomAssignment(id: string, data: Partial<InsertMemberRoomAssignment>): Promise<MemberRoomAssignment | undefined>;

  // Room Conflict Detection & Availability operations
  findRoomConflicts(roomId: string, startTime: Date, endTime: Date, excludeMeetingId?: string): Promise<AttendeeMeeting[]>;
  findAvailableRooms(organizationId: string, eventId: string, startTime: Date, endTime: Date, opts?: { adminUserId?: string; meetingPortalMemberId?: string }): Promise<SessionRoom[]>;

  // Intent Recompute operations
  getAttendeeMeetingsByInvitee(organizationId: string, eventId: string, attendeeId: string): Promise<AttendeeMeeting[]>;
  recomputeAttendeeIntent(organizationId: string, eventId: string, attendeeId: string): Promise<Attendee | undefined>;
  
  // Intent Recompute History operations
  getIntentRecomputeHistory(organizationId: string, eventId: string): Promise<IntentRecomputeHistory[]>;
  createIntentRecomputeHistory(entry: InsertIntentRecomputeHistory): Promise<IntentRecomputeHistory>;

  // Demo Station operations
  getDemoStationsByEvent(eventId: string): Promise<DemoStation[]>;
  getDemoStation(id: string): Promise<DemoStation | undefined>;
  createDemoStation(station: InsertDemoStation): Promise<DemoStation>;
  updateDemoStation(id: string, updates: Partial<InsertDemoStation>): Promise<DemoStation>;
  deleteDemoStation(id: string): Promise<void>;

  // Help Article operations
  getHelpArticles(organizationId: string): Promise<HelpArticle[]>;
  getHelpArticle(id: string, organizationId: string): Promise<HelpArticle | undefined>;
  createHelpArticle(data: InsertHelpArticle): Promise<HelpArticle>;
  updateHelpArticle(id: string, organizationId: string, data: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined>;
  deleteHelpArticle(id: string, organizationId: string): Promise<boolean>;
}

// Types for Moments Analytics
export interface MomentsAnalytics {
  totalMoments: number;
  momentsByStatus: { status: string; count: number }[];
  totalResponses: number;
  responsesByType: { type: string; count: number }[];
  topRespondents: { attendeeId: string; name: string; email: string; responseCount: number }[];
  averageRatings: { momentId: string; title: string; avgRating: number; responseCount: number }[];
  pollResults: { momentId: string; title: string; options: { label: string; count: number; percentage: number }[] }[];
  recentQASubmissions: { momentId: string; title: string; attendeeName: string; response: string; createdAt: Date }[];
  liveVsEndedDistribution: { live: number; ended: number };
  responseRate: number;
  totalAttendeesWithAccess: number;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(ilike(users.email, email));
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

  async updateUserProfile(id: string, updates: { firstName?: string; lastName?: string }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
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

  async getOrganizationByCustomDomain(domain: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.customDomain, domain));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    
    // Fetch templates from the database to seed custom fields for new organization
    const templates = await this.getCustomFieldTemplates();
    
    if (templates.length > 0) {
      // Use database templates (ordered by displayOrder)
      for (const template of templates) {
        await db.insert(customFields).values({
          organizationId: newOrg.id,
          name: template.name,
          label: template.label,
          fieldType: template.fieldType,
          options: template.options || null,
          displayOrder: template.displayOrder,
          isActive: template.isActive,
          isGlobal: template.isGlobal,
          required: template.required,
          attendeeOnly: template.attendeeOnly,
          parentFieldId: null, // Will be resolved after all fields are created if needed
          parentTriggerValues: template.parentTriggerValues || null,
        });
      }
      
      // Resolve parentFieldId references using parentFieldName
      // After all fields are created, we can link them by name
      const createdFields = await db.select().from(customFields)
        .where(eq(customFields.organizationId, newOrg.id));
      const fieldNameToId = new Map(createdFields.map(f => [f.name, f.id]));
      
      for (const template of templates) {
        if (template.parentFieldName) {
          const parentId = fieldNameToId.get(template.parentFieldName);
          const childId = fieldNameToId.get(template.name);
          if (parentId && childId) {
            await db.update(customFields)
              .set({ parentFieldId: parentId })
              .where(eq(customFields.id, childId));
          }
        }
      }
    } else {
      // Fallback to hardcoded defaults if no templates exist
      const defaultCustomFields = [
        { name: 'role', label: 'What best describes your role in the company?', fieldType: 'select', options: ['Executive', 'Manager', 'Individual Contributor', 'Consultant', 'Other'], displayOrder: 1 },
        { name: 'jobFunction', label: 'What is your job function?', fieldType: 'select', options: ['Sales', 'Marketing', 'Engineering', 'Product', 'Operations', 'Finance', 'HR', 'Other'], displayOrder: 2 },
        { name: 'companyType', label: 'Company Type', fieldType: 'select', options: ['Enterprise', 'Mid-Market', 'SMB', 'Startup', 'Agency', 'Nonprofit', 'Government', 'Other'], displayOrder: 3 },
        { name: 'country', label: 'Country', fieldType: 'select', options: ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Other'], displayOrder: 4 },
        { name: 'dietaryRestrictions', label: 'Do you have any dietary restrictions?', fieldType: 'select', options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Kosher', 'Halal', 'Other'], displayOrder: 5 },
        { name: 'emergencyContact', label: 'Emergency Contact', fieldType: 'text', displayOrder: 6 },
        { name: 'emergencyPhone', label: 'Emergency Contact Phone', fieldType: 'text', displayOrder: 7 },
        { name: 'emergencyEmail', label: 'Emergency Contact Email', fieldType: 'text', displayOrder: 8 },
        { name: 'termsAndconditions', label: 'I have read the terms and conditions.', fieldType: 'checkbox', displayOrder: 9 },
      ];
      
      for (const field of defaultCustomFields) {
        await db.insert(customFields).values({
          organizationId: newOrg.id,
          name: field.name,
          label: field.label,
          fieldType: field.fieldType,
          options: field.options || null,
          displayOrder: field.displayOrder,
          isActive: true,
          isGlobal: true,
          required: false,
          attendeeOnly: false,
        });
      }
    }
    
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
      )
      .orderBy(desc(organizationMembers.createdAt));
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [newMember] = await db.insert(organizationMembers).values(member).returning();
    return newMember;
  }

  async getAllOrganizationsWithStats(): Promise<Array<Organization & { memberCount: number; eventCount: number; attendeeCount: number; ownerEmail?: string; inviteCodeUsed?: string }>> {
    const allOrgs = await db
      .select()
      .from(organizations)
      .where(or(eq(organizations.isArchived, false), isNull(organizations.isArchived)))
      .orderBy(desc(organizations.createdAt));
    
    const orgsWithStats = await Promise.all(allOrgs.map(async (org) => {
      const members = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, org.id));
      const orgEvents = await db.select().from(events).where(eq(events.organizationId, org.id));
      const orgAttendees = await db.select().from(attendees).where(eq(attendees.organizationId, org.id));
      
      // Get owner email
      const ownerMember = members.find(m => m.role === 'owner');
      let ownerEmail: string | undefined;
      if (ownerMember) {
        const [owner] = await db.select().from(users).where(eq(users.id, ownerMember.userId));
        ownerEmail = owner?.email ?? undefined;
      }
      
      // Get invite code used to create this organization (most recent if multiple exist)
      const [redemption] = await db
        .select({
          code: signupInviteCodes.code,
        })
        .from(signupInviteCodeRedemptions)
        .innerJoin(signupInviteCodes, eq(signupInviteCodeRedemptions.inviteCodeId, signupInviteCodes.id))
        .where(eq(signupInviteCodeRedemptions.organizationId, org.id))
        .orderBy(desc(signupInviteCodeRedemptions.redeemedAt))
        .limit(1);
      
      return {
        ...org,
        memberCount: members.length,
        eventCount: orgEvents.length,
        attendeeCount: orgAttendees.length,
        ownerEmail,
        inviteCodeUsed: redemption?.code,
      };
    }));
    
    return orgsWithStats;
  }

  async deleteOrganization(id: string): Promise<void> {
    // Soft delete: archive the organization instead of hard delete
    // This avoids FK constraint violations from the many tables referencing organizationId
    await db.update(organizations)
      .set({ isArchived: true })
      .where(eq(organizations.id, id));
  }

  async seedDefaultCustomFields(organizationId: string): Promise<{ seeded: number; skipped: number }> {
    const defaultCustomFields = [
      { name: 'role', label: 'What best describes your role in the company?', fieldType: 'select', options: ['Executive', 'Manager', 'Individual Contributor', 'Consultant', 'Other'], displayOrder: 1 },
      { name: 'jobFunction', label: 'What is your job function?', fieldType: 'select', options: ['Sales', 'Marketing', 'Engineering', 'Product', 'Operations', 'Finance', 'HR', 'Other'], displayOrder: 2 },
      { name: 'companyType', label: 'Company Type', fieldType: 'select', options: ['Enterprise', 'Mid-Market', 'SMB', 'Startup', 'Agency', 'Nonprofit', 'Government', 'Other'], displayOrder: 3 },
      { name: 'country', label: 'Country', fieldType: 'select', options: ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Other'], displayOrder: 4 },
      { name: 'dietaryRestrictions', label: 'Do you have any dietary restrictions?', fieldType: 'select', options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Kosher', 'Halal', 'Other'], displayOrder: 5 },
      { name: 'emergencyContact', label: 'Emergency Contact', fieldType: 'text', displayOrder: 6 },
      { name: 'emergencyPhone', label: 'Emergency Contact Phone', fieldType: 'text', displayOrder: 7 },
      { name: 'emergencyEmail', label: 'Emergency Contact Email', fieldType: 'text', displayOrder: 8 },
      { name: 'termsAndconditions', label: 'I have read the terms and conditions.', fieldType: 'checkbox', displayOrder: 9 },
    ];
    
    // Get ALL existing custom fields for this organization (not just global ones)
    // to check for both name and label duplicates
    const existingFields = await db.select().from(customFields).where(
      eq(customFields.organizationId, organizationId)
    );
    const existingNames = new Set(existingFields.map(f => f.name));
    const existingLabels = new Set(existingFields.map(f => f.label.toLowerCase().trim()));
    
    let seeded = 0;
    let skipped = 0;
    
    for (const field of defaultCustomFields) {
      // Skip if name OR label already exists (case-insensitive for labels)
      if (existingNames.has(field.name) || existingLabels.has(field.label.toLowerCase().trim())) {
        skipped++;
        continue;
      }
      
      await db.insert(customFields).values({
        organizationId,
        name: field.name,
        label: field.label,
        fieldType: field.fieldType,
        options: field.options || null,
        displayOrder: field.displayOrder,
        isActive: true,
        isGlobal: true,
        required: false,
        attendeeOnly: false,
      });
      seeded++;
    }
    
    return { seeded, skipped };
  }

  // Organization Member operations
  async getOrganizationMembers(organizationId: string): Promise<Array<OrganizationMember & { user: User }>> {
    const results = await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        permissions: organizationMembers.permissions,
        invitedBy: organizationMembers.invitedBy,
        createdAt: organizationMembers.createdAt,
        updatedAt: organizationMembers.updatedAt,
        user: users,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
    
    return results.map(r => ({
      id: r.id,
      organizationId: r.organizationId,
      userId: r.userId,
      role: r.role,
      permissions: r.permissions,
      invitedBy: r.invitedBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: r.user,
    }));
  }

  async getOrganizationMember(organizationId: string, userId: string): Promise<OrganizationMember | undefined> {
    const [member] = await db.select().from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)));
    return member;
  }

  async updateOrganizationMember(organizationId: string, userId: string, updates: Partial<InsertOrganizationMember>): Promise<OrganizationMember | undefined> {
    const [updated] = await db
      .update(organizationMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)))
      .returning();
    return updated;
  }

  async removeOrganizationMember(organizationId: string, userId: string): Promise<void> {
    await db.delete(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)));
  }

  // Team Invitation operations
  async createTeamInvitation(invitation: Omit<InsertTeamInvitation, 'inviteCode'>): Promise<TeamInvitation> {
    const inviteCode = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const [newInvitation] = await db.insert(teamInvitations).values({
      ...invitation,
      inviteCode,
      expiresAt,
    }).returning();
    return newInvitation;
  }

  async getTeamInvitations(organizationId: string): Promise<TeamInvitation[]> {
    return db.select().from(teamInvitations)
      .where(eq(teamInvitations.organizationId, organizationId))
      .orderBy(desc(teamInvitations.invitedAt));
  }

  async getTeamInvitation(organizationId: string, id: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations)
      .where(and(eq(teamInvitations.organizationId, organizationId), eq(teamInvitations.id, id)));
    return invitation;
  }

  async getTeamInvitationsForEmail(email: string): Promise<TeamInvitation[]> {
    // Use case-insensitive comparison since invitations are stored lowercase
    // but user emails from OIDC may have different casing
    return db.select().from(teamInvitations)
      .where(and(
        sql`lower(${teamInvitations.email}) = lower(${email})`,
        eq(teamInvitations.status, 'pending')
      ))
      .orderBy(desc(teamInvitations.invitedAt));
  }

  async getTeamInvitationByCode(inviteCode: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db.select().from(teamInvitations)
      .where(eq(teamInvitations.inviteCode, inviteCode));
    return invitation;
  }

  async updateTeamInvitation(id: string, updates: Partial<InsertTeamInvitation>): Promise<TeamInvitation | undefined> {
    const [updated] = await db
      .update(teamInvitations)
      .set(updates)
      .where(eq(teamInvitations.id, id))
      .returning();
    return updated;
  }

  async acceptTeamInvitation(inviteCode: string, userId: string): Promise<OrganizationMember | undefined> {
    console.log(`[TeamInvitation] acceptTeamInvitation called - inviteCode: ${inviteCode}, userId: ${userId}`);
    
    const invitation = await this.getTeamInvitationByCode(inviteCode);
    
    if (!invitation) {
      console.log(`[TeamInvitation] No invitation found for code: ${inviteCode}`);
      return undefined;
    }
    
    console.log(`[TeamInvitation] Found invitation: id=${invitation.id}, email=${invitation.email}, status=${invitation.status}, orgId=${invitation.organizationId}`);
    
    if (invitation.status !== 'pending') {
      console.log(`[TeamInvitation] Invitation status is not pending: ${invitation.status}`);
      return undefined;
    }
    
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      console.log(`[TeamInvitation] Invitation has expired: ${invitation.expiresAt}`);
      await db.update(teamInvitations)
        .set({ status: 'expired' })
        .where(eq(teamInvitations.id, invitation.id));
      return undefined;
    }
    
    let memberToReturn: OrganizationMember;
    
    const existingMember = await this.getOrganizationMember(invitation.organizationId, userId);
    if (existingMember) {
      console.log(`[TeamInvitation] User already a member of org, using existing membership`);
      memberToReturn = existingMember;
    } else {
      console.log(`[TeamInvitation] Creating new organization membership for user ${userId} in org ${invitation.organizationId}`);
      const [newMember] = await db.insert(organizationMembers).values({
        organizationId: invitation.organizationId,
        userId: userId,
        role: invitation.role,
        permissions: invitation.permissions,
        invitedBy: invitation.invitedBy,
      }).returning();
      memberToReturn = newMember;
      console.log(`[TeamInvitation] Created membership: ${JSON.stringify(newMember)}`);
    }
    
    // Always update invitation status to accepted (regardless of whether member existed)
    console.log(`[TeamInvitation] Updating invitation ${invitation.id} status to 'accepted'`);
    const updateResult = await db.update(teamInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: userId,
      })
      .where(eq(teamInvitations.id, invitation.id))
      .returning();
    console.log(`[TeamInvitation] Update result: ${JSON.stringify(updateResult)}`);
    
    // Clean up auto-created default organization if user was its sole member
    // This runs ALWAYS (even for existing members) to ensure cleanup happens
    const userMemberships = await this.getUserOrganizations(userId);
    for (const membership of userMemberships) {
      // Skip the organization they just joined/belong to
      if (membership.organizationId === invitation.organizationId) {
        continue;
      }
      
      const org = await this.getOrganization(membership.organizationId);
      // Only clean up default "My Organization" orgs where user is the sole owner
      if (org && org.name === 'My Organization' && membership.role === 'owner') {
        const orgMembers = await this.getOrganizationMembers(membership.organizationId);
        // Only delete if user is the sole member
        if (orgMembers.length === 1 && orgMembers[0].userId === userId) {
          await this.deleteOrganization(membership.organizationId);
        }
      }
    }
    
    return memberToReturn;
  }

  async revokeTeamInvitation(organizationId: string, id: string): Promise<void> {
    await db.update(teamInvitations)
      .set({ status: 'revoked' })
      .where(and(eq(teamInvitations.organizationId, organizationId), eq(teamInvitations.id, id)));
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

  async getEventById(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
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
    // Order matters - delete child records before parent records they reference
    
    // Delete feedback records (references attendees and sessions)
    await db.delete(eventFeedback).where(eq(eventFeedback.eventId, id));
    await db.delete(sessionFeedback).where(eq(sessionFeedback.eventId, id));
    
    // Delete attendeeSavedSessions by BOTH attendeeId AND sessionId to cover both FK references
    await db.delete(attendeeSavedSessions).where(
      sql`attendee_id IN (SELECT id FROM attendees WHERE event_id = ${id})`
    );
    await db.delete(attendeeSavedSessions).where(
      sql`session_id IN (SELECT id FROM event_sessions WHERE event_id = ${id})`
    );
    
    await db.delete(attendeeInterests).where(
      sql`attendee_id IN (SELECT id FROM attendees WHERE event_id = ${id})`
    );
    
    // Delete session speakers (references sessions and speakers)
    await db.delete(sessionSpeakers).where(
      sql`session_id IN (SELECT id FROM event_sessions WHERE event_id = ${id})`
    );
    
    // Delete vendors before budget_items (vendors references budget_items)
    await db.delete(vendors).where(
      sql`budget_item_id IN (SELECT id FROM budget_items WHERE event_id = ${id})`
    );
    
    // Delete email events before email messages (emailEvents reference emailMessages)
    await db.delete(emailEvents).where(
      sql`message_id IN (SELECT id FROM email_messages WHERE attendee_id IN (SELECT id FROM attendees WHERE event_id = ${id}))`
    );
    
    // Delete email messages (references attendees and emailCampaigns)
    await db.delete(emailMessages).where(
      sql`attendee_id IN (SELECT id FROM attendees WHERE event_id = ${id})`
    );
    
    // Delete passkey reservations (references events and attendees)
    await db.delete(passkeyReservations).where(eq(passkeyReservations.eventId, id));
    
    // Delete moment responses before attendees (momentResponses reference attendees)
    await db.delete(momentResponses).where(eq(momentResponses.eventId, id));
    
    // Delete activation link clicks BEFORE attendees (activationLinkClicks.convertedToAttendeeId references attendees.id)
    await db.delete(activationLinkClicks).where(
      sql`${activationLinkClicks.activationLinkId} IN (SELECT id FROM activation_links WHERE event_id = ${id})`
    );
    
    // Delete engagement signals BEFORE attendees (engagementSignals.attendeeId references attendees.id)
    await db.delete(engagementSignals).where(eq(engagementSignals.eventId, id));
    
    // Delete attendees (attendees reference activation_links and packages)
    await db.delete(attendees).where(eq(attendees.eventId, id));
    
    // Delete activation links after attendees (attendees reference activation_links)
    await db.delete(activationLinks).where(eq(activationLinks.eventId, id));
    
    // Delete packages and invite codes (inviteCodes references attendeeTypes)
    await db.delete(eventPackages).where(eq(eventPackages.eventId, id));
    await db.delete(inviteCodes).where(eq(inviteCodes.eventId, id));
    
    // Delete attendeeTypes after inviteCodes (inviteCodes.attendeeTypeId references attendeeTypes.id)
    await db.delete(attendeeTypes).where(eq(attendeeTypes.eventId, id));
    
    // Delete sponsor-related records before eventSponsors (in order of FK dependencies)
    await db.delete(sponsorTaskCompletions).where(
      sql`task_id IN (SELECT id FROM sponsor_tasks WHERE event_id = ${id})`
    );
    await db.delete(sponsorContacts).where(
      sql`sponsor_id IN (SELECT id FROM event_sponsors WHERE event_id = ${id})`
    );
    await db.delete(contentAssets).where(
      sql`sponsor_id IN (SELECT id FROM event_sponsors WHERE event_id = ${id})`
    );
    await db.delete(sponsorTasks).where(eq(sponsorTasks.eventId, id));
    await db.delete(eventSponsors).where(eq(eventSponsors.eventId, id));
    await db.delete(speakers).where(eq(speakers.eventId, id));
    
    // Delete moments before sessions (moments.sessionId references eventSessions.id)
    await db.delete(moments).where(eq(moments.eventId, id));
    
    // Delete contentItems before sessions (contentItems.sessionId references eventSessions.id)
    await db.delete(contentItems).where(eq(contentItems.eventId, id));
    
    // Delete CFP-related records before sessions (cfpSubmissions.sessionId references eventSessions.id)
    await db.delete(cfpReviews).where(
      sql`submission_id IN (SELECT id FROM cfp_submissions WHERE cfp_config_id IN (SELECT id FROM cfp_configs WHERE event_id = ${id}))`
    );
    await db.delete(cfpSubmissions).where(
      sql`cfp_config_id IN (SELECT id FROM cfp_configs WHERE event_id = ${id})`
    );
    await db.delete(cfpTopics).where(
      sql`cfp_config_id IN (SELECT id FROM cfp_configs WHERE event_id = ${id})`
    );
    await db.delete(cfpReviewers).where(
      sql`cfp_config_id IN (SELECT id FROM cfp_configs WHERE event_id = ${id})`
    );
    await db.delete(cfpConfigs).where(eq(cfpConfigs.eventId, id));
    
    // Delete session tracks, rooms, and topics before sessions
    await db.delete(sessionTracks).where(eq(sessionTracks.eventId, id));
    await db.delete(sessionRooms).where(eq(sessionRooms.eventId, id));
    await db.delete(sessionTopics).where(eq(sessionTopics.eventId, id));
    await db.delete(eventSessions).where(eq(eventSessions.eventId, id));
    
    await db.delete(budgetItems).where(eq(budgetItems.eventId, id));
    await db.delete(budgetOffsets).where(eq(budgetOffsets.eventId, id));
    await db.delete(eventBudgetSettings).where(eq(eventBudgetSettings.eventId, id));
    await db.delete(budgetPayments).where(eq(budgetPayments.eventId, id));
    await db.delete(milestones).where(eq(milestones.eventId, id));
    await db.delete(deliverables).where(eq(deliverables.eventId, id));
    
    // Delete email events and messages linked to campaigns before deleting campaigns
    await db.delete(emailEvents).where(
      sql`message_id IN (SELECT id FROM email_messages WHERE campaign_id IN (SELECT id FROM email_campaigns WHERE event_id = ${id}))`
    );
    await db.delete(emailMessages).where(
      sql`campaign_id IN (SELECT id FROM email_campaigns WHERE event_id = ${id})`
    );
    
    await db.delete(emailCampaigns).where(eq(emailCampaigns.eventId, id));
    await db.delete(socialPosts).where(eq(socialPosts.eventId, id));
    await db.delete(emailTemplates).where(eq(emailTemplates.eventId, id));
    await db.delete(emailSyncJobs).where(eq(emailSyncJobs.eventId, id));
    
    // Delete page_versions before event_pages (page_versions references event_pages)
    await db.delete(pageVersions).where(
      sql`event_page_id IN (SELECT id FROM event_pages WHERE event_id = ${id})`
    );
    await db.delete(eventPages).where(eq(eventPages.eventId, id));
    await db.delete(registrationConfigs).where(eq(registrationConfigs.eventId, id));
    await db.delete(eventTranslations).where(eq(eventTranslations.eventId, id));
    await db.delete(feedbackConfigs).where(eq(feedbackConfigs.eventId, id));
    
    // Delete document workspace items (must delete in order due to FK constraints)
    await db.delete(documentApprovals).where(
      sql`document_id IN (SELECT id FROM documents WHERE event_id = ${id})`
    );
    await db.delete(documentComments).where(
      sql`document_id IN (SELECT id FROM documents WHERE event_id = ${id})`
    );
    await db.delete(documentActivity).where(
      sql`document_id IN (SELECT id FROM documents WHERE event_id = ${id})`
    );
    await db.delete(documentShares).where(
      sql`document_id IN (SELECT id FROM documents WHERE event_id = ${id})`
    );
    await db.delete(documents).where(eq(documents.eventId, id));
    await db.delete(documentFolders).where(eq(documentFolders.eventId, id));
    
    // Delete passkey event mappings
    await db.delete(passkeyEventMappings).where(eq(passkeyEventMappings.eventId, id));
    
    // Delete page views
    await db.delete(pageViews).where(eq(pageViews.eventId, id));
    
    // Now delete the event itself
    await db.delete(events).where(and(eq(events.organizationId, organizationId), eq(events.id, id)));
  }

  // Event Translation operations
  async getEventTranslations(organizationId: string, eventId: string): Promise<EventTranslation[]> {
    return db.select().from(eventTranslations)
      .where(and(
        eq(eventTranslations.organizationId, organizationId),
        eq(eventTranslations.eventId, eventId)
      ))
      .orderBy(eventTranslations.languageCode);
  }

  async getEventTranslation(organizationId: string, eventId: string, languageCode: string): Promise<EventTranslation | undefined> {
    const [translation] = await db.select().from(eventTranslations)
      .where(and(
        eq(eventTranslations.organizationId, organizationId),
        eq(eventTranslations.eventId, eventId),
        eq(eventTranslations.languageCode, languageCode)
      ));
    return translation;
  }

  async upsertEventTranslation(translation: InsertEventTranslation): Promise<EventTranslation> {
    const [result] = await db
      .insert(eventTranslations)
      .values(translation)
      .onConflictDoUpdate({
        target: [eventTranslations.eventId, eventTranslations.languageCode],
        set: {
          name: translation.name,
          description: translation.description,
          location: translation.location,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async deleteEventTranslation(organizationId: string, eventId: string, languageCode: string): Promise<void> {
    await db.delete(eventTranslations)
      .where(and(
        eq(eventTranslations.organizationId, organizationId),
        eq(eventTranslations.eventId, eventId),
        eq(eventTranslations.languageCode, languageCode)
      ));
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

  async getAttendeesByInviteCode(organizationId: string, inviteCodeId: string): Promise<Attendee[]> {
    return db.select().from(attendees)
      .where(and(eq(attendees.organizationId, organizationId), eq(attendees.inviteCodeId, inviteCodeId)))
      .orderBy(desc(attendees.createdAt));
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
    // First get all email messages for this attendee
    const messages = await db.select({ id: emailMessages.id }).from(emailMessages).where(eq(emailMessages.attendeeId, id));
    
    // Delete email events that reference these messages
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      await db.delete(emailEvents).where(inArray(emailEvents.messageId, messageIds));
    }
    
    // Delete email messages for this attendee
    await db.delete(emailMessages).where(eq(emailMessages.attendeeId, id));
    
    // Then delete the attendee
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

  async getInviteCodeBySubmission(organizationId: string, eventId: string, submissionId: number): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes)
      .where(and(
        eq(inviteCodes.organizationId, organizationId),
        eq(inviteCodes.eventId, eventId),
        eq(inviteCodes.cfpSubmissionId, submissionId)
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

  // Activation Link operations
  async getActivationLinks(organizationId: string, eventId?: string): Promise<ActivationLink[]> {
    if (eventId) {
      return db.select().from(activationLinks).where(and(eq(activationLinks.organizationId, organizationId), eq(activationLinks.eventId, eventId))).orderBy(desc(activationLinks.createdAt));
    }
    return db.select().from(activationLinks).where(eq(activationLinks.organizationId, organizationId)).orderBy(desc(activationLinks.createdAt));
  }

  async getActivationLink(organizationId: string, id: string): Promise<ActivationLink | undefined> {
    const [link] = await db.select().from(activationLinks)
      .where(and(eq(activationLinks.organizationId, organizationId), eq(activationLinks.id, id)));
    return link;
  }

  async getActivationLinkByShortCode(shortCode: string): Promise<ActivationLink | undefined> {
    const [link] = await db.select().from(activationLinks)
      .where(eq(activationLinks.shortCode, shortCode));
    return link;
  }

  async getActivationLinkById(id: string): Promise<ActivationLink | undefined> {
    const [link] = await db.select().from(activationLinks)
      .where(eq(activationLinks.id, id));
    return link;
  }

  async createActivationLink(link: InsertActivationLink): Promise<ActivationLink> {
    const [newLink] = await db.insert(activationLinks).values(link).returning();
    return newLink;
  }

  async updateActivationLink(organizationId: string, id: string, link: Partial<InsertActivationLink>): Promise<ActivationLink | undefined> {
    const [updated] = await db
      .update(activationLinks)
      .set({ ...link, updatedAt: new Date() })
      .where(and(eq(activationLinks.organizationId, organizationId), eq(activationLinks.id, id)))
      .returning();
    return updated;
  }

  async deleteActivationLink(organizationId: string, id: string): Promise<void> {
    await db.delete(activationLinkClicks).where(eq(activationLinkClicks.activationLinkId, id));
    await db.delete(activationLinks).where(and(eq(activationLinks.organizationId, organizationId), eq(activationLinks.id, id)));
  }

  async incrementActivationLinkClicks(id: string): Promise<void> {
    await db.update(activationLinks)
      .set({ clickCount: sql`${activationLinks.clickCount} + 1` })
      .where(eq(activationLinks.id, id));
  }

  async incrementActivationLinkConversions(id: string): Promise<void> {
    await db.update(activationLinks)
      .set({ conversionCount: sql`${activationLinks.conversionCount} + 1` })
      .where(eq(activationLinks.id, id));
  }

  // Activation Link Click operations
  async getActivationLinkClicks(activationLinkId: string): Promise<ActivationLinkClick[]> {
    return db.select().from(activationLinkClicks)
      .where(eq(activationLinkClicks.activationLinkId, activationLinkId))
      .orderBy(desc(activationLinkClicks.clickedAt));
  }

  async createActivationLinkClick(click: InsertActivationLinkClick): Promise<ActivationLinkClick> {
    const [newClick] = await db.insert(activationLinkClicks).values(click).returning();
    return newClick;
  }

  async updateActivationLinkClickConversion(clickId: string, attendeeId: string): Promise<void> {
    await db.update(activationLinkClicks)
      .set({ convertedToAttendeeId: attendeeId, convertedAt: new Date() })
      .where(eq(activationLinkClicks.id, clickId));
  }

  // Page View operations
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const [newView] = await db.insert(pageViews).values(pageView).returning();
    return newView;
  }

  async getActiveVisitors(organizationId: string, minutesAgo: number = 5): Promise<Array<{
    eventId: string;
    eventName: string;
    pageType: string;
    activeVisitors: number;
  }>> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    // Get recent page views with unique visitor counts per event/pageType
    const recentViews = await db.select({
      eventId: pageViews.eventId,
      pageType: pageViews.pageType,
      visitorHash: pageViews.visitorHash,
    })
      .from(pageViews)
      .where(and(
        eq(pageViews.organizationId, organizationId),
        sql`${pageViews.viewedAt} >= ${cutoffTime}`
      ));
    
    // Group by event and pageType, count unique visitors
    const visitorCounts: Record<string, { eventId: string; pageType: string; visitors: Set<string> }> = {};
    for (const view of recentViews) {
      const key = `${view.eventId}:${view.pageType}`;
      if (!visitorCounts[key]) {
        visitorCounts[key] = { eventId: view.eventId, pageType: view.pageType, visitors: new Set() };
      }
      visitorCounts[key].visitors.add(view.visitorHash);
    }
    
    // Get event names
    const eventIds = [...new Set(Object.values(visitorCounts).map(v => v.eventId))];
    if (eventIds.length === 0) return [];
    
    const eventList = await db.select({ id: events.id, name: events.name })
      .from(events)
      .where(inArray(events.id, eventIds));
    const eventMap = new Map(eventList.map(e => [e.id, e.name]));
    
    // Build result
    return Object.values(visitorCounts).map(v => ({
      eventId: v.eventId,
      eventName: eventMap.get(v.eventId) || 'Unknown Event',
      pageType: v.pageType,
      activeVisitors: v.visitors.size,
    })).sort((a, b) => b.activeVisitors - a.activeVisitors);
  }

  // Acquisition Metrics operations
  async getAcquisitionMetrics(organizationId: string): Promise<{
    uniqueVisitors: number;
    registrations: number;
    conversionRate: number;
    topSource: string | null;
    channelBreakdown: Array<{ channel: string; visits: number }>;
  }> {
    // Get all activation links for this organization
    const links = await db.select().from(activationLinks)
      .where(eq(activationLinks.organizationId, organizationId));
    
    const linkIds = links.map(l => l.id);
    
    // Count unique visitors (unique visitorHash from clicks)
    let uniqueVisitors = 0;
    if (linkIds.length > 0) {
      const clicksResult = await db.selectDistinct({ visitorHash: activationLinkClicks.visitorHash })
        .from(activationLinkClicks)
        .where(inArray(activationLinkClicks.activationLinkId, linkIds));
      uniqueVisitors = clicksResult.filter(c => c.visitorHash).length;
    }
    
    // Count ALL confirmed registrations for display
    const allConfirmedAttendees = await db.select().from(attendees)
      .where(and(
        eq(attendees.organizationId, organizationId),
        eq(attendees.registrationStatus, "confirmed")
      ));
    const registrations = allConfirmedAttendees.length;
    
    // For conversion rate, only count registrations that came through activation links
    let attributedRegistrations = 0;
    if (linkIds.length > 0) {
      const attributedAttendees = await db.select().from(attendees)
        .where(and(
          eq(attendees.organizationId, organizationId),
          eq(attendees.registrationStatus, "confirmed"),
          inArray(attendees.activationLinkId, linkIds)
        ));
      attributedRegistrations = attributedAttendees.length;
    }
    
    // Calculate conversion rate using only attributed registrations vs unique visitors
    const conversionRate = uniqueVisitors > 0 ? (attributedRegistrations / uniqueVisitors) * 100 : 0;
    
    // Build channel breakdown from activation link clicks grouped by utm_source
    const channelGroups: Record<string, number> = {};
    if (links.length > 0) {
      for (const link of links) {
        const channel = link.utmSource || 'Organic';
        channelGroups[channel] = (channelGroups[channel] || 0) + (link.clickCount || 0);
      }
    }
    
    // Also count organic registrations (those without activation link attribution)
    const organicAttendees = await db.select().from(attendees)
      .where(and(
        eq(attendees.organizationId, organizationId),
        eq(attendees.registrationStatus, "confirmed"),
        sql`${attendees.activationLinkId} IS NULL`
      ));
    if (organicAttendees.length > 0) {
      channelGroups['Organic'] = (channelGroups['Organic'] || 0) + organicAttendees.length;
    }
    
    // Convert to array and sort by visits descending
    const channelBreakdown = Object.entries(channelGroups)
      .map(([channel, visits]) => ({ channel, visits }))
      .sort((a, b) => b.visits - a.visits);
    
    // Find top source (highest visits)
    const topSource = channelBreakdown.length > 0 ? channelBreakdown[0].channel : null;
    
    return {
      uniqueVisitors,
      registrations,
      conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
      topSource,
      channelBreakdown,
    };
  }

  // Acquisition Funnel operations - Two separate internally consistent funnels
  async getAcquisitionFunnel(organizationId: string, eventId?: string): Promise<{
    emailFunnel: Array<{
      stage: string;
      count: number;
      percentFromPrevious: number | null;
      tooltip: string;
    }>;
    activationFunnel: Array<{
      stage: string;
      count: number;
      percentFromPrevious: number | null;
      tooltip: string;
    }>;
  }> {
    // Two separate funnels with internal consistency:
    // Email Channel: All stages use email address as identifier
    // Activation Channel: All stages use activation link relationship
    
    const validStatuses = ['registered', 'confirmed', 'checked_in', 'pending'];
    
    // ============ EMAIL CHANNEL (all by email address) ============
    // Email Exposed: DISTINCT recipientEmail from emailMessages
    const emailExposedEmails = new Set<string>();
    try {
      const exposedQuery = eventId
        ? sql`
            SELECT DISTINCT em.recipient_email as email
            FROM email_messages em
            JOIN email_campaigns ec ON em.campaign_id = ec.id
            WHERE ec.organization_id = ${organizationId}
            AND ec.event_id = ${eventId}
          `
        : sql`
            SELECT DISTINCT em.recipient_email as email
            FROM email_messages em
            JOIN email_campaigns ec ON em.campaign_id = ec.id
            WHERE ec.organization_id = ${organizationId}
          `;
      
      const result = await db.execute(exposedQuery);
      for (const row of result.rows as any[]) {
        const email = row.email?.toLowerCase();
        if (email) emailExposedEmails.add(email);
      }
    } catch {
      // Table may not exist
    }
    
    // Email Engaged: Subset of Exposed who clicked (clickedAt IS NOT NULL)
    const emailEngagedEmails = new Set<string>();
    try {
      const clickedQuery = eventId
        ? sql`
            SELECT DISTINCT em.recipient_email as email
            FROM email_messages em
            JOIN email_campaigns ec ON em.campaign_id = ec.id
            WHERE ec.organization_id = ${organizationId}
            AND ec.event_id = ${eventId}
            AND em.clicked_at IS NOT NULL
          `
        : sql`
            SELECT DISTINCT em.recipient_email as email
            FROM email_messages em
            JOIN email_campaigns ec ON em.campaign_id = ec.id
            WHERE ec.organization_id = ${organizationId}
            AND em.clicked_at IS NOT NULL
          `;
      
      const result = await db.execute(clickedQuery);
      for (const row of result.rows as any[]) {
        const email = row.email?.toLowerCase();
        if (email) emailEngagedEmails.add(email);
      }
    } catch {
      // Table may not exist
    }
    
    // ============ ACTIVATION LINK CHANNEL (all by activation link) ============
    // Activation Exposed: DISTINCT visitorHash from activationLinkClicks
    let activationExposedCount = 0;
    try {
      const activationExposedQuery = eventId
        ? sql`
            SELECT COUNT(DISTINCT alc.visitor_hash) as count
            FROM activation_link_clicks alc
            JOIN activation_links al ON alc.activation_link_id = al.id
            WHERE al.organization_id = ${organizationId}
            AND al.event_id = ${eventId}
          `
        : sql`
            SELECT COUNT(DISTINCT alc.visitor_hash) as count
            FROM activation_link_clicks alc
            JOIN activation_links al ON alc.activation_link_id = al.id
            WHERE al.organization_id = ${organizationId}
          `;
      
      const result = await db.execute(activationExposedQuery);
      activationExposedCount = parseInt((result.rows[0] as any)?.count || '0', 10);
    } catch {
      // Table may not exist
    }
    
    // Activation Engaged: Same as Exposed (clicking = engagement for this channel)
    const activationEngagedCount = activationExposedCount;
    
    // ============ FETCH ATTENDEES ============
    let allAttendees: Attendee[] = [];
    try {
      const attendeesQuery = eventId
        ? and(
            eq(attendees.organizationId, organizationId),
            eq(attendees.eventId, eventId),
            inArray(attendees.registrationStatus, validStatuses)
          )
        : and(
            eq(attendees.organizationId, organizationId),
            inArray(attendees.registrationStatus, validStatuses)
          );
      
      allAttendees = await db.select()
        .from(attendees)
        .where(attendeesQuery);
    } catch {
      // Table may not exist
    }
    
    // Email Converted: Subset of Engaged who registered (attendees.email IN engagedEmails)
    const emailConvertedAttendees = allAttendees.filter(a => {
      const email = a.email?.toLowerCase();
      return email && emailEngagedEmails.has(email);
    });
    
    // Activation Converted: Attendees with activationLinkId (direct link to conversion)
    const activationConvertedAttendees = allAttendees.filter(a => a.activationLinkId !== null);
    
    // ============ ICP MATCHING (QUALIFIED) ============
    type TargetingConfig = {
      companyTypes: string[];
      roles: string[];
      functions: string[];
      accountFocus: string;
    };
    const defaultTargeting: TargetingConfig = {
      companyTypes: ['open'],
      roles: ['open'],
      functions: ['open'],
      accountFocus: 'open',
    };
    
    const eventTargetingMap = new Map<string, TargetingConfig>();
    try {
      if (eventId) {
        const eventResult = await db.select().from(events).where(eq(events.id, eventId));
        if (eventResult[0]?.audienceTargeting) {
          eventTargetingMap.set(eventId, eventResult[0].audienceTargeting as TargetingConfig);
        }
      } else {
        const allEvents = await db.select().from(events).where(eq(events.organizationId, organizationId));
        for (const event of allEvents) {
          if (event.audienceTargeting) {
            eventTargetingMap.set(event.id, event.audienceTargeting as TargetingConfig);
          }
        }
      }
    } catch {
      // Events table query failed
    }
    
    const inferRole = (jobTitle: string | null | undefined): string | null => {
      if (!jobTitle) return null;
      const title = jobTitle.toLowerCase();
      if (title.includes('ceo') || title.includes('cfo') || title.includes('cto') || 
          title.includes('chief') || title.includes('president') || title.includes('founder')) {
        return 'executive';
      }
      if (title.includes('vp') || title.includes('vice president')) {
        return 'vp';
      }
      if (title.includes('director')) {
        return 'director';
      }
      if (title.includes('manager') || title.includes('lead') || title.includes('head')) {
        return 'manager';
      }
      return null;
    };
    
    const inferFunction = (jobTitle: string | null | undefined): string | null => {
      if (!jobTitle) return null;
      const title = jobTitle.toLowerCase();
      if (title.includes('marketing') || title.includes('brand') || title.includes('growth')) {
        return 'marketing';
      }
      if (title.includes('sales') || title.includes('account executive') || title.includes('business development')) {
        return 'sales';
      }
      if (title.includes('product') || title.includes('pm')) {
        return 'product';
      }
      if (title.includes('engineer') || title.includes('developer') || title.includes('software') || title.includes('tech')) {
        return 'engineering';
      }
      if (title.includes('operations') || title.includes('ops') || title.includes('logistics')) {
        return 'operations';
      }
      return null;
    };
    
    const checkICPMatch = (attendee: Attendee): boolean => {
      const targeting = eventTargetingMap.get(attendee.eventId) || defaultTargeting;
      
      if (targeting.companyTypes.includes('open') && 
          targeting.roles.includes('open') && 
          targeting.functions.includes('open')) {
        return true;
      }
      
      let matches = 0;
      let criteria = 0;
      
      if (!targeting.companyTypes.includes('open')) {
        criteria++;
        const companyType = (attendee.customFieldValues as Record<string, unknown>)?.companyType as string | undefined;
        if (companyType && targeting.companyTypes.includes(companyType)) {
          matches++;
        }
      }
      
      if (!targeting.roles.includes('open')) {
        criteria++;
        const inferredRole = inferRole(attendee.jobTitle);
        if (inferredRole && targeting.roles.includes(inferredRole)) {
          matches++;
        }
      }
      
      if (!targeting.functions.includes('open')) {
        criteria++;
        const inferredFunction = inferFunction(attendee.jobTitle);
        if (inferredFunction && targeting.functions.includes(inferredFunction)) {
          matches++;
        }
      }
      
      return criteria === 0 || matches > 0;
    };
    
    // Email Qualified: Subset of Converted matching ICP
    const emailQualifiedAttendees = emailConvertedAttendees.filter(a => checkICPMatch(a));
    // Activation Qualified: Subset of Converted matching ICP
    const activationQualifiedAttendees = activationConvertedAttendees.filter(a => checkICPMatch(a));
    
    // Calculate counts
    const emailExposedCount = emailExposedEmails.size;
    const emailEngagedCount = emailEngagedEmails.size;
    const emailConvertedCount = emailConvertedAttendees.length;
    const emailQualifiedCount = emailQualifiedAttendees.length;
    
    const activationConvertedCount = activationConvertedAttendees.length;
    const activationQualifiedCount = activationQualifiedAttendees.length;
    
    const calcPercent = (current: number, previous: number): number | null => {
      if (previous === 0) return null;
      return Math.round((current / previous) * 100);
    };
    
    // Build Email Funnel (internally consistent: Exposed >= Engaged >= Converted >= Qualified)
    const emailFunnel = [
      {
        stage: 'Exposed',
        count: emailExposedCount,
        percentFromPrevious: null,
        tooltip: 'Unique email addresses that received campaign messages.',
      },
      {
        stage: 'Engaged',
        count: emailEngagedCount,
        percentFromPrevious: calcPercent(emailEngagedCount, emailExposedCount),
        tooltip: 'Email recipients who clicked a link in the message.',
      },
      {
        stage: 'Converted',
        count: emailConvertedCount,
        percentFromPrevious: calcPercent(emailConvertedCount, emailEngagedCount),
        tooltip: 'Engaged email recipients who registered for the event.',
      },
      {
        stage: 'Qualified',
        count: emailQualifiedCount,
        percentFromPrevious: calcPercent(emailQualifiedCount, emailConvertedCount),
        tooltip: 'Registered attendees from email who match your ICP criteria.',
      },
    ];
    
    // Build Activation Funnel (internally consistent: Exposed >= Engaged >= Converted >= Qualified)
    const activationFunnel = [
      {
        stage: 'Exposed',
        count: activationExposedCount,
        percentFromPrevious: null,
        tooltip: 'Unique visitors who clicked an activation link.',
      },
      {
        stage: 'Engaged',
        count: activationEngagedCount,
        percentFromPrevious: calcPercent(activationEngagedCount, activationExposedCount),
        tooltip: 'Clicking the activation link counts as engagement.',
      },
      {
        stage: 'Converted',
        count: activationConvertedCount,
        percentFromPrevious: calcPercent(activationConvertedCount, activationEngagedCount),
        tooltip: 'Visitors who registered via an activation link.',
      },
      {
        stage: 'Qualified',
        count: activationQualifiedCount,
        percentFromPrevious: calcPercent(activationQualifiedCount, activationConvertedCount),
        tooltip: 'Registered attendees from activation links who match your ICP criteria.',
      },
    ];
    
    return { emailFunnel, activationFunnel };
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

  async getSpeakerByEmail(organizationId: string, eventId: string, email: string): Promise<Speaker | undefined> {
    const [speaker] = await db.select().from(speakers)
      .where(and(
        eq(speakers.organizationId, organizationId),
        eq(speakers.eventId, eventId),
        eq(speakers.email, email)
      ));
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

  async getEventSponsorByToken(token: string): Promise<EventSponsor | undefined> {
    const [sponsor] = await db.select().from(eventSponsors)
      .where(and(
        eq(eventSponsors.portalAccessToken, token),
        gt(eventSponsors.portalTokenExpiresAt, new Date())
      ));
    return sponsor;
  }

  // Sponsor Contact operations
  async getSponsorContacts(organizationId: string, sponsorId: string): Promise<SponsorContact[]> {
    return db.select().from(sponsorContacts)
      .where(and(eq(sponsorContacts.organizationId, organizationId), eq(sponsorContacts.sponsorId, sponsorId)));
  }

  async getSponsorContact(organizationId: string, id: string): Promise<SponsorContact | undefined> {
    const [contact] = await db.select().from(sponsorContacts)
      .where(and(eq(sponsorContacts.organizationId, organizationId), eq(sponsorContacts.id, id)));
    return contact;
  }

  async getSponsorContactByToken(token: string): Promise<SponsorContact | undefined> {
    const [contact] = await db.select().from(sponsorContacts)
      .where(and(
        eq(sponsorContacts.portalAccessToken, token),
        gt(sponsorContacts.portalTokenExpiresAt, new Date())
      ));
    return contact;
  }

  async getSponsorContactByEmail(organizationId: string, sponsorId: string, email: string): Promise<SponsorContact | undefined> {
    const [contact] = await db.select().from(sponsorContacts)
      .where(and(
        eq(sponsorContacts.organizationId, organizationId),
        eq(sponsorContacts.sponsorId, sponsorId),
        eq(sponsorContacts.email, email)
      ));
    return contact;
  }

  async createSponsorContact(contact: InsertSponsorContact): Promise<SponsorContact> {
    const [newContact] = await db.insert(sponsorContacts).values(contact).returning();
    return newContact;
  }

  async updateSponsorContact(organizationId: string, id: string, contact: Partial<InsertSponsorContact>): Promise<SponsorContact | undefined> {
    const [updated] = await db
      .update(sponsorContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(and(eq(sponsorContacts.organizationId, organizationId), eq(sponsorContacts.id, id)))
      .returning();
    return updated;
  }

  async deleteSponsorContact(organizationId: string, id: string): Promise<void> {
    await db.delete(sponsorContacts).where(and(eq(sponsorContacts.organizationId, organizationId), eq(sponsorContacts.id, id)));
  }

  // Sponsor Task operations
  async getSponsorTasks(organizationId: string, eventId: string): Promise<SponsorTask[]> {
    return db.select().from(sponsorTasks)
      .where(and(eq(sponsorTasks.organizationId, organizationId), eq(sponsorTasks.eventId, eventId)))
      .orderBy(sponsorTasks.displayOrder);
  }

  async getSponsorTask(organizationId: string, id: string): Promise<SponsorTask | undefined> {
    const [task] = await db.select().from(sponsorTasks)
      .where(and(eq(sponsorTasks.organizationId, organizationId), eq(sponsorTasks.id, id)));
    return task;
  }

  async createSponsorTask(task: InsertSponsorTask): Promise<SponsorTask> {
    const [newTask] = await db.insert(sponsorTasks).values(task).returning();
    return newTask;
  }

  async updateSponsorTask(organizationId: string, id: string, task: Partial<InsertSponsorTask>): Promise<SponsorTask | undefined> {
    const [updated] = await db
      .update(sponsorTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(and(eq(sponsorTasks.organizationId, organizationId), eq(sponsorTasks.id, id)))
      .returning();
    return updated;
  }

  async deleteSponsorTask(organizationId: string, id: string): Promise<void> {
    await db.delete(sponsorTasks).where(and(eq(sponsorTasks.organizationId, organizationId), eq(sponsorTasks.id, id)));
  }

  // Sponsor Task Completion operations
  async getSponsorTaskCompletions(organizationId: string, sponsorId: string): Promise<SponsorTaskCompletion[]> {
    return db.select().from(sponsorTaskCompletions)
      .where(and(eq(sponsorTaskCompletions.organizationId, organizationId), eq(sponsorTaskCompletions.sponsorId, sponsorId)));
  }

  async getSponsorTaskCompletion(organizationId: string, taskId: string, sponsorId: string): Promise<SponsorTaskCompletion | undefined> {
    const [completion] = await db.select().from(sponsorTaskCompletions)
      .where(and(
        eq(sponsorTaskCompletions.organizationId, organizationId),
        eq(sponsorTaskCompletions.taskId, taskId),
        eq(sponsorTaskCompletions.sponsorId, sponsorId)
      ));
    return completion;
  }

  async upsertSponsorTaskCompletion(completion: InsertSponsorTaskCompletion): Promise<SponsorTaskCompletion> {
    const existing = await db.select().from(sponsorTaskCompletions)
      .where(and(
        eq(sponsorTaskCompletions.taskId, completion.taskId),
        eq(sponsorTaskCompletions.sponsorId, completion.sponsorId)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(sponsorTaskCompletions)
        .set({ ...completion, updatedAt: new Date() })
        .where(and(
          eq(sponsorTaskCompletions.taskId, completion.taskId),
          eq(sponsorTaskCompletions.sponsorId, completion.sponsorId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(sponsorTaskCompletions).values(completion).returning();
      return created;
    }
  }

  async updateSponsorTaskCompletion(organizationId: string, id: string, completion: Partial<InsertSponsorTaskCompletion>): Promise<SponsorTaskCompletion | undefined> {
    const [updated] = await db
      .update(sponsorTaskCompletions)
      .set({ ...completion, updatedAt: new Date() })
      .where(and(eq(sponsorTaskCompletions.organizationId, organizationId), eq(sponsorTaskCompletions.id, id)))
      .returning();
    return updated;
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
    // Delete from child tables first (cascade order matters for FK constraints)
    // Tables referencing eventSessions: sessionSpeakers, attendeeSavedSessions, sessionFeedback, 
    // contentItems, cfpSubmissions, moments, momentResponses, engagementSignals, sessionCheckIns
    
    // Delete moment responses first (references moments and sessions)
    await db.delete(momentResponses).where(eq(momentResponses.sessionId, id));
    
    // Delete moments (references sessions)
    await db.delete(moments).where(eq(moments.sessionId, id));
    
    // Delete other direct session references
    await db.delete(sessionCheckIns).where(eq(sessionCheckIns.sessionId, id));
    await db.delete(engagementSignals).where(eq(engagementSignals.sessionId, id));
    await db.delete(sessionFeedback).where(eq(sessionFeedback.sessionId, id));
    await db.delete(attendeeSavedSessions).where(eq(attendeeSavedSessions.sessionId, id));
    await db.delete(sessionSpeakers).where(eq(sessionSpeakers.sessionId, id));
    
    // Unlink content items and CFP submissions (set sessionId to null instead of deleting)
    await db.update(contentItems).set({ sessionId: null }).where(eq(contentItems.sessionId, id));
    await db.update(cfpSubmissions).set({ sessionId: null }).where(eq(cfpSubmissions.sessionId, id));
    
    // Finally delete the session
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
  async getSessionRooms(organizationId: string, eventId?: string): Promise<SessionRoom[]> {
    if (eventId) {
      return db.select().from(sessionRooms)
        .where(and(eq(sessionRooms.organizationId, organizationId), eq(sessionRooms.eventId, eventId)))
        .orderBy(sessionRooms.name);
    }
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

  // Session Topic operations
  async getSessionTopics(organizationId: string, eventId?: string): Promise<SessionTopic[]> {
    if (eventId) {
      return db.select().from(sessionTopics)
        .where(and(eq(sessionTopics.organizationId, organizationId), eq(sessionTopics.eventId, eventId)))
        .orderBy(sessionTopics.displayOrder, sessionTopics.name);
    }
    return db.select().from(sessionTopics)
      .where(eq(sessionTopics.organizationId, organizationId))
      .orderBy(sessionTopics.displayOrder, sessionTopics.name);
  }

  async getSessionTopic(organizationId: string, id: string): Promise<SessionTopic | undefined> {
    const [topic] = await db.select().from(sessionTopics)
      .where(and(eq(sessionTopics.organizationId, organizationId), eq(sessionTopics.id, id)));
    return topic;
  }

  async createSessionTopic(topic: InsertSessionTopic): Promise<SessionTopic> {
    const [newTopic] = await db.insert(sessionTopics).values(topic).returning();
    return newTopic;
  }

  async updateSessionTopic(organizationId: string, id: string, topic: Partial<InsertSessionTopic>): Promise<SessionTopic | undefined> {
    const [updated] = await db
      .update(sessionTopics)
      .set({ ...topic, updatedAt: new Date() })
      .where(and(eq(sessionTopics.organizationId, organizationId), eq(sessionTopics.id, id)))
      .returning();
    return updated;
  }

  async deleteSessionTopic(organizationId: string, id: string): Promise<void> {
    await db.delete(sessionTopics).where(and(eq(sessionTopics.organizationId, organizationId), eq(sessionTopics.id, id)));
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

  // Email Template Library operations (system-wide shared templates)
  async getEmailTemplateLibrary(id: string): Promise<EmailTemplateLibrary | undefined> {
    const [template] = await db.select().from(emailTemplateLibrary)
      .where(eq(emailTemplateLibrary.id, id));
    return template;
  }

  async listEmailTemplateLibrary(): Promise<EmailTemplateLibrary[]> {
    return db.select().from(emailTemplateLibrary)
      .where(eq(emailTemplateLibrary.isActive, true))
      .orderBy(desc(emailTemplateLibrary.createdAt));
  }

  async createEmailTemplateLibrary(template: InsertEmailTemplateLibrary): Promise<EmailTemplateLibrary> {
    const [newTemplate] = await db.insert(emailTemplateLibrary).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplateLibrary(id: string, template: Partial<InsertEmailTemplateLibrary>): Promise<EmailTemplateLibrary | undefined> {
    const [updated] = await db
      .update(emailTemplateLibrary)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(emailTemplateLibrary.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplateLibrary(id: string): Promise<boolean> {
    const [updated] = await db
      .update(emailTemplateLibrary)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(emailTemplateLibrary.id, id))
      .returning();
    return !!updated;
  }

  async importLibraryTemplate(libraryTemplateId: string, targetOrganizationId: string, eventId?: string): Promise<EmailTemplate> {
    const libraryTemplate = await this.getEmailTemplateLibrary(libraryTemplateId);
    if (!libraryTemplate) {
      throw new Error("Library template not found");
    }

    const [newTemplate] = await db.insert(emailTemplates).values({
      organizationId: targetOrganizationId,
      eventId: eventId || null,
      name: libraryTemplate.name,
      subject: libraryTemplate.subject,
      content: libraryTemplate.content,
      headerImageUrl: libraryTemplate.headerImageUrl,
      campaignRole: libraryTemplate.campaignRole,
      styles: libraryTemplate.styles,
      libraryTemplateId: libraryTemplateId,
    }).returning();
    return newTemplate;
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

  async getEventBySlugAndOrganization(slug: string, organizationId: string): Promise<Event | undefined> {
    // Get event by slug scoped to a specific organization (for custom domain resolution)
    const trimmedSlug = slug.trim();
    const [event] = await db.select().from(events).where(
      and(
        ilike(events.publicSlug, trimmedSlug),
        eq(events.organizationId, organizationId)
      )
    );
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

  async upsertEventPage(page: InsertEventPage & { id?: string }): Promise<EventPage> {
    const insertValue = page as typeof eventPages.$inferInsert & { id?: string };
    
    // For custom pages, handle differently than core page types
    if (page.pageType === "custom") {
      if (insertValue.id) {
        // Existing custom page - update by id
        const [result] = await db
          .update(eventPages)
          .set({
            name: insertValue.name,
            slug: insertValue.slug,
            isPublished: insertValue.isPublished,
            theme: insertValue.theme,
            seo: insertValue.seo,
            sections: insertValue.sections,
            updatedAt: new Date(),
          })
          .where(and(
            eq(eventPages.id, insertValue.id),
            eq(eventPages.organizationId, insertValue.organizationId!)
          ))
          .returning();
        return result;
      } else {
        // New custom page - plain insert
        const [result] = await db
          .insert(eventPages)
          .values(insertValue)
          .returning();
        return result;
      }
    }
    
    // For core page types (landing, registration, portal) - check if exists, then update or insert
    // The unique index is now (eventId, pageType, slug) so we can't use simple onConflict
    const [existing] = await db.select({ id: eventPages.id })
      .from(eventPages)
      .where(and(
        eq(eventPages.organizationId, insertValue.organizationId!),
        eq(eventPages.eventId, insertValue.eventId!),
        eq(eventPages.pageType, insertValue.pageType!)
      ));
    
    if (existing) {
      // Update existing core page
      const [result] = await db
        .update(eventPages)
        .set({
          slug: insertValue.slug,
          isPublished: insertValue.isPublished,
          theme: insertValue.theme,
          seo: insertValue.seo,
          sections: insertValue.sections,
          updatedAt: new Date(),
        })
        .where(eq(eventPages.id, existing.id))
        .returning();
      return result;
    } else {
      // Insert new core page
      const [result] = await db
        .insert(eventPages)
        .values(insertValue)
        .returning();
      return result;
    }
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

  // Custom Field Template operations (super admin only - system-wide templates)
  async getCustomFieldTemplates(): Promise<CustomFieldTemplate[]> {
    return db.select().from(customFieldTemplates)
      .orderBy(customFieldTemplates.displayOrder);
  }

  async getCustomFieldTemplate(id: string): Promise<CustomFieldTemplate | undefined> {
    const [template] = await db.select().from(customFieldTemplates)
      .where(eq(customFieldTemplates.id, id));
    return template;
  }

  async createCustomFieldTemplate(template: InsertCustomFieldTemplate): Promise<CustomFieldTemplate> {
    const [newTemplate] = await db.insert(customFieldTemplates).values(template).returning();
    return newTemplate;
  }

  async updateCustomFieldTemplate(id: string, template: Partial<InsertCustomFieldTemplate>): Promise<CustomFieldTemplate | undefined> {
    const [updated] = await db
      .update(customFieldTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(customFieldTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteCustomFieldTemplate(id: string): Promise<void> {
    await db.delete(customFieldTemplates).where(eq(customFieldTemplates.id, id));
  }

  async pushTemplatesToAllOrganizations(): Promise<{ organizationsUpdated: number; fieldsCreated: number }> {
    const templates = await this.getCustomFieldTemplates();
    if (templates.length === 0) {
      return { organizationsUpdated: 0, fieldsCreated: 0 };
    }
    
    // Get all active organizations
    const allOrgs = await db.select().from(organizations)
      .where(or(eq(organizations.isArchived, false), isNull(organizations.isArchived)));
    
    let organizationsUpdated = 0;
    let fieldsCreated = 0;
    
    for (const org of allOrgs) {
      // Get existing custom field names for this organization
      const existingFields = await db.select().from(customFields)
        .where(eq(customFields.organizationId, org.id));
      const existingFieldNames = new Set(existingFields.map(f => f.name));
      
      // Find templates that don't already exist in this organization
      const newTemplates = templates.filter(t => !existingFieldNames.has(t.name));
      
      if (newTemplates.length > 0) {
        organizationsUpdated++;
        
        // Create new fields from templates
        for (const template of newTemplates) {
          await db.insert(customFields).values({
            organizationId: org.id,
            name: template.name,
            label: template.label,
            fieldType: template.fieldType,
            options: template.options || null,
            displayOrder: template.displayOrder,
            isActive: template.isActive,
            isGlobal: template.isGlobal,
            required: template.required,
            attendeeOnly: template.attendeeOnly,
            parentFieldId: null,
            parentTriggerValues: template.parentTriggerValues || null,
          });
          fieldsCreated++;
        }
        
        // Resolve parent field references
        const allFields = await db.select().from(customFields)
          .where(eq(customFields.organizationId, org.id));
        const fieldNameToId = new Map(allFields.map(f => [f.name, f.id]));
        
        for (const template of newTemplates) {
          if (template.parentFieldName) {
            const parentId = fieldNameToId.get(template.parentFieldName);
            const childId = fieldNameToId.get(template.name);
            if (parentId && childId) {
              await db.update(customFields)
                .set({ parentFieldId: parentId })
                .where(eq(customFields.id, childId));
            }
          }
        }
      }
    }
    
    return { organizationsUpdated, fieldsCreated };
  }

  async getActiveCustomFieldsByEventSlug(slug: string): Promise<CustomField[]> {
    const event = await this.getEventBySlug(slug);
    if (!event) return [];
    
    // Get ALL custom fields for the organization (to allow per-event activation of org-disabled fields)
    const allFields = await db.select().from(customFields)
      .where(eq(customFields.organizationId, event.organizationId))
      .orderBy(customFields.displayOrder);
    
    // Get event-specific custom field settings (per-event overrides)
    const eventSettings = await this.getEventCustomFieldSettings(event.organizationId, event.id);
    const settingsMap = new Map(eventSettings.map(s => [s.customFieldId, s]));
    
    // Get the registration config to check which non-global fields are enabled
    const regConfig = await this.getRegistrationConfig(event.organizationId, event.id);
    const enabledCustomFieldIds = regConfig?.step1Config?.enabledCustomFieldIds;
    
    // Apply per-event overrides to each field
    let resolvedFields = allFields.map(field => {
      const override = settingsMap.get(field.id);
      if (!override) return field;
      
      // Apply overrides (null values mean "use org default", so only apply if not null)
      return {
        ...field,
        required: override.required ?? field.required,
        isActive: override.isActive ?? field.isActive,
        displayOrder: override.displayOrder ?? field.displayOrder,
        parentFieldId: override.parentFieldId !== undefined ? override.parentFieldId : field.parentFieldId,
        parentTriggerValues: override.parentTriggerValues ?? field.parentTriggerValues,
      };
    });
    
    // Filter to only fields with effective isActive = true (org default or per-event override)
    resolvedFields = resolvedFields.filter(field => field.isActive === true);
    
    // Sort by resolved display order
    resolvedFields.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    
    // If no registration config exists or enabledCustomFieldIds is not explicitly set,
    // return ALL active fields to maintain backward compatibility
    if (!regConfig || enabledCustomFieldIds === undefined || enabledCustomFieldIds === null) {
      return resolvedFields;
    }
    
    // Return global fields (always included) + explicitly enabled non-global fields
    return resolvedFields.filter(field => 
      field.isGlobal === true || enabledCustomFieldIds.includes(field.id)
    );
  }

  // Event Custom Field Settings operations (per-event overrides)
  async getEventCustomFieldSettings(organizationId: string, eventId: string): Promise<EventCustomFieldSetting[]> {
    return db.select().from(eventCustomFieldSettings)
      .where(and(
        eq(eventCustomFieldSettings.organizationId, organizationId),
        eq(eventCustomFieldSettings.eventId, eventId)
      ));
  }

  async getEventCustomFieldSetting(organizationId: string, eventId: string, customFieldId: string): Promise<EventCustomFieldSetting | undefined> {
    const [setting] = await db.select().from(eventCustomFieldSettings)
      .where(and(
        eq(eventCustomFieldSettings.organizationId, organizationId),
        eq(eventCustomFieldSettings.eventId, eventId),
        eq(eventCustomFieldSettings.customFieldId, customFieldId)
      ));
    return setting;
  }

  async upsertEventCustomFieldSetting(setting: InsertEventCustomFieldSetting): Promise<EventCustomFieldSetting> {
    // Only update fields that are explicitly provided (not undefined)
    // This prevents wiping out existing values during partial updates
    const updateSet: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (setting.required !== undefined) updateSet.required = setting.required;
    if (setting.isActive !== undefined) updateSet.isActive = setting.isActive;
    if (setting.displayOrder !== undefined) updateSet.displayOrder = setting.displayOrder;
    if (setting.parentFieldId !== undefined) updateSet.parentFieldId = setting.parentFieldId;
    if (setting.parentTriggerValues !== undefined) updateSet.parentTriggerValues = setting.parentTriggerValues;

    const [result] = await db
      .insert(eventCustomFieldSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: [eventCustomFieldSettings.eventId, eventCustomFieldSettings.customFieldId],
        set: updateSet,
      })
      .returning();
    return result;
  }

  async deleteEventCustomFieldSetting(organizationId: string, eventId: string, customFieldId: string): Promise<void> {
    await db.delete(eventCustomFieldSettings)
      .where(and(
        eq(eventCustomFieldSettings.organizationId, organizationId),
        eq(eventCustomFieldSettings.eventId, eventId),
        eq(eventCustomFieldSettings.customFieldId, customFieldId)
      ));
  }

  async bulkUpsertEventCustomFieldSettings(settings: InsertEventCustomFieldSetting[]): Promise<EventCustomFieldSetting[]> {
    if (settings.length === 0) return [];
    const results: EventCustomFieldSetting[] = [];
    for (const setting of settings) {
      const result = await this.upsertEventCustomFieldSetting(setting);
      results.push(result);
    }
    return results;
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

  async updateContentAssetBySponsorUrl(organizationId: string, url: string, sponsorId: string, sponsorTier: string): Promise<boolean> {
    const result = await db
      .update(contentAssets)
      .set({ 
        folder: "Sponsor Logos", 
        sponsorId, 
        sponsorTier 
      })
      .where(and(
        eq(contentAssets.organizationId, organizationId),
        eq(contentAssets.publicUrl, url)
      ))
      .returning();
    return result.length > 0;
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

  // Vendor operations
  async getVendors(organizationId: string): Promise<Vendor[]> {
    return db.select().from(vendors)
      .where(eq(vendors.organizationId, organizationId))
      .orderBy(vendors.name);
  }

  async getVendor(organizationId: string, id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors)
      .where(and(eq(vendors.organizationId, organizationId), eq(vendors.id, id)));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async updateVendor(organizationId: string, id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db
      .update(vendors)
      .set({ ...vendor, updatedAt: new Date() })
      .where(and(eq(vendors.organizationId, organizationId), eq(vendors.id, id)))
      .returning();
    return updated;
  }

  async deleteVendor(organizationId: string, id: string): Promise<void> {
    // First get the vendor to find any associated budget item
    const vendor = await this.getVendor(organizationId, id);
    
    // Delete the vendor
    await db.delete(vendors).where(and(eq(vendors.organizationId, organizationId), eq(vendors.id, id)));
    
    // If vendor had an associated budget item, delete it as well
    if (vendor?.budgetItemId) {
      await db.delete(budgetItems).where(and(eq(budgetItems.organizationId, organizationId), eq(budgetItems.id, vendor.budgetItemId)));
    }
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
    const [inviteCode] = await db.select().from(signupInviteCodes).where(ilike(signupInviteCodes.code, code));
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

  async getSignupRedemptionForUser(userId: string): Promise<{ redemption: SignupInviteCodeRedemption; inviteCode: SignupInviteCode } | null> {
    const result = await db
      .select({
        redemption: signupInviteCodeRedemptions,
        inviteCode: signupInviteCodes,
      })
      .from(signupInviteCodeRedemptions)
      .innerJoin(signupInviteCodes, eq(signupInviteCodeRedemptions.inviteCodeId, signupInviteCodes.id))
      .where(eq(signupInviteCodeRedemptions.userId, userId))
      .orderBy(desc(signupInviteCodeRedemptions.redeemedAt))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  }

  // Passkey Connection operations
  async getPasskeyConnection(organizationId: string): Promise<PasskeyConnection | undefined> {
    const [connection] = await db.select().from(passkeyConnections)
      .where(eq(passkeyConnections.organizationId, organizationId));
    return connection;
  }

  async createPasskeyConnection(data: InsertPasskeyConnection): Promise<PasskeyConnection> {
    const encryptedData = { ...data };
    if (data.clientId) {
      encryptedData.clientId = encrypt(data.clientId);
    }
    if (data.clientSecret) {
      encryptedData.clientSecret = encrypt(data.clientSecret);
    }
    if (data.accessToken) {
      encryptedData.accessToken = encrypt(data.accessToken);
    }
    
    const [connection] = await db.insert(passkeyConnections)
      .values(encryptedData)
      .returning();
    return connection;
  }

  async updatePasskeyConnection(
    organizationId: string,
    data: Partial<InsertPasskeyConnection>
  ): Promise<PasskeyConnection | undefined> {
    const updateData = { ...data, updatedAt: new Date() };
    if (data.clientId) {
      updateData.clientId = encrypt(data.clientId);
    }
    if (data.clientSecret) {
      updateData.clientSecret = encrypt(data.clientSecret);
    }
    if (data.accessToken) {
      updateData.accessToken = encrypt(data.accessToken);
    }
    
    const [updated] = await db.update(passkeyConnections)
      .set(updateData)
      .where(eq(passkeyConnections.organizationId, organizationId))
      .returning();
    return updated;
  }

  async deletePasskeyConnection(organizationId: string): Promise<void> {
    await db.delete(passkeyConnections)
      .where(eq(passkeyConnections.organizationId, organizationId));
  }

  // Passkey Event Mapping operations
  async getPasskeyEventMappings(organizationId: string): Promise<PasskeyEventMapping[]> {
    return db.select().from(passkeyEventMappings)
      .where(eq(passkeyEventMappings.organizationId, organizationId))
      .orderBy(desc(passkeyEventMappings.createdAt));
  }

  async getPasskeyEventMapping(organizationId: string, eventId: string): Promise<PasskeyEventMapping | undefined> {
    const [mapping] = await db.select().from(passkeyEventMappings)
      .where(and(
        eq(passkeyEventMappings.organizationId, organizationId),
        eq(passkeyEventMappings.eventId, eventId)
      ));
    return mapping;
  }

  async createPasskeyEventMapping(data: InsertPasskeyEventMapping): Promise<PasskeyEventMapping> {
    const [mapping] = await db.insert(passkeyEventMappings)
      .values(data)
      .returning();
    return mapping;
  }

  async updatePasskeyEventMapping(
    organizationId: string,
    eventId: string,
    data: Partial<InsertPasskeyEventMapping>
  ): Promise<PasskeyEventMapping | undefined> {
    const [updated] = await db.update(passkeyEventMappings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(passkeyEventMappings.organizationId, organizationId),
        eq(passkeyEventMappings.eventId, eventId)
      ))
      .returning();
    return updated;
  }

  async deletePasskeyEventMapping(organizationId: string, eventId: string): Promise<void> {
    await db.delete(passkeyEventMappings)
      .where(and(
        eq(passkeyEventMappings.organizationId, organizationId),
        eq(passkeyEventMappings.eventId, eventId)
      ));
  }

  // Passkey Reservation operations
  async getPasskeyReservations(organizationId: string, eventId?: string): Promise<PasskeyReservation[]> {
    if (eventId) {
      return db.select().from(passkeyReservations)
        .where(and(
          eq(passkeyReservations.organizationId, organizationId),
          eq(passkeyReservations.eventId, eventId)
        ))
        .orderBy(desc(passkeyReservations.createdAt));
    }
    return db.select().from(passkeyReservations)
      .where(eq(passkeyReservations.organizationId, organizationId))
      .orderBy(desc(passkeyReservations.createdAt));
  }

  async getPasskeyReservation(organizationId: string, id: string): Promise<PasskeyReservation | undefined> {
    const [reservation] = await db.select().from(passkeyReservations)
      .where(and(
        eq(passkeyReservations.organizationId, organizationId),
        eq(passkeyReservations.id, id)
      ));
    return reservation;
  }

  async getPasskeyReservationByAttendee(organizationId: string, attendeeId: string): Promise<PasskeyReservation | undefined> {
    const [reservation] = await db.select().from(passkeyReservations)
      .where(and(
        eq(passkeyReservations.organizationId, organizationId),
        eq(passkeyReservations.attendeeId, attendeeId)
      ));
    return reservation;
  }

  async createPasskeyReservation(data: InsertPasskeyReservation): Promise<PasskeyReservation> {
    const [reservation] = await db.insert(passkeyReservations)
      .values(data)
      .returning();
    return reservation;
  }

  async updatePasskeyReservation(
    organizationId: string,
    id: string,
    data: Partial<InsertPasskeyReservation>
  ): Promise<PasskeyReservation | undefined> {
    const [updated] = await db.update(passkeyReservations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(passkeyReservations.organizationId, organizationId),
        eq(passkeyReservations.id, id)
      ))
      .returning();
    return updated;
  }

  // Document operations
  async getDocuments(organizationId: string, eventId?: string, folderId?: string): Promise<Document[]> {
    const conditions = [eq(documents.organizationId, organizationId)];
    if (eventId) {
      conditions.push(eq(documents.eventId, eventId));
    }
    if (folderId) {
      conditions.push(eq(documents.folderId, folderId));
    } else if (folderId === null) {
      conditions.push(isNull(documents.folderId));
    }
    return db.select().from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(organizationId: string, id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents)
      .where(and(
        eq(documents.organizationId, organizationId),
        eq(documents.id, id)
      ));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: string, organizationId: string, doc: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updated] = await db.update(documents)
      .set({ ...doc, updatedAt: new Date() })
      .where(and(
        eq(documents.id, id),
        eq(documents.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteDocument(id: string, organizationId: string): Promise<void> {
    // Delete related records first
    await db.delete(documentShares).where(eq(documentShares.documentId, id));
    await db.delete(documentActivity).where(eq(documentActivity.documentId, id));
    await db.delete(documentComments).where(eq(documentComments.documentId, id));
    await db.delete(documentApprovals).where(eq(documentApprovals.documentId, id));
    await db.delete(documents).where(and(
      eq(documents.id, id),
      eq(documents.organizationId, organizationId)
    ));
  }

  // Document Folder operations
  async getDocumentFolders(organizationId: string, eventId?: string): Promise<DocumentFolder[]> {
    if (eventId) {
      return db.select().from(documentFolders)
        .where(and(
          eq(documentFolders.organizationId, organizationId),
          eq(documentFolders.eventId, eventId)
        ))
        .orderBy(documentFolders.name);
    }
    return db.select().from(documentFolders)
      .where(eq(documentFolders.organizationId, organizationId))
      .orderBy(documentFolders.name);
  }

  async getDocumentFolder(organizationId: string, id: string): Promise<DocumentFolder | undefined> {
    const [folder] = await db.select().from(documentFolders)
      .where(and(
        eq(documentFolders.organizationId, organizationId),
        eq(documentFolders.id, id)
      ));
    return folder;
  }

  async createDocumentFolder(folder: InsertDocumentFolder): Promise<DocumentFolder> {
    const [newFolder] = await db.insert(documentFolders).values(folder).returning();
    return newFolder;
  }

  async updateDocumentFolder(id: string, organizationId: string, folder: Partial<InsertDocumentFolder>): Promise<DocumentFolder | undefined> {
    const [updated] = await db.update(documentFolders)
      .set({ ...folder, updatedAt: new Date() })
      .where(and(
        eq(documentFolders.id, id),
        eq(documentFolders.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteDocumentFolder(id: string, organizationId: string): Promise<void> {
    // Move documents in this folder to no folder
    await db.update(documents)
      .set({ folderId: null })
      .where(eq(documents.folderId, id));
    await db.delete(documentFolders).where(and(
      eq(documentFolders.id, id),
      eq(documentFolders.organizationId, organizationId)
    ));
  }

  // Document Share operations
  async getDocumentShares(organizationId: string, documentId: string): Promise<DocumentShare[]> {
    return db.select().from(documentShares)
      .where(and(
        eq(documentShares.organizationId, organizationId),
        eq(documentShares.documentId, documentId)
      ))
      .orderBy(desc(documentShares.createdAt));
  }

  async getDocumentShareByToken(token: string): Promise<{ share: DocumentShare; document: Document } | undefined> {
    const [share] = await db.select().from(documentShares)
      .where(and(
        eq(documentShares.shareType, "link"),
        eq(documentShares.shareValue, token)
      ));
    
    if (!share) return undefined;
    
    // Check expiration
    if (share.expiresAt && new Date() > share.expiresAt) {
      return undefined;
    }
    
    const [document] = await db.select().from(documents)
      .where(eq(documents.id, share.documentId));
    
    if (!document) return undefined;
    
    return { share, document };
  }

  async createDocumentShare(share: InsertDocumentShare): Promise<DocumentShare> {
    const [newShare] = await db.insert(documentShares).values(share).returning();
    return newShare;
  }

  async deleteDocumentShare(id: string, organizationId: string): Promise<void> {
    await db.delete(documentShares).where(and(
      eq(documentShares.id, id),
      eq(documentShares.organizationId, organizationId)
    ));
  }

  // Document Comment operations
  async getDocumentComments(organizationId: string, documentId: string): Promise<DocumentComment[]> {
    return db.select().from(documentComments)
      .where(and(
        eq(documentComments.organizationId, organizationId),
        eq(documentComments.documentId, documentId)
      ))
      .orderBy(desc(documentComments.createdAt));
  }

  async getDocumentComment(organizationId: string, id: string): Promise<DocumentComment | undefined> {
    const [comment] = await db.select().from(documentComments)
      .where(and(
        eq(documentComments.organizationId, organizationId),
        eq(documentComments.id, id)
      ));
    return comment;
  }

  async createDocumentComment(comment: InsertDocumentComment): Promise<DocumentComment> {
    const [newComment] = await db.insert(documentComments).values(comment).returning();
    return newComment;
  }

  async updateDocumentComment(id: string, organizationId: string, updates: Partial<InsertDocumentComment>): Promise<DocumentComment | undefined> {
    const [updated] = await db.update(documentComments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(documentComments.id, id),
        eq(documentComments.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  // Document Approval operations
  async getDocumentApprovals(organizationId: string, documentId: string): Promise<DocumentApproval[]> {
    return db.select().from(documentApprovals)
      .where(and(
        eq(documentApprovals.organizationId, organizationId),
        eq(documentApprovals.documentId, documentId)
      ))
      .orderBy(desc(documentApprovals.createdAt));
  }

  async getDocumentApproval(organizationId: string, id: string): Promise<DocumentApproval | undefined> {
    const [approval] = await db.select().from(documentApprovals)
      .where(and(
        eq(documentApprovals.organizationId, organizationId),
        eq(documentApprovals.id, id)
      ));
    return approval;
  }

  async createDocumentApproval(approval: InsertDocumentApproval): Promise<DocumentApproval> {
    const [newApproval] = await db.insert(documentApprovals).values(approval).returning();
    return newApproval;
  }

  async updateDocumentApproval(id: string, organizationId: string, updates: Partial<InsertDocumentApproval>): Promise<DocumentApproval | undefined> {
    const [updated] = await db.update(documentApprovals)
      .set({ ...updates, respondedAt: updates.status && updates.status !== 'pending' ? new Date() : undefined })
      .where(and(
        eq(documentApprovals.id, id),
        eq(documentApprovals.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  // Document Activity operations
  async createDocumentActivity(activity: InsertDocumentActivity): Promise<DocumentActivity> {
    const [newActivity] = await db.insert(documentActivity).values(activity).returning();
    return newActivity;
  }

  async getDocumentActivity(organizationId: string, documentId: string): Promise<DocumentActivity[]> {
    return db.select().from(documentActivity)
      .where(and(
        eq(documentActivity.organizationId, organizationId),
        eq(documentActivity.documentId, documentId)
      ))
      .orderBy(desc(documentActivity.createdAt));
  }

  // Custom Font operations
  async getCustomFonts(organizationId: string): Promise<CustomFont[]> {
    return db.select().from(customFonts)
      .where(eq(customFonts.organizationId, organizationId))
      .orderBy(customFonts.name);
  }

  async getCustomFont(organizationId: string, id: string): Promise<CustomFont | undefined> {
    const [font] = await db.select().from(customFonts)
      .where(and(
        eq(customFonts.organizationId, organizationId),
        eq(customFonts.id, id)
      ));
    return font;
  }

  async getCustomFontByName(organizationId: string, name: string): Promise<CustomFont | undefined> {
    const [font] = await db.select().from(customFonts)
      .where(and(
        eq(customFonts.organizationId, organizationId),
        eq(customFonts.name, name)
      ));
    return font;
  }

  async createCustomFont(font: InsertCustomFont): Promise<CustomFont> {
    const [newFont] = await db.insert(customFonts).values(font).returning();
    return newFont;
  }

  async updateCustomFont(id: string, organizationId: string, updates: Partial<InsertCustomFont>): Promise<CustomFont | undefined> {
    const [updated] = await db.update(customFonts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(customFonts.id, id),
        eq(customFonts.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteCustomFont(id: string, organizationId: string): Promise<void> {
    // Delete variants first
    await db.delete(customFontVariants).where(eq(customFontVariants.customFontId, id));
    // Delete the font
    await db.delete(customFonts).where(and(
      eq(customFonts.id, id),
      eq(customFonts.organizationId, organizationId)
    ));
  }

  // Custom Font Variant operations
  async getCustomFontVariants(customFontId: string): Promise<CustomFontVariant[]> {
    return db.select().from(customFontVariants)
      .where(eq(customFontVariants.customFontId, customFontId))
      .orderBy(customFontVariants.weight);
  }

  async createCustomFontVariant(variant: InsertCustomFontVariant): Promise<CustomFontVariant> {
    const [newVariant] = await db.insert(customFontVariants).values(variant).returning();
    return newVariant;
  }

  async deleteCustomFontVariant(id: string): Promise<void> {
    await db.delete(customFontVariants).where(eq(customFontVariants.id, id));
  }

  // Brand Kit operations
  async getBrandKits(organizationId: string): Promise<BrandKit[]> {
    return db.select().from(brandKits)
      .where(eq(brandKits.organizationId, organizationId))
      .orderBy(desc(brandKits.createdAt));
  }

  async getBrandKit(id: string, organizationId: string): Promise<BrandKit | undefined> {
    const [kit] = await db.select().from(brandKits)
      .where(and(
        eq(brandKits.id, id),
        eq(brandKits.organizationId, organizationId)
      ));
    return kit;
  }

  async createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit> {
    const [newKit] = await db.insert(brandKits).values(brandKit).returning();
    return newKit;
  }

  async updateBrandKit(id: string, organizationId: string, updates: Partial<InsertBrandKit>): Promise<BrandKit | undefined> {
    const [updated] = await db.update(brandKits)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(brandKits.id, id),
        eq(brandKits.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteBrandKit(id: string, organizationId: string): Promise<void> {
    await db.delete(brandKits).where(and(
      eq(brandKits.id, id),
      eq(brandKits.organizationId, organizationId)
    ));
  }

  async getDefaultBrandKit(organizationId: string): Promise<BrandKit | undefined> {
    const [kit] = await db.select().from(brandKits)
      .where(and(
        eq(brandKits.organizationId, organizationId),
        eq(brandKits.isDefault, true)
      ));
    return kit;
  }

  // Marketing Lead operations
  async createMarketingLead(lead: InsertMarketingLead): Promise<MarketingLead> {
    const [newLead] = await db.insert(marketingLeads).values(lead).returning();
    return newLead;
  }

  async getMarketingLeads(): Promise<MarketingLead[]> {
    return db.select().from(marketingLeads).orderBy(desc(marketingLeads.createdAt));
  }

  async updateMarketingLeadStatus(id: string, status: string): Promise<MarketingLead | undefined> {
    const [updated] = await db.update(marketingLeads)
      .set({ status })
      .where(eq(marketingLeads.id, id))
      .returning();
    return updated;
  }

  // Marketing Activation Link operations (admin-level, not org-scoped)
  async getMarketingActivationLinks(): Promise<MarketingActivationLink[]> {
    return db.select().from(marketingActivationLinks).orderBy(desc(marketingActivationLinks.createdAt));
  }

  async getMarketingActivationLink(id: string): Promise<MarketingActivationLink | undefined> {
    const [link] = await db.select().from(marketingActivationLinks)
      .where(eq(marketingActivationLinks.id, id));
    return link;
  }

  async getMarketingActivationLinkByShortCode(shortCode: string): Promise<MarketingActivationLink | undefined> {
    const [link] = await db.select().from(marketingActivationLinks)
      .where(eq(marketingActivationLinks.shortCode, shortCode));
    return link;
  }

  async createMarketingActivationLink(link: InsertMarketingActivationLink): Promise<MarketingActivationLink> {
    const [newLink] = await db.insert(marketingActivationLinks).values(link).returning();
    return newLink;
  }

  async updateMarketingActivationLink(id: string, link: Partial<InsertMarketingActivationLink>): Promise<MarketingActivationLink | undefined> {
    const [updated] = await db
      .update(marketingActivationLinks)
      .set({ ...link, updatedAt: new Date() })
      .where(eq(marketingActivationLinks.id, id))
      .returning();
    return updated;
  }

  async deleteMarketingActivationLink(id: string): Promise<void> {
    await db.delete(marketingLinkClicks).where(eq(marketingLinkClicks.marketingLinkId, id));
    await db.delete(marketingActivationLinks).where(eq(marketingActivationLinks.id, id));
  }

  async incrementMarketingLinkClicks(id: string): Promise<void> {
    await db.update(marketingActivationLinks)
      .set({ clickCount: sql`${marketingActivationLinks.clickCount} + 1` })
      .where(eq(marketingActivationLinks.id, id));
  }

  async incrementMarketingLinkConversions(id: string): Promise<void> {
    await db.update(marketingActivationLinks)
      .set({ conversionCount: sql`${marketingActivationLinks.conversionCount} + 1` })
      .where(eq(marketingActivationLinks.id, id));
  }

  async getVisitorClickHistory(visitorHash: string): Promise<{ isReturning: boolean; previousCount: number }> {
    const clicks = await db.select({ count: sql<number>`count(*)` })
      .from(marketingLinkClicks)
      .where(eq(marketingLinkClicks.visitorHash, visitorHash));
    
    const count = Number(clicks[0]?.count || 0);
    return {
      isReturning: count > 0,
      previousCount: count,
    };
  }

  // Marketing Link Click operations
  async getMarketingLinkClicks(marketingLinkId: string): Promise<MarketingLinkClick[]> {
    return db.select().from(marketingLinkClicks)
      .where(eq(marketingLinkClicks.marketingLinkId, marketingLinkId))
      .orderBy(desc(marketingLinkClicks.clickedAt));
  }

  async createMarketingLinkClick(click: InsertMarketingLinkClick): Promise<MarketingLinkClick> {
    const [newClick] = await db.insert(marketingLinkClicks).values(click).returning();
    return newClick;
  }

  async updateMarketingLinkClickConversion(clickId: string, leadId: string): Promise<void> {
    await db.update(marketingLinkClicks)
      .set({ convertedToLeadId: leadId, convertedAt: new Date() })
      .where(eq(marketingLinkClicks.id, clickId));
  }

  // Marketing Acquisition Metrics
  async getMarketingAcquisitionMetrics(): Promise<{
    uniqueVisitors: number;
    leads: number;
    conversionRate: number;
    topSource: string | null;
    channelBreakdown: Array<{ channel: string; visits: number }>;
  }> {
    // Get all marketing activation links
    const links = await db.select().from(marketingActivationLinks);
    const linkIds = links.map(l => l.id);
    
    // Count unique visitors (unique visitorHash from clicks)
    let uniqueVisitors = 0;
    if (linkIds.length > 0) {
      const clicksResult = await db.selectDistinct({ visitorHash: marketingLinkClicks.visitorHash })
        .from(marketingLinkClicks)
        .where(inArray(marketingLinkClicks.marketingLinkId, linkIds));
      uniqueVisitors = clicksResult.filter(c => c.visitorHash).length;
    }
    
    // Count total leads
    const allLeads = await db.select().from(marketingLeads);
    const leads = allLeads.length;
    
    // Calculate conversion rate
    const conversionRate = uniqueVisitors > 0 
      ? Math.round((leads / uniqueVisitors) * 100 * 10) / 10 
      : 0;
    
    // Get channel breakdown (by utm_source)
    const channelCounts: Record<string, number> = {};
    for (const link of links) {
      const source = link.utmSource || 'direct';
      channelCounts[source] = (channelCounts[source] || 0) + (link.clickCount || 0);
    }
    
    const channelBreakdown = Object.entries(channelCounts)
      .map(([channel, visits]) => ({ channel, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);
    
    const topSource = channelBreakdown.length > 0 ? channelBreakdown[0].channel : null;
    
    return {
      uniqueVisitors,
      leads,
      conversionRate,
      topSource,
      channelBreakdown,
    };
  }

  async getMarketingClickBreakdowns(): Promise<{
    devices: Array<{ type: string; count: number }>;
    browsers: Array<{ browser: string; count: number }>;
    countries: Array<{ country: string; countryCode: string | null; count: number }>;
    returningVisitors: { new: number; returning: number };
    botVsHuman: { human: number; bot: number };
  }> {
    const clicks = await db.select().from(marketingLinkClicks);
    
    // Device type breakdown
    const deviceCounts: Record<string, number> = {};
    clicks.forEach(c => {
      const type = c.deviceType || 'unknown';
      deviceCounts[type] = (deviceCounts[type] || 0) + 1;
    });
    const devices = Object.entries(deviceCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    // Browser breakdown
    const browserCounts: Record<string, number> = {};
    clicks.forEach(c => {
      const browser = c.browser || 'Unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });
    const browsers = Object.entries(browserCounts)
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count);
    
    // Country breakdown
    const countryCounts: Record<string, { count: number; countryCode: string | null }> = {};
    clicks.forEach(c => {
      const country = c.country || 'Unknown';
      if (!countryCounts[country]) {
        countryCounts[country] = { count: 0, countryCode: c.countryCode || null };
      }
      countryCounts[country].count++;
    });
    const countries = Object.entries(countryCounts)
      .map(([country, data]) => ({ country, countryCode: data.countryCode, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Returning vs new visitors
    const returningCount = clicks.filter(c => c.isReturningVisitor).length;
    const returningVisitors = {
      new: clicks.length - returningCount,
      returning: returningCount,
    };
    
    // Bot vs human
    const botCount = clicks.filter(c => c.isBot).length;
    const botVsHuman = {
      human: clicks.length - botCount,
      bot: botCount,
    };
    
    return { devices, browsers, countries, returningVisitors, botVsHuman };
  }

  async getActivationLinkClickBreakdowns(organizationId: string, eventId?: string): Promise<{
    devices: Array<{ type: string; count: number }>;
    browsers: Array<{ browser: string; count: number }>;
    countries: Array<{ country: string; countryCode: string | null; count: number }>;
    returningVisitors: { new: number; returning: number };
    botVsHuman: { human: number; bot: number };
  }> {
    // Get activation link IDs for this organization, optionally filtered by event
    const conditions = [eq(activationLinks.organizationId, organizationId)];
    if (eventId) {
      conditions.push(eq(activationLinks.eventId, eventId));
    }
    const orgLinks = await db.select({ id: activationLinks.id })
      .from(activationLinks)
      .where(and(...conditions));
    
    const linkIds = orgLinks.map(l => l.id);
    
    if (linkIds.length === 0) {
      return {
        devices: [],
        browsers: [],
        countries: [],
        returningVisitors: { new: 0, returning: 0 },
        botVsHuman: { human: 0, bot: 0 },
      };
    }
    
    // Get clicks for those links
    const clicks = await db.select()
      .from(activationLinkClicks)
      .where(inArray(activationLinkClicks.activationLinkId, linkIds));
    
    // Device type breakdown
    const deviceCounts: Record<string, number> = {};
    clicks.forEach(c => {
      const type = c.deviceType || 'unknown';
      deviceCounts[type] = (deviceCounts[type] || 0) + 1;
    });
    const devices = Object.entries(deviceCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    // Browser breakdown
    const browserCounts: Record<string, number> = {};
    clicks.forEach(c => {
      const browser = c.browser || 'Unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });
    const browsers = Object.entries(browserCounts)
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count);
    
    // Country breakdown
    const countryCounts: Record<string, { count: number; countryCode: string | null }> = {};
    clicks.forEach(c => {
      const country = c.country || 'Unknown';
      if (!countryCounts[country]) {
        countryCounts[country] = { count: 0, countryCode: c.countryCode || null };
      }
      countryCounts[country].count++;
    });
    const countries = Object.entries(countryCounts)
      .map(([country, data]) => ({ country, countryCode: data.countryCode, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Returning vs new visitors
    const returningCount = clicks.filter(c => c.isReturningVisitor).length;
    const returningVisitors = {
      new: clicks.length - returningCount,
      returning: returningCount,
    };
    
    // Bot vs human
    const botCount = clicks.filter(c => c.isBot).length;
    const botVsHuman = {
      human: clicks.length - botCount,
      bot: botCount,
    };
    
    return { devices, browsers, countries, returningVisitors, botVsHuman };
  }

  // Get clicks that need backfilling (have userAgent but no parsed device data)
  async getClicksNeedingBackfill(organizationId: string): Promise<ActivationLinkClick[]> {
    // Get activation link IDs for this organization
    const orgLinks = await db.select({ id: activationLinks.id })
      .from(activationLinks)
      .where(eq(activationLinks.organizationId, organizationId));
    
    const linkIds = orgLinks.map(l => l.id);
    if (linkIds.length === 0) return [];
    
    // Get clicks that have userAgent but no deviceType populated
    return db.select()
      .from(activationLinkClicks)
      .where(and(
        inArray(activationLinkClicks.activationLinkId, linkIds),
        isNotNull(activationLinkClicks.userAgent),
        isNull(activationLinkClicks.deviceType)
      ));
  }

  // Update a click with backfilled data
  async updateActivationLinkClick(clickId: string, data: {
    deviceType?: string | null;
    browser?: string | null;
    os?: string | null;
    isBot?: boolean | null;
  }): Promise<void> {
    await db.update(activationLinkClicks)
      .set(data)
      .where(eq(activationLinkClicks.id, clickId));
  }

  // Attendee Saved Sessions operations (personal schedule)
  async getAttendeeSavedSessions(attendeeId: string): Promise<AttendeeSavedSession[]> {
    return db.select().from(attendeeSavedSessions)
      .where(eq(attendeeSavedSessions.attendeeId, attendeeId))
      .orderBy(desc(attendeeSavedSessions.createdAt));
  }

  async saveSession(attendeeId: string, sessionId: string): Promise<AttendeeSavedSession> {
    const [saved] = await db.insert(attendeeSavedSessions)
      .values({ attendeeId, sessionId })
      .onConflictDoNothing()
      .returning();
    if (!saved) {
      const [existing] = await db.select().from(attendeeSavedSessions)
        .where(and(
          eq(attendeeSavedSessions.attendeeId, attendeeId),
          eq(attendeeSavedSessions.sessionId, sessionId)
        ));
      return existing;
    }
    return saved;
  }

  async unsaveSession(attendeeId: string, sessionId: string): Promise<void> {
    await db.delete(attendeeSavedSessions)
      .where(and(
        eq(attendeeSavedSessions.attendeeId, attendeeId),
        eq(attendeeSavedSessions.sessionId, sessionId)
      ));
  }

  async isSessionSaved(attendeeId: string, sessionId: string): Promise<boolean> {
    const [result] = await db.select().from(attendeeSavedSessions)
      .where(and(
        eq(attendeeSavedSessions.attendeeId, attendeeId),
        eq(attendeeSavedSessions.sessionId, sessionId)
      ));
    return !!result;
  }

  async getSessionSaveCount(sessionId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(attendeeSavedSessions)
      .where(eq(attendeeSavedSessions.sessionId, sessionId));
    return Number(result?.count || 0);
  }

  // Attendee Interests operations (preferences for recommendations)
  async getAttendeeInterests(attendeeId: string): Promise<AttendeeInterests | undefined> {
    const [result] = await db.select().from(attendeeInterests)
      .where(eq(attendeeInterests.attendeeId, attendeeId));
    return result;
  }

  async upsertAttendeeInterests(attendeeId: string, interests: InsertAttendeeInterests): Promise<AttendeeInterests> {
    const [result] = await db.insert(attendeeInterests)
      .values({ ...interests, attendeeId })
      .onConflictDoUpdate({
        target: attendeeInterests.attendeeId,
        set: {
          preferredTracks: interests.preferredTracks,
          preferredTopics: interests.preferredTopics,
          preferredSessionTypes: interests.preferredSessionTypes,
          interests: interests.interests,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Session Feedback operations
  async getSessionFeedback(organizationId: string, sessionId: string): Promise<SessionFeedback[]> {
    return db.select().from(sessionFeedback)
      .where(and(
        eq(sessionFeedback.organizationId, organizationId),
        eq(sessionFeedback.sessionId, sessionId)
      ))
      .orderBy(desc(sessionFeedback.createdAt));
  }

  async getAttendeeSessionFeedback(attendeeId: string, sessionId: string): Promise<SessionFeedback | undefined> {
    const [result] = await db.select().from(sessionFeedback)
      .where(and(
        eq(sessionFeedback.attendeeId, attendeeId),
        eq(sessionFeedback.sessionId, sessionId)
      ));
    return result;
  }

  async createSessionFeedback(data: InsertSessionFeedback): Promise<SessionFeedback> {
    const [result] = await db.insert(sessionFeedback).values(data).returning();
    return result;
  }

  // Event Feedback operations
  async getEventFeedback(organizationId: string, eventId: string): Promise<EventFeedback[]> {
    return db.select().from(eventFeedback)
      .where(and(
        eq(eventFeedback.organizationId, organizationId),
        eq(eventFeedback.eventId, eventId)
      ))
      .orderBy(desc(eventFeedback.createdAt));
  }

  async getAllEventFeedback(organizationId: string, eventId?: string): Promise<EventFeedback[]> {
    if (eventId) {
      return this.getEventFeedback(organizationId, eventId);
    }
    return db.select().from(eventFeedback)
      .where(eq(eventFeedback.organizationId, organizationId))
      .orderBy(desc(eventFeedback.createdAt));
  }

  async getAttendeeEventFeedback(attendeeId: string, eventId: string): Promise<EventFeedback | undefined> {
    const [result] = await db.select().from(eventFeedback)
      .where(and(
        eq(eventFeedback.attendeeId, attendeeId),
        eq(eventFeedback.eventId, eventId)
      ));
    return result;
  }

  async createEventFeedback(data: InsertEventFeedback): Promise<EventFeedback> {
    const [result] = await db.insert(eventFeedback).values(data).returning();
    return result;
  }

  // Feedback Config operations
  async getFeedbackConfig(eventId: string): Promise<FeedbackConfig | undefined> {
    const [result] = await db.select().from(feedbackConfigs)
      .where(eq(feedbackConfigs.eventId, eventId));
    return result;
  }

  async upsertFeedbackConfig(data: InsertFeedbackConfig): Promise<FeedbackConfig> {
    const [result] = await db.insert(feedbackConfigs)
      .values(data)
      .onConflictDoUpdate({
        target: feedbackConfigs.eventId,
        set: {
          sessionFeedbackEnabled: data.sessionFeedbackEnabled,
          eventFeedbackEnabled: data.eventFeedbackEnabled,
          allowAnonymous: data.allowAnonymous,
          sessionFeedbackFields: data.sessionFeedbackFields as string[] | null | undefined,
          eventFeedbackFields: data.eventFeedbackFields as string[] | null | undefined,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Moments - Live engagement operations
  async getMoments(organizationId: string, eventId?: string): Promise<Moment[]> {
    if (eventId) {
      return db.select().from(moments)
        .where(and(
          eq(moments.organizationId, organizationId),
          eq(moments.eventId, eventId)
        ))
        .orderBy(desc(moments.createdAt));
    }
    return db.select().from(moments)
      .where(eq(moments.organizationId, organizationId))
      .orderBy(desc(moments.createdAt));
  }

  async getMoment(organizationId: string, id: string): Promise<Moment | undefined> {
    const [result] = await db.select().from(moments)
      .where(and(
        eq(moments.organizationId, organizationId),
        eq(moments.id, id)
      ));
    return result;
  }

  async getMomentsBySession(organizationId: string, sessionId: string): Promise<Moment[]> {
    return db.select().from(moments)
      .where(and(
        eq(moments.organizationId, organizationId),
        eq(moments.sessionId, sessionId)
      ))
      .orderBy(desc(moments.createdAt));
  }

  async getLiveMoments(organizationId: string, eventId: string): Promise<Moment[]> {
    return db.select().from(moments)
      .where(and(
        eq(moments.organizationId, organizationId),
        eq(moments.eventId, eventId),
        eq(moments.status, "live")
      ))
      .orderBy(desc(moments.createdAt));
  }

  async createMoment(data: InsertMoment): Promise<Moment> {
    const [result] = await db.insert(moments).values(data).returning();
    return result;
  }

  async updateMoment(organizationId: string, id: string, updates: Partial<InsertMoment>): Promise<Moment | undefined> {
    const [result] = await db.update(moments)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(moments.organizationId, organizationId),
        eq(moments.id, id)
      ))
      .returning();
    return result;
  }

  async deleteMoment(organizationId: string, id: string): Promise<void> {
    await db.delete(moments)
      .where(and(
        eq(moments.organizationId, organizationId),
        eq(moments.id, id)
      ));
  }

  // Moment Responses
  async getMomentResponses(momentId: string): Promise<MomentResponse[]> {
    return db.select().from(momentResponses)
      .where(eq(momentResponses.momentId, momentId))
      .orderBy(desc(momentResponses.createdAt));
  }

  async getAttendeeMomentResponse(momentId: string, attendeeId: string): Promise<MomentResponse | undefined> {
    const [result] = await db.select().from(momentResponses)
      .where(and(
        eq(momentResponses.momentId, momentId),
        eq(momentResponses.attendeeId, attendeeId)
      ));
    return result;
  }

  async createMomentResponse(data: InsertMomentResponse): Promise<MomentResponse> {
    const [result] = await db.insert(momentResponses).values(data).returning();
    return result;
  }

  // Engagement Signals
  async getEngagementSignals(organizationId: string, eventId: string): Promise<EngagementSignal[]> {
    return db.select().from(engagementSignals)
      .where(and(
        eq(engagementSignals.organizationId, organizationId),
        eq(engagementSignals.eventId, eventId)
      ))
      .orderBy(desc(engagementSignals.updatedAt));
  }

  async getAttendeeEngagementSignal(eventId: string, attendeeId: string): Promise<EngagementSignal | undefined> {
    const [result] = await db.select().from(engagementSignals)
      .where(and(
        eq(engagementSignals.eventId, eventId),
        eq(engagementSignals.attendeeId, attendeeId)
      ));
    return result;
  }

  async upsertEngagementSignal(data: InsertEngagementSignal): Promise<EngagementSignal> {
    const [result] = await db.insert(engagementSignals)
      .values(data)
      .onConflictDoUpdate({
        target: [engagementSignals.eventId, engagementSignals.attendeeId],
        set: {
          engaged: data.engaged,
          engagementScore: data.engagementScore,
          highIntent: data.highIntent,
          lastEngagedAt: data.lastEngagedAt,
          signalSummaryJson: data.signalSummaryJson,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Moments Analytics
  async getMomentsAnalytics(organizationId: string, eventId?: string): Promise<MomentsAnalytics> {
    // Build base condition for filtering
    const baseCondition = eventId 
      ? and(eq(moments.organizationId, organizationId), eq(moments.eventId, eventId))
      : eq(moments.organizationId, organizationId);

    // Get all moments for this org/event
    const allMoments = await db.select().from(moments).where(baseCondition);
    
    // Get total moments count
    const totalMoments = allMoments.length;
    
    // Calculate moments by status
    const statusCounts: Record<string, number> = {};
    allMoments.forEach(m => {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
    });
    const momentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
    
    // Calculate live vs ended distribution
    const liveCount = allMoments.filter(m => m.status === 'live').length;
    const endedCount = allMoments.filter(m => m.status === 'ended' || m.status === 'locked').length;
    
    // Get all moment IDs for response queries
    const momentIds = allMoments.map(m => m.id);
    
    if (momentIds.length === 0) {
      return {
        totalMoments: 0,
        momentsByStatus: [],
        totalResponses: 0,
        responsesByType: [],
        topRespondents: [],
        averageRatings: [],
        pollResults: [],
        recentQASubmissions: [],
        liveVsEndedDistribution: { live: 0, ended: 0 },
        responseRate: 0,
        totalAttendeesWithAccess: 0,
      };
    }
    
    // Get all responses for these moments
    const allResponses = await db.select().from(momentResponses)
      .where(inArray(momentResponses.momentId, momentIds));
    
    const totalResponses = allResponses.length;
    
    // Calculate responses by moment type
    const typeCounts: Record<string, number> = {};
    allResponses.forEach(r => {
      const moment = allMoments.find(m => m.id === r.momentId);
      if (moment) {
        typeCounts[moment.type] = (typeCounts[moment.type] || 0) + 1;
      }
    });
    const responsesByType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
    
    // Calculate top respondents
    const respondentCounts: Record<string, number> = {};
    allResponses.forEach(r => {
      respondentCounts[r.attendeeId] = (respondentCounts[r.attendeeId] || 0) + 1;
    });
    
    const topRespondentIds = Object.entries(respondentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ id, count }));
    
    // Fetch attendee details for top respondents
    const topRespondents: MomentsAnalytics['topRespondents'] = [];
    for (const { id, count } of topRespondentIds) {
      const [attendee] = await db.select().from(attendees).where(eq(attendees.id, id));
      if (attendee) {
        topRespondents.push({
          attendeeId: id,
          name: `${attendee.firstName || ''} ${attendee.lastName || ''}`.trim() || 'Unknown',
          email: attendee.email,
          responseCount: count,
        });
      }
    }
    
    // Calculate average ratings for rating-type moments
    const ratingMoments = allMoments.filter(m => m.type === 'rating');
    const averageRatings: MomentsAnalytics['averageRatings'] = [];
    
    for (const moment of ratingMoments) {
      const momentRespons = allResponses.filter(r => r.momentId === moment.id);
      if (momentRespons.length > 0) {
        let totalRating = 0;
        let validCount = 0;
        for (const r of momentRespons) {
          const payload = r.payloadJson as any;
          if (payload?.rating !== undefined) {
            totalRating += Number(payload.rating);
            validCount++;
          }
        }
        if (validCount > 0) {
          averageRatings.push({
            momentId: moment.id,
            title: moment.title,
            avgRating: Math.round((totalRating / validCount) * 10) / 10,
            responseCount: validCount,
          });
        }
      }
    }
    
    // Calculate poll results summary
    const pollMoments = allMoments.filter(m => m.type === 'poll_single' || m.type === 'poll_multi');
    const pollResults: MomentsAnalytics['pollResults'] = [];
    
    for (const moment of pollMoments) {
      const momentRespons = allResponses.filter(r => r.momentId === moment.id);
      const options = (moment.optionsJson as any)?.options || [];
      
      if (momentRespons.length > 0 && options.length > 0) {
        const optionCounts: Record<string, number> = {};
        options.forEach((opt: any) => {
          optionCounts[opt.label || opt] = 0;
        });
        
        for (const r of momentRespons) {
          const payload = r.payloadJson as any;
          const selected = payload?.selectedOption || payload?.selectedOptions || [];
          const selections = Array.isArray(selected) ? selected : [selected];
          selections.forEach((s: string) => {
            if (optionCounts[s] !== undefined) {
              optionCounts[s]++;
            }
          });
        }
        
        const totalForPoll = momentRespons.length;
        pollResults.push({
          momentId: moment.id,
          title: moment.title,
          options: Object.entries(optionCounts).map(([label, count]) => ({
            label,
            count,
            percentage: totalForPoll > 0 ? Math.round((count / totalForPoll) * 100) : 0,
          })),
        });
      }
    }
    
    // Get recent Q&A submissions
    const qaMoments = allMoments.filter(m => m.type === 'qa' || m.type === 'open_text');
    const qaResponses = allResponses
      .filter(r => qaMoments.some(m => m.id === r.momentId))
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10);
    
    const recentQASubmissions: MomentsAnalytics['recentQASubmissions'] = [];
    for (const r of qaResponses) {
      const moment = qaMoments.find(m => m.id === r.momentId);
      const [attendee] = await db.select().from(attendees).where(eq(attendees.id, r.attendeeId));
      if (moment && attendee) {
        const payload = r.payloadJson as any;
        recentQASubmissions.push({
          momentId: moment.id,
          title: moment.title,
          attendeeName: `${attendee.firstName || ''} ${attendee.lastName || ''}`.trim() || 'Unknown',
          response: payload?.text || payload?.answer || JSON.stringify(payload),
          createdAt: r.createdAt!,
        });
      }
    }
    
    // Calculate total attendees with access and response rate
    const eventCondition = eventId 
      ? and(eq(attendees.organizationId, organizationId), eq(attendees.eventId, eventId))
      : eq(attendees.organizationId, organizationId);
    
    const [attendeeCount] = await db.select({ count: count() }).from(attendees).where(eventCondition);
    const totalAttendeesWithAccess = attendeeCount?.count || 0;
    
    // Response rate: unique respondents / total attendees
    const uniqueRespondents = new Set(allResponses.map(r => r.attendeeId)).size;
    const responseRate = totalAttendeesWithAccess > 0 
      ? Math.round((uniqueRespondents / totalAttendeesWithAccess) * 100) 
      : 0;
    
    return {
      totalMoments,
      momentsByStatus,
      totalResponses,
      responsesByType,
      topRespondents,
      averageRatings,
      pollResults,
      recentQASubmissions,
      liveVsEndedDistribution: { live: liveCount, ended: endedCount },
      responseRate,
      totalAttendeesWithAccess,
    };
  }

  // Event Leads (Lead Capture)
  async getEventLeads(organizationId: string, eventId: string): Promise<EventLead[]> {
    return await db.select().from(eventLeads)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.eventId, eventId)
      ))
      .orderBy(desc(eventLeads.createdAt));
  }

  async getEventLead(organizationId: string, id: string): Promise<EventLead | undefined> {
    const [result] = await db.select().from(eventLeads)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.id, id)
      ));
    return result;
  }

  async createEventLead(data: InsertEventLead): Promise<EventLead> {
    const [result] = await db.insert(eventLeads).values(data).returning();
    return result;
  }

  async updateEventLead(organizationId: string, id: string, updates: Partial<InsertEventLead>): Promise<EventLead | undefined> {
    const [result] = await db.update(eventLeads)
      .set(updates)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.id, id)
      ))
      .returning();
    return result;
  }

  async deleteEventLead(organizationId: string, id: string): Promise<void> {
    await db.delete(eventLeads)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.id, id)
      ));
  }

  async getEventLeadStats(organizationId: string, eventId: string): Promise<{ total: number; today: number; byMethod: { qr_scan: number; manual: number } }> {
    const allLeads = await db.select().from(eventLeads)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.eventId, eventId)
      ));

    const total = allLeads.length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = allLeads.filter(lead => lead.createdAt && new Date(lead.createdAt) >= startOfToday).length;

    const qr_scan = allLeads.filter(lead => lead.captureMethod === 'qr_scan').length;
    const manual = allLeads.filter(lead => lead.captureMethod === 'manual').length;

    return { total, today, byMethod: { qr_scan, manual } };
  }

  // Sponsor-specific Lead Capture operations
  async getSponsorEventLeads(organizationId: string, eventId: string, sponsorId: string): Promise<EventLead[]> {
    return await db.select().from(eventLeads)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.eventId, eventId),
        eq(eventLeads.sponsorId, sponsorId)
      ))
      .orderBy(desc(eventLeads.createdAt));
  }

  async getSponsorEventLeadStats(organizationId: string, eventId: string, sponsorId: string): Promise<{ total: number; today: number; byMethod: { qr_scan: number; manual: number } }> {
    const allLeads = await db.select().from(eventLeads)
      .where(and(
        eq(eventLeads.organizationId, organizationId),
        eq(eventLeads.eventId, eventId),
        eq(eventLeads.sponsorId, sponsorId)
      ));

    const total = allLeads.length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = allLeads.filter(lead => lead.createdAt && new Date(lead.createdAt) >= startOfToday).length;

    const qr_scan = allLeads.filter(lead => lead.captureMethod === 'qr_scan').length;
    const manual = allLeads.filter(lead => lead.captureMethod === 'manual').length;

    return { total, today, byMethod: { qr_scan, manual } };
  }

  // Sponsor Contact Invitation operations
  async getSponsorContactInvitations(organizationId: string, sponsorId: string): Promise<SponsorContactInvitation[]> {
    return await db.select().from(sponsorContactInvitations)
      .where(and(
        eq(sponsorContactInvitations.organizationId, organizationId),
        eq(sponsorContactInvitations.sponsorId, sponsorId)
      ))
      .orderBy(desc(sponsorContactInvitations.invitedAt));
  }

  async getSponsorContactInvitation(organizationId: string, id: string): Promise<SponsorContactInvitation | undefined> {
    const [result] = await db.select().from(sponsorContactInvitations)
      .where(and(
        eq(sponsorContactInvitations.organizationId, organizationId),
        eq(sponsorContactInvitations.id, id)
      ));
    return result;
  }

  async getSponsorContactInvitationByCode(inviteCode: string): Promise<SponsorContactInvitation | undefined> {
    const [result] = await db.select().from(sponsorContactInvitations)
      .where(eq(sponsorContactInvitations.inviteCode, inviteCode));
    return result;
  }

  async createSponsorContactInvitation(data: InsertSponsorContactInvitation): Promise<SponsorContactInvitation> {
    const [result] = await db.insert(sponsorContactInvitations).values(data).returning();
    return result;
  }

  async updateSponsorContactInvitation(organizationId: string, id: string, updates: Partial<InsertSponsorContactInvitation>): Promise<SponsorContactInvitation | undefined> {
    const [result] = await db.update(sponsorContactInvitations)
      .set(updates)
      .where(and(
        eq(sponsorContactInvitations.organizationId, organizationId),
        eq(sponsorContactInvitations.id, id)
      ))
      .returning();
    return result;
  }

  // Session Check-Ins
  async getSessionCheckIns(organizationId: string, sessionId: string): Promise<SessionCheckIn[]> {
    return await db.select().from(sessionCheckIns)
      .where(and(
        eq(sessionCheckIns.organizationId, organizationId),
        eq(sessionCheckIns.sessionId, sessionId)
      ))
      .orderBy(desc(sessionCheckIns.checkedInAt));
  }

  async getSessionCheckIn(organizationId: string, sessionId: string, attendeeId: string): Promise<SessionCheckIn | undefined> {
    const [result] = await db.select().from(sessionCheckIns)
      .where(and(
        eq(sessionCheckIns.organizationId, organizationId),
        eq(sessionCheckIns.sessionId, sessionId),
        eq(sessionCheckIns.attendeeId, attendeeId)
      ));
    return result;
  }

  async createSessionCheckIn(data: InsertSessionCheckIn): Promise<SessionCheckIn> {
    const [result] = await db.insert(sessionCheckIns).values(data).returning();
    return result;
  }

  async getSessionCheckInStats(organizationId: string, eventId: string): Promise<{ totalCheckIns: number; uniqueAttendees: number; sessionsWithCheckIns: number }> {
    const allCheckIns = await db.select().from(sessionCheckIns)
      .where(and(
        eq(sessionCheckIns.organizationId, organizationId),
        eq(sessionCheckIns.eventId, eventId)
      ));

    const totalCheckIns = allCheckIns.length;
    const uniqueAttendees = new Set(allCheckIns.map(c => c.attendeeId)).size;
    const sessionsWithCheckIns = new Set(allCheckIns.map(c => c.sessionId)).size;

    return { totalCheckIns, uniqueAttendees, sessionsWithCheckIns };
  }

  async getSessionCheckInsByEvent(organizationId: string, eventId: string): Promise<SessionCheckIn[]> {
    return await db.select().from(sessionCheckIns)
      .where(and(
        eq(sessionCheckIns.organizationId, organizationId),
        eq(sessionCheckIns.eventId, eventId)
      ))
      .orderBy(desc(sessionCheckIns.checkedInAt));
  }

  // Product Interactions (Intent Capture)
  async getProductInteractions(organizationId: string, eventId: string): Promise<ProductInteraction[]> {
    return await db.select().from(productInteractions)
      .where(and(
        eq(productInteractions.organizationId, organizationId),
        eq(productInteractions.eventId, eventId)
      ))
      .orderBy(desc(productInteractions.createdAt));
  }

  async getProductInteraction(organizationId: string, id: string): Promise<ProductInteraction | undefined> {
    const [result] = await db.select().from(productInteractions)
      .where(and(
        eq(productInteractions.organizationId, organizationId),
        eq(productInteractions.id, id)
      ));
    return result;
  }

  async getProductInteractionsByAttendee(organizationId: string, eventId: string, attendeeId: string): Promise<ProductInteraction[]> {
    return await db.select().from(productInteractions)
      .where(and(
        eq(productInteractions.organizationId, organizationId),
        eq(productInteractions.eventId, eventId),
        eq(productInteractions.attendeeId, attendeeId)
      ))
      .orderBy(desc(productInteractions.createdAt));
  }

  async createProductInteraction(data: InsertProductInteraction): Promise<ProductInteraction> {
    const [result] = await db.insert(productInteractions).values(data).returning();
    return result;
  }

  async updateProductInteraction(organizationId: string, id: string, updates: Partial<InsertProductInteraction>): Promise<ProductInteraction | undefined> {
    const [result] = await db.update(productInteractions)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(productInteractions.organizationId, organizationId),
        eq(productInteractions.id, id)
      ))
      .returning();
    return result;
  }

  async deleteProductInteraction(organizationId: string, id: string): Promise<void> {
    await db.delete(productInteractions)
      .where(and(
        eq(productInteractions.organizationId, organizationId),
        eq(productInteractions.id, id)
      ));
  }

  async getProductInteractionStats(organizationId: string, eventId: string): Promise<{ 
    total: number; 
    today: number; 
    byMethod: { qr_scan: number; manual: number; lookup: number };
    byIntentLevel: { low: number; medium: number; high: number };
  }> {
    const allInteractions = await db.select().from(productInteractions)
      .where(and(
        eq(productInteractions.organizationId, organizationId),
        eq(productInteractions.eventId, eventId)
      ));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayInteractions = allInteractions.filter(i => 
      i.createdAt && new Date(i.createdAt) >= today
    );

    const byMethod = {
      qr_scan: allInteractions.filter(i => i.captureMethod === 'qr_scan').length,
      manual: allInteractions.filter(i => i.captureMethod === 'manual').length,
      lookup: allInteractions.filter(i => i.captureMethod === 'lookup').length,
    };

    const byIntentLevel = {
      low: allInteractions.filter(i => i.intentLevel === 'low').length,
      medium: allInteractions.filter(i => i.intentLevel === 'medium').length,
      high: allInteractions.filter(i => i.intentLevel === 'high').length,
    };

    return {
      total: allInteractions.length,
      today: todayInteractions.length,
      byMethod,
      byIntentLevel,
    };
  }

  async getAttendeeInteractionScore(organizationId: string, eventId: string, attendeeId: string): Promise<{
    score: number;
    interactionCount: number;
    highestIntentLevel: string | null;
    latestOutcome: string | null;
    maxOpportunityPotential: string | null;
    reasons: string[];
  }> {
    const interactions = await this.getProductInteractionsByAttendee(organizationId, eventId, attendeeId);
    
    if (interactions.length === 0) {
      return {
        score: 0,
        interactionCount: 0,
        highestIntentLevel: null,
        latestOutcome: null,
        maxOpportunityPotential: null,
        reasons: [],
      };
    }

    // Scoring logic from spec:
    // Intent: LOW = +1, MEDIUM = +3, HIGH = +6
    // Outcome boosts: requested_follow_up = +3, asked_for_pricing = +4, wants_trial_pilot = +6, 
    //                 intro_to_stakeholder = +4, not_a_fit = -10, too_early = -2
    // Opportunity boost: over_100k = +4, 50k_to_100k = +3, 10k_to_50k = +2, under_10k = +1

    const intentScores: Record<string, number> = { low: 1, medium: 3, high: 6 };
    const outcomeScores: Record<string, number> = {
      requested_follow_up: 3,
      asked_for_pricing: 4,
      wants_trial_pilot: 6,
      intro_to_stakeholder: 4,
      not_a_fit: -10,
      too_early: -2,
      other: 0,
    };
    const opportunityScores: Record<string, number> = {
      over_100k: 4,
      '50k_to_100k': 3,
      '10k_to_50k': 2,
      under_10k: 1,
    };

    let score = 0;
    const reasons: string[] = [];
    let highestIntentLevel = 'low';
    const intentLevelPriority: Record<string, number> = { low: 1, medium: 2, high: 3 };
    let maxOpportunityPotential: string | null = null;
    const opportunityPriority: Record<string, number> = { under_10k: 1, '10k_to_50k': 2, '50k_to_100k': 3, over_100k: 4 };

    for (const interaction of interactions) {
      // Intent score
      const intentScore = intentScores[interaction.intentLevel] || 0;
      score += intentScore;
      if (intentLevelPriority[interaction.intentLevel] > intentLevelPriority[highestIntentLevel]) {
        highestIntentLevel = interaction.intentLevel;
      }

      // Outcome score
      const outcomeScore = outcomeScores[interaction.outcome] || 0;
      score += outcomeScore;

      // Opportunity score
      if (interaction.opportunityPotential) {
        const oppScore = opportunityScores[interaction.opportunityPotential] || 0;
        score += oppScore;
        if (!maxOpportunityPotential || 
            opportunityPriority[interaction.opportunityPotential] > opportunityPriority[maxOpportunityPotential]) {
          maxOpportunityPotential = interaction.opportunityPotential;
        }
      }
    }

    // Build reasons
    if (highestIntentLevel === 'high') {
      reasons.push('Captured HIGH intent during product interaction');
    }
    
    const latestInteraction = interactions[0];
    const latestOutcome = latestInteraction?.outcome || null;

    if (interactions.some(i => i.outcome === 'asked_for_pricing')) {
      reasons.push('Outcome: Asked for pricing');
    }
    if (interactions.some(i => i.outcome === 'wants_trial_pilot')) {
      reasons.push('Outcome: Wants a trial/pilot');
    }
    if (interactions.some(i => i.outcome === 'requested_follow_up')) {
      reasons.push('Outcome: Requested follow-up');
    }
    if (maxOpportunityPotential === 'over_100k') {
      reasons.push('$100k+ opportunity potential selected');
    }
    if (interactions.length >= 2) {
      const highMediumCount = interactions.filter(i => i.intentLevel === 'high' || i.intentLevel === 'medium').length;
      if (highMediumCount >= 2) {
        reasons.push('Multiple high-signal interactions recorded');
      }
    }

    return {
      score,
      interactionCount: interactions.length,
      highestIntentLevel,
      latestOutcome,
      maxOpportunityPotential,
      reasons,
    };
  }

  // API Keys
  async getApiKeys(organizationId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(organizationId: string, id: string): Promise<ApiKey | undefined> {
    const [result] = await db.select().from(apiKeys)
      .where(and(
        eq(apiKeys.organizationId, organizationId),
        eq(apiKeys.id, id)
      ));
    return result;
  }

  async getApiKeyByPrefix(keyPrefix: string): Promise<ApiKey | undefined> {
    const [result] = await db.select().from(apiKeys)
      .where(eq(apiKeys.keyPrefix, keyPrefix));
    return result;
  }

  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values(data).returning();
    return result;
  }

  async updateApiKey(organizationId: string, id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [result] = await db.update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(apiKeys.organizationId, organizationId),
        eq(apiKeys.id, id)
      ))
      .returning();
    return result;
  }

  async rotateApiKey(organizationId: string, id: string, newHashedSecret: string): Promise<ApiKey | undefined> {
    const [result] = await db.update(apiKeys)
      .set({ 
        hashedSecret: newHashedSecret, 
        lastRotatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(apiKeys.organizationId, organizationId),
        eq(apiKeys.id, id)
      ))
      .returning();
    return result;
  }

  async revokeApiKey(organizationId: string, id: string): Promise<ApiKey | undefined> {
    const [result] = await db.update(apiKeys)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(and(
        eq(apiKeys.organizationId, organizationId),
        eq(apiKeys.id, id)
      ))
      .returning();
    return result;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  // API Key Audit Logs
  async createApiKeyAuditLog(data: InsertApiKeyAuditLog): Promise<ApiKeyAuditLog> {
    const [result] = await db.insert(apiKeyAuditLogs).values(data).returning();
    return result;
  }

  async getApiKeyAuditLogs(organizationId: string, apiKeyId?: string, limit: number = 100): Promise<ApiKeyAuditLog[]> {
    if (apiKeyId) {
      return await db.select().from(apiKeyAuditLogs)
        .where(and(
          eq(apiKeyAuditLogs.organizationId, organizationId),
          eq(apiKeyAuditLogs.apiKeyId, apiKeyId)
        ))
        .orderBy(desc(apiKeyAuditLogs.occurredAt))
        .limit(limit);
    }
    return await db.select().from(apiKeyAuditLogs)
      .where(eq(apiKeyAuditLogs.organizationId, organizationId))
      .orderBy(desc(apiKeyAuditLogs.occurredAt))
      .limit(limit);
  }

  // Super Admin Audit Logs
  async createSuperAdminAuditLog(data: InsertSuperAdminAuditLog): Promise<SuperAdminAuditLog> {
    const [result] = await db.insert(superAdminAuditLogs).values(data).returning();
    return result;
  }

  async getSuperAdminAuditLogs(limit: number = 100): Promise<SuperAdminAuditLog[]> {
    return await db.select().from(superAdminAuditLogs)
      .orderBy(desc(superAdminAuditLogs.createdAt))
      .limit(limit);
  }

  // Super Admin operations
  async getAllOrganizationsBasic(): Promise<Array<{ id: string; name: string; slug: string }>> {
    return await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    }).from(organizations)
      .where(eq(organizations.isArchived, false))
      .orderBy(organizations.name);
  }

  // Attendee Meeting operations
  async getAttendeeMeetings(organizationId: string, eventId: string, filters?: { status?: string; intentType?: string; isInternal?: boolean }): Promise<AttendeeMeeting[]> {
    const conditions = [
      eq(attendeeMeetings.organizationId, organizationId),
      eq(attendeeMeetings.eventId, eventId),
    ];
    
    if (filters?.status) {
      conditions.push(eq(attendeeMeetings.status, filters.status));
    }
    if (filters?.intentType) {
      conditions.push(eq(attendeeMeetings.intentType, filters.intentType));
    }
    if (filters?.isInternal !== undefined) {
      conditions.push(eq(attendeeMeetings.isInternalMeeting, filters.isInternal));
    }
    
    return await db.select().from(attendeeMeetings)
      .where(and(...conditions))
      .orderBy(desc(attendeeMeetings.createdAt));
  }

  async getAttendeeMeeting(organizationId: string, id: string): Promise<AttendeeMeeting | undefined> {
    const [result] = await db.select().from(attendeeMeetings)
      .where(and(
        eq(attendeeMeetings.organizationId, organizationId),
        eq(attendeeMeetings.id, id)
      ));
    return result;
  }

  async createAttendeeMeeting(data: InsertAttendeeMeeting): Promise<AttendeeMeeting> {
    const [result] = await db.insert(attendeeMeetings).values(data).returning();
    return result;
  }

  async updateAttendeeMeeting(organizationId: string, id: string, data: Partial<InsertAttendeeMeeting>): Promise<AttendeeMeeting | undefined> {
    const [result] = await db.update(attendeeMeetings)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(attendeeMeetings.organizationId, organizationId),
        eq(attendeeMeetings.id, id)
      ))
      .returning();
    return result;
  }

  async captureAttendeeOutcome(organizationId: string, meetingId: string, data: { outcomeType: string; outcomeConfidence?: string; dealRange?: string; timeline?: string; outcomeNotes?: string; outcomeCapturedBy: string }): Promise<AttendeeMeeting | undefined> {
    // Calculate intent strength based on outcome type
    let intentStrength: 'low' | 'medium' | 'high' = 'low';
    if (data.outcomeType === 'deal_in_progress' || data.outcomeType === 'active_opportunity') {
      intentStrength = 'high';
    } else if (data.outcomeType === 'early_interest' || data.outcomeType === 'follow_up_scheduled') {
      intentStrength = 'medium';
    }

    const [result] = await db.update(attendeeMeetings)
      .set({
        outcomeType: data.outcomeType,
        outcomeConfidence: data.outcomeConfidence,
        dealRange: data.dealRange,
        timeline: data.timeline,
        outcomeNotes: data.outcomeNotes,
        outcomeCapturedBy: data.outcomeCapturedBy,
        outcomeCapturedAt: new Date(),
        intentStrength,
        updatedAt: new Date(),
      })
      .where(and(
        eq(attendeeMeetings.organizationId, organizationId),
        eq(attendeeMeetings.id, meetingId)
      ))
      .returning();
    return result;
  }

  async getMeetingQualityStats(organizationId: string, eventId: string): Promise<{ 
    totalMeetings: number; 
    pendingMeetings: number;
    completedMeetings: number;
    outcomesRecorded: number; 
    highIntentMeetings: number;
    mediumIntentMeetings: number;
    lowIntentMeetings: number;
    outcomeBreakdown: { type: string; count: number }[];
    intentBreakdown: { type: string; count: number }[];
  }> {
    const meetings = await db.select().from(attendeeMeetings)
      .where(and(
        eq(attendeeMeetings.organizationId, organizationId),
        eq(attendeeMeetings.eventId, eventId)
      ));

    const totalMeetings = meetings.length;
    const pendingMeetings = meetings.filter(m => m.status === 'pending').length;
    const completedMeetings = meetings.filter(m => m.status === 'completed').length;
    const outcomesRecorded = meetings.filter(m => m.outcomeType).length;

    // Count by intent strength
    const highIntentMeetings = meetings.filter(m => m.intentStrength === 'high').length;
    const mediumIntentMeetings = meetings.filter(m => m.intentStrength === 'medium').length;
    const lowIntentMeetings = meetings.filter(m => m.intentStrength === 'low').length;

    // Count by intent type
    const byIntent: Record<string, number> = {};
    for (const meeting of meetings) {
      if (meeting.intentType) {
        byIntent[meeting.intentType] = (byIntent[meeting.intentType] || 0) + 1;
      }
    }

    // Count by outcome type
    const byOutcome: Record<string, number> = {};
    for (const meeting of meetings) {
      if (meeting.outcomeType) {
        byOutcome[meeting.outcomeType] = (byOutcome[meeting.outcomeType] || 0) + 1;
      }
    }

    // Convert to array format for frontend
    const intentBreakdown = Object.entries(byIntent).map(([type, count]) => ({ type, count }));
    const outcomeBreakdown = Object.entries(byOutcome).map(([type, count]) => ({ type, count }));

    return {
      totalMeetings,
      pendingMeetings,
      completedMeetings,
      outcomesRecorded,
      highIntentMeetings,
      mediumIntentMeetings,
      lowIntentMeetings,
      intentBreakdown,
      outcomeBreakdown,
    };
  }

  async promoteAttendeeIntent(
    organizationId: string, 
    attendeeId: string, 
    source: { type: string; id: string }, 
    outcomeType: string, 
    dealRange?: string
  ): Promise<Attendee | undefined> {
    // Get current attendee
    const attendee = await this.getAttendee(organizationId, attendeeId);
    if (!attendee) return undefined;

    // Determine new intent status based on promotion rules
    let newIntentStatus = attendee.intentStatus || 'none';
    let salesReady = attendee.salesReady || false;

    // Hot Lead promotion rules
    const isHotLead = 
      outcomeType === 'active_opportunity' ||
      outcomeType === 'deal_in_progress' ||
      dealRange === 'over_100k' ||
      outcomeType === 'follow_up_scheduled';

    // High-Intent promotion rules
    const isHighIntent = 
      outcomeType === 'early_interest' ||
      outcomeType === 'active_opportunity';

    if (isHotLead) {
      newIntentStatus = 'hot_lead';
      salesReady = true;
    } else if (isHighIntent && newIntentStatus !== 'hot_lead') {
      newIntentStatus = 'high_intent';
    } else if (outcomeType && newIntentStatus === 'none') {
      newIntentStatus = 'engaged';
    }

    // Build updated intent sources array (idempotent - don't duplicate)
    const existingSources = (attendee.intentSources || []) as { type: string; id: string; createdAt: string }[];
    const alreadyExists = existingSources.some(s => s.type === source.type && s.id === source.id);
    const newSources = alreadyExists 
      ? existingSources 
      : [...existingSources, { ...source, createdAt: new Date().toISOString() }];

    // Update attendee
    const [updated] = await db
      .update(attendees)
      .set({ 
        intentStatus: newIntentStatus, 
        salesReady, 
        intentSources: newSources,
        updatedAt: new Date() 
      })
      .where(and(eq(attendees.organizationId, organizationId), eq(attendees.id, attendeeId)))
      .returning();

    return updated;
  }

  async getHotLeads(organizationId: string, eventId?: string): Promise<Attendee[]> {
    const conditions = [
      eq(attendees.organizationId, organizationId),
      eq(attendees.salesReady, true),
    ];
    if (eventId) {
      conditions.push(eq(attendees.eventId, eventId));
    }
    return db.select().from(attendees).where(and(...conditions)).orderBy(desc(attendees.updatedAt));
  }

  async getHighIntentContacts(organizationId: string, eventId?: string): Promise<Attendee[]> {
    const conditions = [
      eq(attendees.organizationId, organizationId),
      or(
        eq(attendees.intentStatus, 'high_intent'),
        eq(attendees.intentStatus, 'hot_lead')
      ),
    ];
    if (eventId) {
      conditions.push(eq(attendees.eventId, eventId));
    }
    return db.select().from(attendees).where(and(...conditions)).orderBy(desc(attendees.updatedAt));
  }

  // Meeting Portal Member operations
  async getMeetingPortalMembersByEvent(eventId: string): Promise<MeetingPortalMember[]> {
    return db.select()
      .from(meetingPortalMembers)
      .where(eq(meetingPortalMembers.eventId, eventId))
      .orderBy(desc(meetingPortalMembers.createdAt));
  }

  async getMeetingPortalMember(id: string): Promise<MeetingPortalMember | undefined> {
    const [member] = await db.select()
      .from(meetingPortalMembers)
      .where(eq(meetingPortalMembers.id, id));
    return member;
  }

  async getMeetingPortalMemberByEmail(eventId: string, email: string): Promise<MeetingPortalMember | undefined> {
    const [member] = await db.select()
      .from(meetingPortalMembers)
      .where(and(
        eq(meetingPortalMembers.eventId, eventId),
        ilike(meetingPortalMembers.email, email)
      ));
    return member;
  }

  async getMeetingPortalMemberByToken(token: string): Promise<MeetingPortalMember | undefined> {
    const [member] = await db.select()
      .from(meetingPortalMembers)
      .where(eq(meetingPortalMembers.portalAccessToken, token));
    return member;
  }

  async getMeetingPortalMemberByMagicToken(token: string): Promise<MeetingPortalMember | undefined> {
    const [member] = await db.select()
      .from(meetingPortalMembers)
      .where(eq(meetingPortalMembers.magicLinkToken, token));
    return member;
  }

  async getMeetingPortalMembersByEmail(email: string): Promise<MeetingPortalMember[]> {
    return db.select()
      .from(meetingPortalMembers)
      .where(and(
        ilike(meetingPortalMembers.email, email),
        eq(meetingPortalMembers.isActive, true)
      ))
      .orderBy(desc(meetingPortalMembers.lastLoginAt));
  }

  async createMeetingPortalMember(data: InsertMeetingPortalMember): Promise<MeetingPortalMember> {
    const [member] = await db.insert(meetingPortalMembers)
      .values(data)
      .returning();
    return member;
  }

  async updateMeetingPortalMember(id: string, data: Partial<InsertMeetingPortalMember>): Promise<MeetingPortalMember | undefined> {
    const [updated] = await db.update(meetingPortalMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(meetingPortalMembers.id, id))
      .returning();
    return updated;
  }

  async deleteMeetingPortalMember(id: string): Promise<void> {
    await db.delete(meetingPortalMembers)
      .where(eq(meetingPortalMembers.id, id));
  }

  // Meeting Portal Invitation operations
  async getMeetingPortalInvitationsByEvent(eventId: string): Promise<MeetingPortalInvitation[]> {
    return db.select()
      .from(meetingPortalInvitations)
      .where(eq(meetingPortalInvitations.eventId, eventId))
      .orderBy(desc(meetingPortalInvitations.invitedAt));
  }

  async getMeetingPortalInvitationByCode(code: string): Promise<MeetingPortalInvitation | undefined> {
    const [invitation] = await db.select()
      .from(meetingPortalInvitations)
      .where(eq(meetingPortalInvitations.inviteCode, code));
    return invitation;
  }

  async createMeetingPortalInvitation(data: InsertMeetingPortalInvitation): Promise<MeetingPortalInvitation> {
    const [invitation] = await db.insert(meetingPortalInvitations)
      .values(data)
      .returning();
    return invitation;
  }

  async updateMeetingPortalInvitation(id: string, data: Partial<InsertMeetingPortalInvitation>): Promise<MeetingPortalInvitation | undefined> {
    const [updated] = await db.update(meetingPortalInvitations)
      .set(data)
      .where(eq(meetingPortalInvitations.id, id))
      .returning();
    return updated;
  }

  async deleteMeetingPortalInvitation(id: string): Promise<void> {
    await db.delete(meetingPortalInvitations)
      .where(eq(meetingPortalInvitations.id, id));
  }

  // Room Open Hours operations
  async getRoomOpenHours(roomId: string): Promise<RoomOpenHours[]> {
    return db.select()
      .from(roomOpenHours)
      .where(eq(roomOpenHours.roomId, roomId))
      .orderBy(roomOpenHours.openDate, roomOpenHours.startTime);
  }

  async setRoomOpenHours(roomId: string, hours: InsertRoomOpenHours[]): Promise<RoomOpenHours[]> {
    await db.delete(roomOpenHours).where(eq(roomOpenHours.roomId, roomId));
    
    if (hours.length === 0) {
      return [];
    }
    
    const hoursWithRoomId = hours.map(h => ({ ...h, roomId }));
    return db.insert(roomOpenHours).values(hoursWithRoomId).returning();
  }

  // Member Room Assignment operations
  async getMemberRoomAssignments(organizationId: string, eventId: string): Promise<any[]> {
    const assignments = await db.select()
      .from(memberRoomAssignments)
      .leftJoin(users, eq(memberRoomAssignments.adminUserId, users.id))
      .leftJoin(meetingPortalMembers, eq(memberRoomAssignments.meetingPortalMemberId, meetingPortalMembers.id))
      .where(and(
        eq(memberRoomAssignments.organizationId, organizationId),
        eq(memberRoomAssignments.eventId, eventId)
      ));
    
    return assignments.map(row => ({
      ...row.member_room_assignments,
      user: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        email: row.users.email,
      } : null,
      meetingPortalMember: row.meeting_portal_members ? {
        id: row.meeting_portal_members.id,
        firstName: row.meeting_portal_members.firstName,
        lastName: row.meeting_portal_members.lastName,
        email: row.meeting_portal_members.email,
      } : null,
    }));
  }

  async getRoomAssignmentsForMember(
    organizationId: string,
    eventId: string,
    opts: { meetingPortalMemberId?: string; adminUserId?: string }
  ): Promise<MemberRoomAssignment[]> {
    const conditions = [
      eq(memberRoomAssignments.organizationId, organizationId),
      eq(memberRoomAssignments.eventId, eventId),
    ];

    if (opts.meetingPortalMemberId) {
      conditions.push(eq(memberRoomAssignments.meetingPortalMemberId, opts.meetingPortalMemberId));
    } else if (opts.adminUserId) {
      conditions.push(eq(memberRoomAssignments.adminUserId, opts.adminUserId));
    }

    return db.select()
      .from(memberRoomAssignments)
      .where(and(...conditions));
  }

  async createMemberRoomAssignment(data: InsertMemberRoomAssignment): Promise<MemberRoomAssignment> {
    const [result] = await db.insert(memberRoomAssignments).values(data).returning();
    return result;
  }

  async deleteMemberRoomAssignment(id: string): Promise<void> {
    await db.delete(memberRoomAssignments).where(eq(memberRoomAssignments.id, id));
  }

  async updateMemberRoomAssignment(id: string, data: Partial<InsertMemberRoomAssignment>): Promise<MemberRoomAssignment | undefined> {
    const [result] = await db.update(memberRoomAssignments)
      .set(data)
      .where(eq(memberRoomAssignments.id, id))
      .returning();
    return result;
  }

  // Room Conflict Detection & Availability operations
  async findRoomConflicts(roomId: string, startTime: Date, endTime: Date, excludeMeetingId?: string): Promise<AttendeeMeeting[]> {
    const conditions = [
      eq(attendeeMeetings.roomId, roomId),
      isNotNull(attendeeMeetings.startTime),
      isNotNull(attendeeMeetings.endTime),
      lt(attendeeMeetings.startTime, endTime),
      gt(attendeeMeetings.endTime, startTime),
    ];

    if (excludeMeetingId) {
      conditions.push(ne(attendeeMeetings.id, excludeMeetingId));
    }

    return db.select()
      .from(attendeeMeetings)
      .where(and(...conditions));
  }

  async findAvailableRooms(
    organizationId: string, 
    eventId: string, 
    startTime: Date, 
    endTime: Date,
    opts?: { adminUserId?: string; meetingPortalMemberId?: string }
  ): Promise<SessionRoom[]> {
    const allRooms = await db.select()
      .from(sessionRooms)
      .where(and(
        eq(sessionRooms.organizationId, organizationId),
        eq(sessionRooms.eventId, eventId)
      ));

    const dayOfWeek = startTime.getDay();
    const startTimeStr = startTime.toTimeString().slice(0, 5);
    const endTimeStr = endTime.toTimeString().slice(0, 5);

    // Issue 3 fix: Get all primary room assignments to filter rooms
    const allAssignments = await this.getMemberRoomAssignments(organizationId, eventId);
    const primaryAssignments = allAssignments.filter(a => a.isPrimary);

    const availableRooms: SessionRoom[] = [];

    for (const room of allRooms) {
      // Issue 3 fix: Check if room is assigned to someone else as primary
      const roomPrimaryAssignment = primaryAssignments.find(a => a.roomId === room.id);
      if (roomPrimaryAssignment) {
        // Room is assigned as primary to someone - check if it's the requesting user
        const isAssignedToRequester = 
          (opts?.adminUserId && roomPrimaryAssignment.adminUserId === opts.adminUserId) ||
          (opts?.meetingPortalMemberId && roomPrimaryAssignment.meetingPortalMemberId === opts.meetingPortalMemberId);
        
        // If assigned to someone else, skip this room
        if (!isAssignedToRequester) continue;
      }
      
      const openHours = await this.getRoomOpenHours(room.id);
      
      const dayHours = openHours.filter(h => h.dayOfWeek === dayOfWeek);
      if (dayHours.length === 0) continue;
      
      const isWithinOpenHours = dayHours.some(h => 
        h.startTime <= startTimeStr && h.endTime >= endTimeStr
      );
      if (!isWithinOpenHours) continue;

      const conflicts = await this.findRoomConflicts(room.id, startTime, endTime);
      if (conflicts.length > 0) continue;

      availableRooms.push(room);
    }

    return availableRooms;
  }

  // Intent Recompute operations
  async getAttendeeMeetingsByInvitee(organizationId: string, eventId: string, attendeeId: string): Promise<AttendeeMeeting[]> {
    return await db.select().from(attendeeMeetings)
      .where(and(
        eq(attendeeMeetings.organizationId, organizationId),
        eq(attendeeMeetings.eventId, eventId),
        eq(attendeeMeetings.inviteeId, attendeeId)
      ))
      .orderBy(desc(attendeeMeetings.createdAt));
  }

  async recomputeAttendeeIntent(organizationId: string, eventId: string, attendeeId: string): Promise<Attendee | undefined> {
    const attendee = await this.getAttendee(organizationId, attendeeId);
    if (!attendee) return undefined;

    const interactions = await this.getProductInteractionsByAttendee(organizationId, eventId, attendeeId);
    const meetings = await this.getAttendeeMeetingsByInvitee(organizationId, eventId, attendeeId);

    const meetingsForScoring = meetings.map(m => ({
      id: m.id,
      inviteeId: m.inviteeId,
      outcomeType: m.outcomeType,
      outcomeConfidence: m.outcomeConfidence,
      dealRange: m.dealRange,
      timeline: m.timeline,
      intentStrength: m.intentStrength,
      status: m.status,
      createdAt: m.createdAt,
      outcomeNotes: m.outcomeNotes,
    }));

    const intentExplanation = buildIntentExplanation(interactions, meetingsForScoring);
    const primaryTriggers = getPrimaryTriggers(interactions, meetingsForScoring);
    const { score: momentumScore } = computeMomentumScore(interactions, meetingsForScoring);

    const { qualifies: qualifiesHigh } = qualifiesForHighIntent(primaryTriggers, momentumScore);
    const qualifiesHot = qualifiesForHotLead(primaryTriggers, momentumScore, interactions, meetingsForScoring);

    let newIntentStatus: 'none' | 'engaged' | 'high_intent' | 'hot_lead';
    if (qualifiesHot) {
      newIntentStatus = 'hot_lead';
    } else if (qualifiesHigh) {
      newIntentStatus = 'high_intent';
    } else if (interactions.length > 0 || meetings.length > 0) {
      newIntentStatus = 'engaged';
    } else {
      newIntentStatus = 'none';
    }

    if (attendee.intentStatus === 'hot_lead') {
      newIntentStatus = 'hot_lead';
    }

    const existingSourcesRaw = attendee.intentSources || [];
    const existingSources: { type: string; id: string; createdAt: string }[] = Array.isArray(existingSourcesRaw) ? existingSourcesRaw : [];
    const existingSourceKeys = new Set(existingSources.map(s => `${s.type}:${s.id}`));

    const newSources: { type: string; id: string; createdAt: string }[] = [];

    for (const interaction of interactions) {
      const key = `product_interaction:${interaction.id}`;
      if (!existingSourceKeys.has(key)) {
        newSources.push({
          type: 'product_interaction',
          id: interaction.id,
          createdAt: interaction.createdAt?.toISOString() || new Date().toISOString(),
        });
        existingSourceKeys.add(key);
      }
    }

    for (const meeting of meetings) {
      const key = `meeting:${meeting.id}`;
      if (!existingSourceKeys.has(key)) {
        newSources.push({
          type: 'meeting',
          id: meeting.id,
          createdAt: meeting.createdAt?.toISOString() || new Date().toISOString(),
        });
        existingSourceKeys.add(key);
      }
    }

    const allSources = [...existingSources, ...newSources];

    const salesReady = newIntentStatus === 'hot_lead' ? true : attendee.salesReady;

    const [updated] = await db.update(attendees)
      .set({
        intentStatus: newIntentStatus,
        salesReady,
        intentSources: allSources,
        intentExplanation,
        updatedAt: new Date(),
      })
      .where(and(
        eq(attendees.organizationId, organizationId),
        eq(attendees.id, attendeeId)
      ))
      .returning();

    return updated;
  }

  // Intent Recompute History operations
  async getIntentRecomputeHistory(organizationId: string, eventId: string): Promise<IntentRecomputeHistory[]> {
    return await db.select().from(intentRecomputeHistory)
      .where(and(
        eq(intentRecomputeHistory.organizationId, organizationId),
        eq(intentRecomputeHistory.eventId, eventId)
      ))
      .orderBy(desc(intentRecomputeHistory.recomputedAt));
  }

  async createIntentRecomputeHistory(entry: InsertIntentRecomputeHistory): Promise<IntentRecomputeHistory> {
    const [created] = await db.insert(intentRecomputeHistory)
      .values(entry)
      .returning();
    return created;
  }

  // Demo Station operations
  async getDemoStationsByEvent(eventId: string): Promise<DemoStation[]> {
    return db.select()
      .from(demoStations)
      .where(eq(demoStations.eventId, eventId))
      .orderBy(demoStations.stationName);
  }

  async getDemoStation(id: string): Promise<DemoStation | undefined> {
    const [station] = await db.select()
      .from(demoStations)
      .where(eq(demoStations.id, id));
    return station;
  }

  async createDemoStation(station: InsertDemoStation): Promise<DemoStation> {
    const [newStation] = await db.insert(demoStations)
      .values(station)
      .returning();
    return newStation;
  }

  async updateDemoStation(id: string, updates: Partial<InsertDemoStation>): Promise<DemoStation> {
    const [updated] = await db.update(demoStations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(demoStations.id, id))
      .returning();
    if (!updated) throw new Error("Demo station not found");
    return updated;
  }

  async deleteDemoStation(id: string): Promise<void> {
    await db.delete(demoStations).where(eq(demoStations.id, id));
  }

  // Help Article operations
  async getHelpArticles(organizationId: string): Promise<HelpArticle[]> {
    return await db.select().from(helpArticles)
      .where(eq(helpArticles.organizationId, organizationId))
      .orderBy(helpArticles.displayOrder, helpArticles.createdAt);
  }

  async getHelpArticle(id: string, organizationId: string): Promise<HelpArticle | undefined> {
    const [article] = await db.select().from(helpArticles)
      .where(and(
        eq(helpArticles.id, id),
        eq(helpArticles.organizationId, organizationId)
      ));
    return article;
  }

  async createHelpArticle(data: InsertHelpArticle): Promise<HelpArticle> {
    const [article] = await db.insert(helpArticles)
      .values(data)
      .returning();
    return article;
  }

  async updateHelpArticle(id: string, organizationId: string, data: Partial<InsertHelpArticle>): Promise<HelpArticle | undefined> {
    const [updated] = await db.update(helpArticles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(helpArticles.id, id),
        eq(helpArticles.organizationId, organizationId)
      ))
      .returning();
    return updated;
  }

  async deleteHelpArticle(id: string, organizationId: string): Promise<boolean> {
    const result = await db.delete(helpArticles)
      .where(and(
        eq(helpArticles.id, id),
        eq(helpArticles.organizationId, organizationId)
      ));
    return true;
  }
}

export const storage = new DatabaseStorage();

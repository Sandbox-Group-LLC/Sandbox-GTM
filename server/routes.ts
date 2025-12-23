import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { sendNewOrganizationAlert, sendCampaignEmails, sendTestEmail, validateTrackingToken, verifyResendWebhookSignature, isValidRedirectUrl, sendReviewerNotificationEmail, sendSubmissionAcceptanceEmail, sendTeamInvitationEmail, sendNewLeadNotification, sendSponsorTaskRejectionEmail } from "./email";
import { createPaymentIntent, getPaymentIntent, calculateFinalPrice } from "./stripe";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { logDebug, logInfo, logWarn, logError } from "./logger";
import {
  createPaymentIntentLimiter,
  verifyPaymentLimiter,
  publicRegistrationLimiter,
  validateInviteCodeLimiter,
} from "./rateLimit";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { resolveTxt } from "dns/promises";
import { parseUserAgent, isBot, getTimeContext, getGeoFromIP, extractRealIP } from "./tracking-utils";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, storedHash] = hash.split(":");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");
  return timingSafeEqual(derivedKey, storedBuffer);
}

function isSuperAdmin(email: string | null | undefined, isAdmin?: boolean): boolean {
  // Check if user has isAdmin flag set OR has @makemysandbox.com email
  if (isAdmin === true) return true;
  return email?.toLowerCase().endsWith("@makemysandbox.com") ?? false;
}
import {
  type Event,
  insertEventSchema,
  insertAttendeeSchema,
  insertAttendeeTypeSchema,
  insertPackageSchema,
  insertInviteCodeSchema,
  insertActivationLinkSchema,
  insertActivationLinkClickSchema,
  insertSpeakerSchema,
  insertSessionSchema,
  insertSessionTrackSchema,
  insertSessionRoomSchema,
  insertContentItemSchema,
  insertBudgetItemSchema,
  insertBudgetCategorySchema,
  insertBudgetOffsetSchema,
  insertBudgetPaymentSchema,
  insertVendorSchema,
  insertMilestoneSchema,
  insertDeliverableSchema,
  insertEmailCampaignSchema,
  insertSocialPostSchema,
  insertEmailTemplateSchema,
  insertEventPageSchema,
  insertCustomFieldSchema,
  insertContentAssetSchema,
  insertEventSponsorSchema,
  insertSponsorContactSchema,
  insertSponsorTaskSchema,
  insertSponsorTaskCompletionSchema,
  insertCfpConfigSchema,
  insertCfpTopicSchema,
  insertCfpSubmissionSchema,
  insertCfpReviewerSchema,
  insertCfpReviewSchema,
  insertSignupInviteCodeSchema,
  insertDocumentSchema,
  insertDocumentFolderSchema,
  insertDocumentShareSchema,
  insertDocumentActivitySchema,
  insertDocumentCommentSchema,
  insertDocumentApprovalSchema,
  insertSessionFeedbackSchema,
  insertEventFeedbackSchema,
  insertFeedbackConfigSchema,
  insertAttendeeInterestsSchema,
  pageVersions,
  eventPages,
  emailPlatformConnections,
  emailPlatformAudiences,
  emailSyncJobs,
  FEATURE_PERMISSIONS,
} from "@shared/schema";
import { createMailchimpProvider } from "./integrations/mailchimp";
import { decrypt, encrypt } from "./encryption";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { sanitizeCustomCss } from "@shared/css-sanitizer";
import { generateSectionContent } from "./ai";
import { z } from "zod";
import { generateCalendarLinksHtml } from "@shared/calendarLinks";

// Register public tracking route early (before auth middleware)
// This ensures it works even if async initialization fails
export function registerPublicTrackingRoute(app: Express) {
  // Get invite code from activation link ID (for auto-applying in registration form)
  app.get("/api/public/activation-link/:id/invite-code", async (req: any, res) => {
    try {
      const { id } = req.params;
      const link = await storage.getActivationLinkById(id);
      
      if (!link || !link.inviteCodeId) {
        return res.json({ inviteCode: null });
      }
      
      const inviteCode = await storage.getInviteCode(link.organizationId, link.inviteCodeId);
      if (!inviteCode || !inviteCode.isActive) {
        return res.json({ inviteCode: null });
      }
      
      return res.json({ inviteCode: inviteCode.code });
    } catch (error) {
      logError("Error fetching invite code for activation link:", error);
      return res.json({ inviteCode: null });
    }
  });

  app.get("/api/public/track/:shortCode", async (req: any, res) => {
    try {
      const { shortCode } = req.params;
      logInfo(`[EARLY] Tracking link lookup for shortCode: ${shortCode}`, "activation-link");
      const link = await storage.getActivationLinkByShortCode(shortCode);
      
      if (!link) {
        logInfo(`[EARLY] Link not found for shortCode: ${shortCode}`, "activation-link");
        return res.status(404).json({ message: "Link not found", shortCode });
      }
      
      if (link.status !== "active") {
        logInfo(`[EARLY] Link found but status is: ${link.status} for shortCode: ${shortCode}`, "activation-link");
        return res.status(404).json({ message: "Link is not active", status: link.status });
      }

      // Create visitor hash from IP + User-Agent
      const ip = req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      const visitorHash = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex").substring(0, 32);
      const ipHash = createHash("sha256").update(String(ip)).digest("hex").substring(0, 32);

      // Record the click
      await storage.createActivationLinkClick({
        activationLinkId: link.id,
        visitorHash,
        ipHash,
        userAgent: userAgent.substring(0, 500),
        referrer: (req.headers.referer || req.headers.referrer || "").substring(0, 1000),
        queryParams: req.query as Record<string, string>,
      });

      // Increment click count
      await storage.incrementActivationLinkClicks(link.id);

      // Build destination URL with UTM params
      const event = await storage.getEvent(link.organizationId, link.eventId);
      let baseUrl = link.baseUrl;
      
      if (!baseUrl && event) {
        // Default to public registration page
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host;
        baseUrl = `${protocol}://${host}/event/${event.publicSlug}/register`;
      }

      if (!baseUrl) {
        return res.status(404).json({ message: "No destination configured" });
      }

      // Append UTM parameters
      const url = new URL(baseUrl);
      url.searchParams.set("utm_source", link.utmSource);
      url.searchParams.set("utm_medium", link.utmMedium);
      url.searchParams.set("utm_campaign", link.utmCampaign);
      if (link.utmContent) url.searchParams.set("utm_content", link.utmContent);
      if (link.utmTerm) url.searchParams.set("utm_term", link.utmTerm);
      
      // Add activation link ID for attribution tracking
      url.searchParams.set("al_id", link.id);
      
      // Add custom params
      if (link.customParams) {
        for (const [key, value] of Object.entries(link.customParams)) {
          url.searchParams.set(key, value);
        }
      }

      res.redirect(302, url.toString());
    } catch (error) {
      logError("Error tracking activation link:", error);
      res.status(500).json({ message: "Failed to process link" });
    }
  });

  // Record page view for real-time activity tracking
  app.post("/api/public/page-view", async (req: any, res) => {
    try {
      const { eventId, pageType, organizationId } = req.body;
      
      if (!eventId || !pageType || !organizationId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Create visitor hash from IP + User-Agent
      const ip = req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      const visitorHash = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex").substring(0, 32);
      
      await storage.createPageView({
        organizationId,
        eventId,
        pageType,
        visitorHash,
      });
      
      res.json({ success: true });
    } catch (error) {
      logError("Error recording page view:", error);
      res.status(500).json({ message: "Failed to record page view" });
    }
  });

  // Submit marketing lead (pricing page contact form)
  app.post("/api/public/lead", async (req: any, res) => {
    try {
      const { firstName, lastName, email, company, jobTitle, phone, message, source } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      const lead = await storage.createMarketingLead({
        firstName,
        lastName,
        email,
        company: company || null,
        jobTitle: jobTitle || null,
        phone: phone || null,
        message: message || null,
        source: source || "pricing-page",
      });
      
      // Send notification email (don't await - fire and forget)
      sendNewLeadNotification(lead).catch(err => {
        logError("Failed to send lead notification:", err);
      });
      
      res.json({ success: true, id: lead.id });
    } catch (error) {
      logError("Error submitting lead:", error);
      res.status(500).json({ message: "Failed to submit lead" });
    }
  });

  // Public marketing link tracking (no auth required)
  app.get("/api/public/mkt/:shortCode", async (req: any, res) => {
    try {
      const { shortCode } = req.params;
      logInfo(`[MKT] Marketing link lookup for shortCode: ${shortCode}`, "marketing-link");
      const link = await storage.getMarketingActivationLinkByShortCode(shortCode);
      
      if (!link) {
        logInfo(`[MKT] Link not found for shortCode: ${shortCode}`, "marketing-link");
        return res.status(404).json({ message: "Link not found", shortCode });
      }
      
      if (link.status !== "active") {
        logInfo(`[MKT] Link found but status is: ${link.status} for shortCode: ${shortCode}`, "marketing-link");
        return res.status(404).json({ message: "Link is not active", status: link.status });
      }

      // Extract visitor information with defensive checks
      const rawIP = extractRealIP(req);
      const ip = rawIP && rawIP.trim() !== '' ? rawIP.trim() : 'unknown';
      const userAgent = req.headers["user-agent"] || "";
      const visitorHash = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex").substring(0, 32);
      const ipHash = ip !== 'unknown' 
        ? createHash("sha256").update(ip).digest("hex").substring(0, 32)
        : null;

      // Parse User-Agent for device/browser/OS info
      const uaInfo = parseUserAgent(userAgent);
      
      // Detect if this is a bot
      const isBotVisitor = isBot(userAgent);
      
      // Get time context
      const now = new Date();
      const timeContext = getTimeContext(now);
      
      // Check if returning visitor (don't await - do in parallel with geo)
      const visitorHistoryPromise = storage.getVisitorClickHistory(visitorHash);
      
      // Get geographic data from IP (non-blocking, can fail gracefully)
      const geoPromise = getGeoFromIP(ip).catch(() => null);
      
      // Wait for both in parallel
      const [visitorHistory, geoData] = await Promise.all([visitorHistoryPromise, geoPromise]);

      // Record the click with all enriched data
      await storage.createMarketingLinkClick({
        marketingLinkId: link.id,
        visitorHash,
        ipHash,
        userAgent: userAgent.substring(0, 500),
        referrer: (req.headers.referer || req.headers.referrer || "").substring(0, 1000),
        queryParams: req.query as Record<string, string>,
        // Device & Browser info
        deviceType: uaInfo.deviceType,
        browser: uaInfo.browser,
        os: uaInfo.os,
        // Geographic data
        country: geoData?.country || null,
        countryCode: geoData?.countryCode || null,
        region: geoData?.region || null,
        city: geoData?.city || null,
        timezone: geoData?.timezone || null,
        // Visitor behavior
        isReturningVisitor: visitorHistory.isReturning,
        previousVisitCount: visitorHistory.previousCount,
        // Time context
        dayOfWeek: timeContext.dayOfWeek,
        hourOfDay: timeContext.hourOfDay,
        // Bot detection
        isBot: isBotVisitor,
      });

      // Increment click count
      await storage.incrementMarketingLinkClicks(link.id);

      // Build destination URL with UTM params
      const url = new URL(link.destinationUrl);
      url.searchParams.set("utm_source", link.utmSource);
      url.searchParams.set("utm_medium", link.utmMedium);
      url.searchParams.set("utm_campaign", link.utmCampaign);
      if (link.utmContent) url.searchParams.set("utm_content", link.utmContent);
      if (link.utmTerm) url.searchParams.set("utm_term", link.utmTerm);
      
      // Add marketing link ID for attribution tracking
      url.searchParams.set("mkt_id", link.id);

      res.redirect(302, url.toString());
    } catch (error) {
      logError("Error tracking marketing link:", error);
      res.status(500).json({ message: "Failed to process link" });
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Host-based tenant resolution middleware for custom domains
  // Resolves organization from custom domain for public-facing pages
  app.use(async (req: any, res, next) => {
    try {
      const host = req.headers.host;
      if (!host) {
        return next();
      }
      
      // Extract hostname without port
      const hostname = host.split(':')[0];
      
      // Skip resolution for main app domains (Replit domains, localhost, etc.)
      const mainAppPatterns = [
        /\.replit\.dev$/i,
        /\.replit\.app$/i,
        /\.repl\.co$/i,
        /^localhost$/i,
        /^127\.0\.0\.1$/i,
        /^0\.0\.0\.0$/i,
      ];
      
      const isMainAppDomain = mainAppPatterns.some(pattern => pattern.test(hostname));
      if (isMainAppDomain) {
        return next();
      }
      
      // Try to find an organization with this verified custom domain
      const org = await storage.getOrganizationByCustomDomain(hostname);
      if (org && org.customDomainVerified) {
        req.resolvedOrganization = {
          id: org.id,
          name: org.name,
          slug: org.slug,
          customDomain: org.customDomain,
        };
        logInfo(`Resolved organization ${org.id} from custom domain ${hostname}`, 'custom-domain');
      }
      
      next();
    } catch (error) {
      logError("Error in host-based tenant resolution:", error);
      next();
    }
  });

  // Middleware to require signup invite code redemption
  // Super admins bypass this check
  // Team members who accepted invitations also bypass this check
  const requireInviteRedemption = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      
      // Super admins bypass invite code requirement
      if (isSuperAdmin(user?.email, user?.isAdmin)) {
        return next();
      }
      
      // Check if user has redeemed an invite code
      const redemption = await storage.getSignupRedemptionForUser(userId);
      if (redemption) {
        return next();
      }
      
      // Also allow users who are members of an organization (accepted team invitation)
      const memberships = await storage.getUserOrganizations(userId);
      if (memberships && memberships.length > 0) {
        return next();
      }
      
      return res.status(403).json({ 
        message: "Invite code required. Please redeem a valid invite code to access this feature.",
        code: "INVITE_REQUIRED"
      });
    } catch (error) {
      logError("Error checking invite redemption:", error);
      return res.status(500).json({ message: "Failed to verify access" });
    }
  };

  // Helper function to get user's organization (creates default if none exists)
  // Prioritizes: 1) Session preferred org, 2) Invited orgs (non-owner), 3) Non-default orgs, 4) First available
  async function getOrganizationId(userId: string, session?: any): Promise<string> {
    const memberships = await storage.getUserOrganizations(userId);
    
    // If session has a preferred organization, use it if user is still a member
    if (session?.preferredOrganizationId) {
      const preferredMembership = memberships.find(m => m.organizationId === session.preferredOrganizationId);
      if (preferredMembership) {
        logInfo(`Using preferred organization from session: ${session.preferredOrganizationId}`, 'OrgRouting');
        return preferredMembership.organizationId;
      }
    }
    
    if (memberships.length > 0) {
      // Filter out archived organizations first
      const activeMemberships = [];
      for (const membership of memberships) {
        const org = await storage.getOrganization(membership.organizationId);
        if (org && !org.isArchived) {
          activeMemberships.push({ membership, org });
        }
      }
      
      if (activeMemberships.length > 0) {
        // If user has multiple active organizations, prefer ones where they were invited (member/admin)
        // over ones they created themselves (owner)
        if (activeMemberships.length > 1) {
          // First, try to find an org where user is NOT the owner (likely invited)
          for (const { membership, org } of activeMemberships) {
            if (membership.role !== 'owner') {
              logInfo(`Routing to invited org (non-owner): ${membership.organizationId}`, 'OrgRouting');
              return membership.organizationId;
            }
          }
          // If all are owner, prefer ones that aren't "My Organization"
          for (const { membership, org } of activeMemberships) {
            if (org.name !== 'My Organization') {
              logInfo(`Routing to named org: ${membership.organizationId} (${org.name})`, 'OrgRouting');
              return membership.organizationId;
            }
          }
        }
        return activeMemberships[0].membership.organizationId;
      }
    }
    // Before creating a default org, check if user has pending invitations
    // If they do, don't auto-create - they should accept their invitation first
    const user = await storage.getUser(userId);
    if (user?.email) {
      const pendingInvitations = await storage.getTeamInvitationsForEmail(user.email);
      if (pendingInvitations && pendingInvitations.length > 0) {
        logInfo(`User ${userId} has ${pendingInvitations.length} pending invitation(s) - skipping auto org creation`, 'OrgRouting');
        // Return the organization from the first pending invitation
        // This allows them to see the invitation page properly
        return pendingInvitations[0].organizationId;
      }
    }
    
    // Create default org for user if none exists AND no pending invitations
    logInfo(`Creating default 'My Organization' for user ${userId} (email: ${user?.email || 'unknown'}) - no existing memberships and no pending invitations found`, 'OrgRouting');
    const org = await storage.createOrganization({
      name: 'My Organization',
      slug: `org-${userId.slice(0, 8)}-${Date.now()}`
    });
    await storage.addOrganizationMember({
      organizationId: org.id,
      userId: userId,
      role: 'owner'
    });
    
    // Send email alert for new organization
    sendNewOrganizationAlert(org.name, org.slug, user?.email || undefined);
    
    return org.id;
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      logError("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // PATCH /api/auth/user - Update user profile (first/last name)
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;
      
      // Validate that at least one field is being updated
      if (firstName === undefined && lastName === undefined) {
        return res.status(400).json({ message: "At least one of firstName or lastName must be provided" });
      }
      
      const updates: { firstName?: string; lastName?: string } = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      
      const updatedUser = await storage.updateUserProfile(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      logError("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Helper to sanitize organization before returning to client (masks secret key)
  function sanitizeOrganization(org: any) {
    if (!org) return org;
    return {
      ...org,
      stripeSecretKey: org.stripeSecretKey ? "sk_****" : null,
    };
  }

  // Helper to refresh Twitter access token if expired
  async function refreshTwitterAccessToken(
    connection: any, 
    organizationId: string
  ): Promise<{ accessToken: string; refreshed: boolean } | null> {
    if (!connection.accessToken) return null;
    
    // Check if token is expired or about to expire (within 5 minutes)
    const expiryThreshold = new Date(Date.now() + 5 * 60 * 1000);
    if (!connection.tokenExpiresAt || new Date(connection.tokenExpiresAt) > expiryThreshold) {
      // Token is still valid
      try {
        return { accessToken: decrypt(connection.accessToken), refreshed: false };
      } catch (error) {
        logError("Error decrypting Twitter access token:", error);
        return null;
      }
    }
    
    // Token is expired, try to refresh
    if (!connection.refreshToken) {
      logWarn("Twitter token expired and no refresh token available");
      return null;
    }
    
    const credentials = await storage.getSocialMediaCredentials(organizationId);
    const twitterCred = credentials.find(c => c.provider === 'twitter');
    
    if (!twitterCred || !twitterCred.clientId || !twitterCred.clientSecret) {
      logError("Twitter credentials not found for token refresh");
      return null;
    }
    
    let clientId: string, clientSecret: string, refreshToken: string;
    try {
      clientId = decrypt(twitterCred.clientId);
      clientSecret = decrypt(twitterCred.clientSecret);
      refreshToken = decrypt(connection.refreshToken);
    } catch (error) {
      logError("Error decrypting credentials for token refresh:", error);
      return null;
    }
    
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const refreshResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    
    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text();
      logError("Twitter token refresh failed:", errorData);
      return null;
    }
    
    const tokenData = await refreshResponse.json() as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };
    
    // Update the connection with new tokens
    const newTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    await storage.updateSocialConnection(connection.id, {
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : connection.refreshToken,
      tokenExpiresAt: newTokenExpiresAt,
    });
    
    logInfo(`Twitter token refreshed for connection ${connection.id}`);
    return { accessToken: tokenData.access_token, refreshed: true };
  }

  app.get('/api/auth/organization', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Use session-aware helper to respect preferred organization from invitation acceptance
      const organizationId = await getOrganizationId(userId, req.session);
      const org = await storage.getOrganization(organizationId);
      logInfo(`GET /api/auth/organization: returning org ${organizationId} for user ${userId}`, 'OrgRouting');
      res.json(sanitizeOrganization(org));
    } catch (error) {
      logError("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // GET /api/auth/organizations - List all organizations user belongs to
  app.get('/api/auth/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await storage.getUserOrganizations(userId);
      
      // Get organization details for each membership
      const organizations = [];
      for (const membership of memberships) {
        const org = await storage.getOrganization(membership.organizationId);
        if (org && !org.isArchived) {
          organizations.push({
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: membership.role,
          });
        }
      }
      
      res.json(organizations);
    } catch (error) {
      logError("Error fetching user organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // POST /api/auth/organization/switch - Switch to a different organization
  app.post('/api/auth/organization/switch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      // Verify user is a member of the organization
      const memberships = await storage.getUserOrganizations(userId);
      const membership = memberships.find(m => m.organizationId === organizationId);
      
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this organization" });
      }
      
      // Check org is not archived
      const org = await storage.getOrganization(organizationId);
      if (!org || org.isArchived) {
        return res.status(404).json({ message: "Organization not found or archived" });
      }
      
      // Store preferred organization in session
      req.session.preferredOrganizationId = organizationId;
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      logInfo(`User ${userId} switched to organization ${organizationId}`, 'OrgRouting');
      res.json({ success: true, organization: sanitizeOrganization(org) });
    } catch (error) {
      logError("Error switching organization:", error);
      res.status(500).json({ message: "Failed to switch organization" });
    }
  });

  // GET /api/auth/membership - Get current user's membership including role and permissions
  app.get('/api/auth/membership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const member = await storage.getOrganizationMember(organizationId, userId);
      
      // Cast FEATURE_PERMISSIONS to string array for response
      const allPermissions: string[] = [...FEATURE_PERMISSIONS];
      
      if (!member) {
        // User doesn't have an explicit membership, they might be the org creator
        // Check if they are the org owner
        const org = await storage.getOrganization(organizationId);
        if (org?.ownerId === userId) {
          return res.json({
            role: 'owner',
            permissions: allPermissions,
            organizationId,
          });
        }
        // Otherwise return empty permissions as a safety fallback
        return res.json({
          role: 'member',
          permissions: [],
          organizationId,
        });
      }
      
      // For owners, always return all permissions
      if (member.role === 'owner') {
        return res.json({
          role: 'owner',
          permissions: allPermissions,
          organizationId,
        });
      }
      
      // For members, return their specific permissions (default to empty array if null)
      res.json({
        role: member.role || 'member',
        permissions: Array.isArray(member.permissions) ? member.permissions : [],
        organizationId,
      });
    } catch (error) {
      logError("Error fetching membership:", error);
      res.status(500).json({ message: "Failed to fetch membership" });
    }
  });

  app.patch('/api/auth/organization', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const { 
        name, 
        stripePublishableKey, 
        stripeSecretKey, 
        paymentEnabled,
        organizationType,
        expectedEventsPerYear,
        typicalEventSize,
        phone,
        website,
        country,
        timezone,
        currency,
        onboardingCompleted,
        onboardingStep
      } = req.body;
      
      const updateData: Record<string, any> = {};
      
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ message: "Organization name cannot be empty" });
        }
        updateData.name = name.trim();
      }
      
      if (stripePublishableKey !== undefined) {
        updateData.stripePublishableKey = stripePublishableKey || null;
      }
      
      if (stripeSecretKey !== undefined) {
        updateData.stripeSecretKey = stripeSecretKey || null;
      }
      
      if (paymentEnabled !== undefined) {
        updateData.paymentEnabled = Boolean(paymentEnabled);
      }
      
      // Organization profile fields
      if (organizationType !== undefined) {
        updateData.organizationType = organizationType || null;
      }
      
      if (expectedEventsPerYear !== undefined) {
        updateData.expectedEventsPerYear = expectedEventsPerYear || null;
      }
      
      if (typicalEventSize !== undefined) {
        updateData.typicalEventSize = typicalEventSize || null;
      }
      
      if (phone !== undefined) {
        updateData.phone = phone || null;
      }
      
      if (website !== undefined) {
        updateData.website = website || null;
      }
      
      if (country !== undefined) {
        updateData.country = country || null;
      }
      
      if (timezone !== undefined) {
        updateData.timezone = timezone || null;
      }
      
      if (currency !== undefined) {
        updateData.currency = currency || null;
      }
      
      // Onboarding tracking fields
      if (onboardingCompleted !== undefined) {
        updateData.onboardingCompleted = Boolean(onboardingCompleted);
      }
      
      if (onboardingStep !== undefined) {
        updateData.onboardingStep = parseInt(onboardingStep) || 1;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updated = await storage.updateOrganization(organizationId, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(sanitizeOrganization(updated));
    } catch (error) {
      logError("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // PATCH /api/organization/custom-domain - Update organization custom domain
  app.patch('/api/organization/custom-domain', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const { customDomain } = req.body;
      
      // Get current org to check if domain is changing
      const currentOrg = await storage.getOrganization(organizationId);
      
      // Validate domain format if provided
      if (customDomain !== null && customDomain !== undefined && customDomain !== '') {
        // Basic domain validation - should not contain protocol or paths
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(customDomain)) {
          return res.status(400).json({ message: "Invalid domain format. Please enter a valid domain like www.example.com" });
        }
      }
      
      // Prepare update data
      const updateData: {
        customDomain: string | null;
        customDomainVerified?: boolean;
        customDomainVerificationToken?: string | null;
      } = {
        customDomain: customDomain || null,
      };
      
      // If domain is changing or being set, reset verification and generate new token
      if (customDomain && customDomain !== currentOrg?.customDomain) {
        updateData.customDomainVerified = false;
        updateData.customDomainVerificationToken = randomBytes(16).toString('hex');
      } else if (!customDomain) {
        // If domain is being cleared, clear verification status and token
        updateData.customDomainVerified = false;
        updateData.customDomainVerificationToken = null;
      }
      
      const updated = await storage.updateOrganization(organizationId, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(sanitizeOrganization(updated));
    } catch (error) {
      logError("Error updating custom domain:", error);
      res.status(500).json({ message: "Failed to update custom domain" });
    }
  });

  // POST /api/organization/verify-domain - Verify domain ownership via DNS TXT record
  app.post('/api/organization/verify-domain', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      // Issue 2: Restrict verification to org owners only
      const membership = await storage.getOrganizationMember(organizationId, userId);
      if (!membership || membership.role !== 'owner') {
        return res.status(403).json({ message: "Only organization owners can verify domains" });
      }
      
      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      if (!org.customDomain) {
        return res.status(400).json({ message: "No custom domain configured" });
      }
      
      // Issue 3: Generate and persist token if not exists
      let verificationToken = org.customDomainVerificationToken;
      if (!verificationToken) {
        verificationToken = randomBytes(16).toString('hex');
        await storage.updateOrganization(organizationId, {
          customDomainVerificationToken: verificationToken,
        });
        logInfo(`Generated new verification token for org ${organizationId}`, 'domain-verification');
      }
      
      // Issue 4: Normalize domain for DNS lookup (handle www prefix)
      let domainToCheck = org.customDomain;
      // If domain starts with www., also check without it for TXT record
      const isWwwDomain = domainToCheck.toLowerCase().startsWith('www.');
      const baseDomain = isWwwDomain ? domainToCheck.substring(4) : domainToCheck;
      
      // Check for TXT record at _eventgtm.{domain}
      const txtRecordHost = `_eventgtm.${domainToCheck}`;
      const altTxtRecordHost = isWwwDomain ? `_eventgtm.${baseDomain}` : null;
      const expectedValue = `eventgtm-verify=${verificationToken}`;
      
      let verified = false;
      let txtRecords: string[][] = [];
      let checkedHosts: string[] = [txtRecordHost];
      
      // Try primary domain first
      try {
        txtRecords = await resolveTxt(txtRecordHost);
        for (const record of txtRecords) {
          const recordValue = record.join('');
          if (recordValue === expectedValue) {
            verified = true;
            break;
          }
        }
      } catch (dnsError: any) {
        logInfo(`DNS lookup failed for ${txtRecordHost}: ${dnsError.code || dnsError.message}`, 'domain-verification');
      }
      
      // If not verified and this is a www domain, try without www prefix
      if (!verified && altTxtRecordHost) {
        checkedHosts.push(altTxtRecordHost);
        try {
          const altTxtRecords = await resolveTxt(altTxtRecordHost);
          for (const record of altTxtRecords) {
            const recordValue = record.join('');
            if (recordValue === expectedValue) {
              verified = true;
              txtRecords = altTxtRecords;
              break;
            }
          }
        } catch (dnsError: any) {
          logInfo(`DNS lookup failed for ${altTxtRecordHost}: ${dnsError.code || dnsError.message}`, 'domain-verification');
        }
      }
      
      if (verified) {
        await storage.updateOrganization(organizationId, {
          customDomainVerified: true,
        });
        
        return res.json({
          verified: true,
          message: "Domain verified successfully!",
          domain: org.customDomain,
        });
      } else {
        return res.json({
          verified: false,
          message: "Verification failed. Please ensure the TXT record is configured correctly.",
          domain: org.customDomain,
          txtRecordHost,
          expectedValue,
          foundRecords: txtRecords.map(r => r.join('')),
          checkedHosts,
          instructions: {
            step1: `Add a CNAME record pointing ${org.customDomain} to your app origin`,
            step2: `Add a TXT record at ${txtRecordHost} with value: ${expectedValue}`,
          },
        });
      }
    } catch (error) {
      logError("Error verifying domain:", error);
      res.status(500).json({ message: "Failed to verify domain" });
    }
  });

  // GET /api/organization/domain-status - Get current domain and verification status
  app.get('/api/organization/domain-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Generate token if domain is set but token doesn't exist
      let verificationToken = org.customDomainVerificationToken;
      if (org.customDomain && !verificationToken) {
        verificationToken = randomBytes(16).toString('hex');
        await storage.updateOrganization(organizationId, {
          customDomainVerificationToken: verificationToken,
        });
      }
      
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host;
      const appOrigin = `${protocol}://${host}`;
      
      const response: {
        customDomain: string | null;
        customDomainVerified: boolean;
        verificationToken: string | null;
        instructions: {
          step1: string;
          step2: string;
          cloudflareNote: string;
        } | null;
      } = {
        customDomain: org.customDomain,
        customDomainVerified: org.customDomainVerified || false,
        verificationToken: org.customDomain ? verificationToken : null,
        instructions: null,
      };
      
      if (org.customDomain && verificationToken) {
        // Parse subdomain from custom domain (e.g., "events" from "events.company.com")
        const domainParts = org.customDomain.split('.');
        const subdomain = domainParts.length > 2 ? domainParts[0] : '@';
        const rootDomain = domainParts.length > 2 ? domainParts.slice(1).join('.') : org.customDomain;
        
        response.instructions = {
          step1: `Add a CNAME record pointing ${org.customDomain} to ${host}`,
          step2: `Add a TXT record at _eventgtm.${org.customDomain} with value: eventgtm-verify=${verificationToken}`,
          cloudflareNote: "In Cloudflare, set the CNAME record to 'Proxied' (orange cloud) for SSL support.",
          // Structured data for table display
          cnameRecord: {
            type: 'CNAME',
            host: subdomain,
            value: host || '',
            description: subdomain === '@' 
              ? 'For root domain, use ALIAS/ANAME if your provider supports it, or use a subdomain instead.'
              : `Enter "${subdomain}" in the Host/Name field`
          },
          txtRecord: {
            type: 'TXT',
            host: `_eventgtm`,
            value: `eventgtm-verify=${verificationToken}`,
            description: `Enter "_eventgtm" in the Host/Name field (creates record at _eventgtm.${rootDomain})`
          }
        };
      }
      
      res.json(response);
    } catch (error) {
      logError("Error fetching domain status:", error);
      res.status(500).json({ message: "Failed to fetch domain status" });
    }
  });

  // Team Member Management routes

  // Helper to check if user is organization owner
  async function isOrganizationOwner(userId: string, organizationId: string): Promise<boolean> {
    const member = await storage.getOrganizationMember(organizationId, userId);
    return member?.role === 'owner';
  }

  // GET /api/organization/members - Get all members for the organization
  app.get('/api/organization/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      if (!await isOrganizationOwner(userId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can view members" });
      }
      
      const members = await storage.getOrganizationMembers(organizationId);
      res.json(members);
    } catch (error) {
      logError("Error fetching organization members:", error);
      res.status(500).json({ message: "Failed to fetch organization members" });
    }
  });

  // GET /api/organization/assignees - Get list of team members for assignment purposes (all members can access)
  app.get('/api/organization/assignees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const members = await storage.getOrganizationMembers(organizationId);
      // Return simplified data for assignment dropdowns
      const assignees = members.map(m => ({
        id: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        profileImageUrl: m.user.profileImageUrl,
      }));
      res.json(assignees);
    } catch (error) {
      logError("Error fetching organization assignees:", error);
      res.status(500).json({ message: "Failed to fetch assignees" });
    }
  });

  // POST /api/organization/invitations - Create a new team invitation
  app.post('/api/organization/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      if (!await isOrganizationOwner(userId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can invite members" });
      }
      
      const { email, permissions } = req.body;
      
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      
      const validPermissions = permissions.filter(p => FEATURE_PERMISSIONS.includes(p as any));
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ 
          message: "Invalid permissions. Valid values are: " + FEATURE_PERMISSIONS.join(', ')
        });
      }
      
      const members = await storage.getOrganizationMembers(organizationId);
      const existingMember = members.find(m => m.user.email?.toLowerCase() === email.toLowerCase());
      if (existingMember) {
        return res.status(400).json({ message: "This email is already a member of the organization" });
      }
      
      const existingInvitations = await storage.getTeamInvitations(organizationId);
      const pendingInvitation = existingInvitations.find(
        i => i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending'
      );
      if (pendingInvitation) {
        return res.status(400).json({ message: "A pending invitation already exists for this email" });
      }
      
      const invitation = await storage.createTeamInvitation({
        organizationId,
        email: email.toLowerCase(),
        role: 'member',
        permissions: validPermissions,
        invitedBy: userId,
      });
      
      // Send invitation email
      const user = await storage.getUser(userId);
      const organization = await storage.getOrganization(organizationId);
      const inviterName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email || 'A team member';
      const organizationName = organization?.name || 'the organization';
      
      const emailResult = await sendTeamInvitationEmail({
        email: email.toLowerCase(),
        organizationName,
        inviterName,
        inviteCode: invitation.inviteCode,
        permissions: validPermissions,
        customDomain: organization?.customDomain || undefined,
      });
      
      if (!emailResult.success) {
        logWarn(`Invitation created but email failed: ${emailResult.error}`, 'TeamInvitation');
      }
      
      res.status(201).json(invitation);
    } catch (error) {
      logError("Error creating team invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // GET /api/organization/invitations - Get all pending invitations
  app.get('/api/organization/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      if (!await isOrganizationOwner(userId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can view invitations" });
      }
      
      const invitations = await storage.getTeamInvitations(organizationId);
      const pendingInvitations = invitations.filter(i => i.status === 'pending');
      res.json(pendingInvitations);
    } catch (error) {
      logError("Error fetching team invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // DELETE /api/organization/invitations/:id - Revoke a pending invitation
  app.delete('/api/organization/invitations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      
      if (!await isOrganizationOwner(userId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can revoke invitations" });
      }
      
      await storage.revokeTeamInvitation(organizationId, id);
      res.status(204).send();
    } catch (error) {
      logError("Error revoking team invitation:", error);
      res.status(500).json({ message: "Failed to revoke invitation" });
    }
  });

  // POST /api/organization/invitations/:id/resend - Resend invitation email
  app.post('/api/organization/invitations/:id/resend', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      
      if (!await isOrganizationOwner(userId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can resend invitations" });
      }
      
      const invitations = await storage.getTeamInvitations(organizationId);
      const invitation = invitations.find(i => i.id === id && i.status === 'pending');
      
      if (!invitation) {
        return res.status(404).json({ message: "Pending invitation not found" });
      }
      
      const user = await storage.getUser(userId);
      const organization = await storage.getOrganization(organizationId);
      const inviterName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email || 'A team member';
      const organizationName = organization?.name || 'the organization';
      
      const emailResult = await sendTeamInvitationEmail({
        email: invitation.email,
        organizationName,
        inviterName,
        inviteCode: invitation.inviteCode,
        permissions: invitation.permissions as string[],
        customDomain: organization?.customDomain || undefined,
      });
      
      if (!emailResult.success) {
        return res.status(500).json({ message: `Failed to resend email: ${emailResult.error}` });
      }
      
      res.json({ message: "Invitation email resent successfully" });
    } catch (error) {
      logError("Error resending team invitation:", error);
      res.status(500).json({ message: "Failed to resend invitation" });
    }
  });

  // PATCH /api/organization/invitations/:id - Update pending invitation permissions
  app.patch('/api/organization/invitations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      const { permissions } = req.body;
      
      if (!await isOrganizationOwner(userId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can update invitations" });
      }
      
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      
      const validPermissions = permissions.filter(p => FEATURE_PERMISSIONS.includes(p as any));
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ 
          message: "Invalid permissions. Valid values are: " + FEATURE_PERMISSIONS.join(', ')
        });
      }
      
      const updatedInvitation = await storage.updateTeamInvitation(id, {
        permissions: validPermissions,
      });
      
      if (!updatedInvitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      res.json(updatedInvitation);
    } catch (error) {
      logError("Error updating invitation:", error);
      res.status(500).json({ message: "Failed to update invitation" });
    }
  });

  // GET /api/invitations/:code - Get invitation details by invite code (public route for acceptance page)
  app.get('/api/invitations/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const invitation = await storage.getTeamInvitationByCode(code);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: `This invitation has already been ${invitation.status}` });
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }
      
      // Get organization details
      const organization = await storage.getOrganization(invitation.organizationId);
      
      res.json({
        id: invitation.id,
        email: invitation.email,
        organizationName: organization?.name || 'Unknown Organization',
        permissions: invitation.permissions,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      logError("Error fetching invitation by code:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  // POST /api/invitations/accept - Accept a team invitation
  app.post('/api/invitations/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      
      const invitation = await storage.getTeamInvitationByCode(code);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: `This invitation has already been ${invitation.status}` });
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "This invitation has expired" });
      }
      
      // Accept the invitation
      const member = await storage.acceptTeamInvitation(code, userId);
      
      if (!member) {
        return res.status(500).json({ message: "Failed to accept invitation" });
      }
      
      // Store the invited organization ID in the session for routing
      if (req.session) {
        req.session.preferredOrganizationId = invitation.organizationId;
        logInfo(`Set preferred organization ID in session: ${invitation.organizationId}`, 'TeamInvitation');
        
        // Await session save to ensure it's persisted before responding
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              logError("Error saving session after invitation acceptance:", err);
              reject(err);
            } else {
              logInfo(`Session saved with preferredOrganizationId: ${invitation.organizationId}`, 'TeamInvitation');
              resolve();
            }
          });
        });
      }
      
      res.json({ message: "Invitation accepted successfully", member });
    } catch (error) {
      logError("Error accepting team invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // PATCH /api/organization/members/:userId - Update member permissions
  app.patch('/api/organization/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = await getOrganizationId(currentUserId, req.session);
      const { userId: targetUserId } = req.params;
      const { permissions } = req.body;
      
      if (!await isOrganizationOwner(currentUserId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can update member permissions" });
      }
      
      const targetMember = await storage.getOrganizationMember(organizationId, targetUserId);
      if (!targetMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (targetMember.role === 'owner') {
        return res.status(400).json({ message: "Cannot update owner's permissions" });
      }
      
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }
      
      const validPermissions = permissions.filter(p => FEATURE_PERMISSIONS.includes(p as any));
      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({ 
          message: "Invalid permissions. Valid values are: " + FEATURE_PERMISSIONS.join(', ')
        });
      }
      
      const updatedMember = await storage.updateOrganizationMember(organizationId, targetUserId, {
        permissions: validPermissions,
      });
      
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json(updatedMember);
    } catch (error) {
      logError("Error updating member permissions:", error);
      res.status(500).json({ message: "Failed to update member permissions" });
    }
  });

  // POST /api/invitations/:id/complete - Manually complete a pending invitation (creates member if needed)
  app.post('/api/invitations/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = await getOrganizationId(currentUserId, req.session);
      const { id: invitationId } = req.params;
      
      if (!await isOrganizationOwner(currentUserId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can complete invitations" });
      }
      
      const invitation = await storage.getTeamInvitation(organizationId, invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Find the user by email
      const user = await storage.getUserByEmail(invitation.email);
      if (!user) {
        return res.status(400).json({ 
          message: "Cannot complete invitation - the invited user has not signed up yet" 
        });
      }
      
      // Check if member already exists
      const existingMember = await storage.getOrganizationMember(organizationId, user.id);
      
      let member;
      if (existingMember) {
        member = existingMember;
        logInfo(`Member already exists for user ${user.id} in org ${organizationId}`, 'TeamInvitation');
      } else {
        // Create the member record
        member = await storage.addOrganizationMember({
          organizationId: organizationId,
          userId: user.id,
          role: invitation.role || 'member',
          permissions: invitation.permissions || [],
          invitedBy: invitation.invitedBy,
        });
        logInfo(`Created member for user ${user.id} in org ${organizationId}`, 'TeamInvitation');
      }
      
      // Update invitation status to accepted
      await storage.updateTeamInvitation(invitationId, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: user.id,
      });
      
      logInfo(`Invitation ${invitationId} marked as accepted for user ${user.id}`, 'TeamInvitation');
      
      res.json({ message: "Invitation completed successfully", member });
    } catch (error) {
      logError("Error completing invitation:", error);
      res.status(500).json({ message: "Failed to complete invitation" });
    }
  });

  // DELETE /api/organization/members/:userId - Remove a member from organization
  app.delete('/api/organization/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = await getOrganizationId(currentUserId, req.session);
      const { userId: targetUserId } = req.params;
      
      if (!await isOrganizationOwner(currentUserId, organizationId)) {
        return res.status(403).json({ message: "Only organization owners can remove members" });
      }
      
      const targetMember = await storage.getOrganizationMember(organizationId, targetUserId);
      if (!targetMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      if (targetMember.role === 'owner') {
        return res.status(400).json({ message: "Cannot remove the organization owner" });
      }
      
      await storage.removeOrganizationMember(organizationId, targetUserId);
      res.status(204).send();
    } catch (error) {
      logError("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // GET /api/team/invite/:inviteCode - Public route to get invitation details
  app.get('/api/team/invite/:inviteCode', async (req: any, res) => {
    try {
      const { inviteCode } = req.params;
      
      const invitation = await storage.getTeamInvitationByCode(inviteCode);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(404).json({ message: "Invitation is no longer valid" });
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(404).json({ message: "Invitation has expired" });
      }
      
      const organization = await storage.getOrganization(invitation.organizationId);
      const inviter = invitation.invitedBy ? await storage.getUser(invitation.invitedBy) : null;
      
      res.json({
        email: invitation.email,
        organizationName: organization?.name || 'Unknown Organization',
        inviterName: inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email : 'Unknown',
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      logError("Error fetching invitation details:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  // POST /api/team/invite/:inviteCode/accept - Accept an invitation
  app.post('/api/team/invite/:inviteCode/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteCode } = req.params;
      
      const invitation = await storage.getTeamInvitationByCode(inviteCode);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }
      
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        await storage.updateTeamInvitation(invitation.id, { status: 'expired' });
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      const newMember = await storage.acceptTeamInvitation(inviteCode, userId);
      
      if (!newMember) {
        return res.status(400).json({ message: "Failed to accept invitation" });
      }
      
      // Store the invited organization ID in the session for routing
      if (req.session) {
        req.session.preferredOrganizationId = invitation.organizationId;
        logInfo(`Set preferred organization ID in session: ${invitation.organizationId}`, 'TeamInvitation');
        
        // Await session save to ensure it's persisted before responding
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              logError("Error saving session after invitation acceptance:", err);
              reject(err);
            } else {
              logInfo(`Session saved with preferredOrganizationId: ${invitation.organizationId}`, 'TeamInvitation');
              resolve();
            }
          });
        });
      }
      
      res.json(newMember);
    } catch (error) {
      logError("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Settings routes
  app.get('/api/settings/resend-status', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const configured = !!process.env.RESEND_API_KEY;
      res.json({ configured });
    } catch (error) {
      logError("Error checking Resend status:", error);
      res.status(500).json({ message: "Failed to check Resend status" });
    }
  });

  app.get('/api/settings/social-integrations-status', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const credentials = await storage.getSocialMediaCredentials(organizationId);
      
      const status: Record<string, boolean> = {
        linkedin: false,
        twitter: false,
        facebook: false,
        instagram: false,
      };
      
      for (const cred of credentials) {
        if (cred.isConfigured && (cred.provider === 'linkedin' || cred.provider === 'twitter' || 
            cred.provider === 'facebook' || cred.provider === 'instagram')) {
          status[cred.provider] = true;
        }
      }
      
      res.json(status);
    } catch (error) {
      logError("Error checking social integrations status:", error);
      res.status(500).json({ message: "Failed to check social integrations status" });
    }
  });

  app.get('/api/settings/social-credentials', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const credentials = await storage.getSocialMediaCredentials(organizationId);
      
      const maskedCredentials = credentials.map(cred => {
        let maskedClientId: string | null = null;
        if (cred.clientId) {
          try {
            const { decrypt } = require('./encryption');
            const decryptedClientId = decrypt(cred.clientId);
            maskedClientId = decryptedClientId.length > 4 
              ? '****' + decryptedClientId.slice(-4) 
              : '****';
          } catch {
            maskedClientId = '****';
          }
        }
        
        return {
          id: cred.id,
          organizationId: cred.organizationId,
          provider: cred.provider,
          clientId: maskedClientId,
          clientSecret: cred.clientSecret ? '********' : null,
          isConfigured: cred.isConfigured,
          configuredAt: cred.configuredAt,
          configuredBy: cred.configuredBy,
          createdAt: cred.createdAt,
          updatedAt: cred.updatedAt,
        };
      });
      
      res.json(maskedCredentials);
    } catch (error) {
      logError("Error fetching social credentials:", error);
      res.status(500).json({ message: "Failed to fetch social credentials" });
    }
  });

  app.post('/api/settings/social-credentials/:provider', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { provider } = req.params;
      const { clientId, clientSecret } = req.body;
      
      const validProviders = ['linkedin', 'twitter', 'facebook', 'instagram'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid provider. Must be one of: linkedin, twitter, facebook, instagram" });
      }
      
      if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
        return res.status(400).json({ message: "Client ID is required" });
      }
      
      if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim().length === 0) {
        return res.status(400).json({ message: "Client Secret is required" });
      }
      
      const credential = await storage.upsertSocialMediaCredential(
        organizationId,
        provider,
        clientId.trim(),
        clientSecret.trim(),
        userId
      );
      
      let maskedClientId: string | null = null;
      if (credential.clientId) {
        try {
          const { decrypt } = require('./encryption');
          const decryptedClientId = decrypt(credential.clientId);
          maskedClientId = decryptedClientId.length > 4 
            ? '****' + decryptedClientId.slice(-4) 
            : '****';
        } catch {
          maskedClientId = '****';
        }
      }
      
      res.json({
        id: credential.id,
        organizationId: credential.organizationId,
        provider: credential.provider,
        clientId: maskedClientId,
        clientSecret: '********',
        isConfigured: credential.isConfigured,
        configuredAt: credential.configuredAt,
        configuredBy: credential.configuredBy,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      });
    } catch (error) {
      logError("Error saving social credentials:", error);
      res.status(500).json({ message: "Failed to save social credentials" });
    }
  });

  app.delete('/api/settings/social-credentials/:provider', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { provider } = req.params;
      
      const validProviders = ['linkedin', 'twitter', 'facebook', 'instagram'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid provider. Must be one of: linkedin, twitter, facebook, instagram" });
      }
      
      await storage.deleteSocialMediaCredential(organizationId, provider);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting social credentials:", error);
      res.status(500).json({ message: "Failed to delete social credentials" });
    }
  });

  // Email Platform Integration routes
  function maskApiKey(apiKey: string | null): string | null {
    if (!apiKey) return null;
    try {
      const decrypted = decrypt(apiKey);
      return decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
    } catch {
      return '****';
    }
  }

  function sanitizeEmailConnection(connection: any) {
    return {
      id: connection.id,
      organizationId: connection.organizationId,
      provider: connection.provider,
      accountName: connection.accountName,
      accountId: connection.accountId,
      apiKey: maskApiKey(connection.apiKey),
      accessToken: connection.accessToken ? '****' : null,
      refreshToken: connection.refreshToken ? '****' : null,
      serverPrefix: connection.serverPrefix,
      tokenExpiresAt: connection.tokenExpiresAt,
      defaultAudienceId: connection.defaultAudienceId,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      errorMessage: connection.errorMessage,
      metadata: connection.metadata,
      connectedBy: connection.connectedBy,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  app.get('/api/email-integrations', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const connections = await storage.getEmailPlatformConnections(organizationId);
      res.json(connections.map(sanitizeEmailConnection));
    } catch (error) {
      logError("Error fetching email integrations:", error);
      res.status(500).json({ message: "Failed to fetch email integrations" });
    }
  });

  app.post('/api/email-integrations', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { provider, apiKey } = req.body;

      const validProviders = ['mailchimp'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid provider. Must be one of: mailchimp" });
      }

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return res.status(400).json({ message: "API key is required" });
      }

      const existingConnection = await storage.getEmailPlatformConnectionByProvider(organizationId, provider);
      if (existingConnection) {
        return res.status(400).json({ message: `A ${provider} connection already exists for this organization` });
      }

      let accountInfo: { accountName: string; accountId: string };
      try {
        const mailchimpProvider = createMailchimpProvider(apiKey.trim());
        accountInfo = await mailchimpProvider.verifyConnection();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logWarn(`Mailchimp API key validation failed: ${errorMessage}`, 'EmailIntegration');
        return res.status(400).json({ message: `Invalid Mailchimp API key: ${errorMessage}` });
      }

      const serverPrefix = apiKey.split('-').pop() || '';

      const connection = await storage.createEmailPlatformConnection({
        organizationId,
        provider,
        apiKey: apiKey.trim(),
        serverPrefix,
        accountName: accountInfo.accountName,
        accountId: accountInfo.accountId,
        status: 'active',
        connectedBy: userId,
      });

      res.status(201).json(sanitizeEmailConnection(connection));
    } catch (error) {
      logError("Error creating email integration:", error);
      res.status(500).json({ message: "Failed to create email integration" });
    }
  });

  app.delete('/api/email-integrations/:id', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;

      const connection = await storage.getEmailPlatformConnection(organizationId, id);
      if (!connection) {
        return res.status(404).json({ message: "Email integration not found" });
      }

      await storage.deleteEmailPlatformAudiences(connection.id);
      await storage.deleteEmailPlatformConnection(organizationId, id);

      res.status(204).send();
    } catch (error) {
      logError("Error deleting email integration:", error);
      res.status(500).json({ message: "Failed to delete email integration" });
    }
  });

  app.get('/api/email-integrations/:id/audiences', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;

      const connection = await storage.getEmailPlatformConnection(organizationId, id);
      if (!connection) {
        return res.status(404).json({ message: "Email integration not found" });
      }

      if (!connection.apiKey) {
        return res.status(400).json({ message: "Connection has no API key configured" });
      }

      let decryptedApiKey: string;
      try {
        decryptedApiKey = decrypt(connection.apiKey);
      } catch (error) {
        logError("Failed to decrypt API key:", error);
        return res.status(500).json({ message: "Failed to access connection credentials" });
      }

      const mailchimpProvider = createMailchimpProvider(decryptedApiKey, connection.serverPrefix || undefined);
      const audiences = await mailchimpProvider.listAudiences();

      for (const audience of audiences) {
        await storage.upsertEmailPlatformAudience({
          connectionId: connection.id,
          organizationId,
          externalId: audience.id,
          name: audience.name,
          memberCount: audience.memberCount,
          listType: 'list',
          lastSyncedAt: new Date(),
        });
      }

      await storage.updateEmailPlatformConnection(organizationId, id, {
        lastSyncedAt: new Date(),
        status: 'active',
        errorMessage: null,
      });

      res.json(audiences);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError("Error fetching email audiences:", error);

      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;

      await storage.updateEmailPlatformConnection(organizationId, id, {
        status: 'error',
        errorMessage: errorMessage,
      });

      res.status(500).json({ message: `Failed to fetch audiences: ${errorMessage}` });
    }
  });

  app.post('/api/email-integrations/:id/sync', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      const { audienceId, eventId, direction } = req.body;

      if (!audienceId || typeof audienceId !== 'string') {
        return res.status(400).json({ message: "audienceId is required" });
      }

      if (direction !== 'push') {
        return res.status(400).json({ message: "Only 'push' direction is currently supported" });
      }

      const connection = await storage.getEmailPlatformConnection(organizationId, id);
      if (!connection) {
        return res.status(404).json({ message: "Email integration not found" });
      }

      if (!connection.apiKey) {
        return res.status(400).json({ message: "Connection has no API key configured" });
      }

      let event = null;
      if (eventId) {
        event = await storage.getEvent(organizationId, eventId);
        if (!event) {
          return res.status(404).json({ message: "Event not found" });
        }
      }

      const syncJob = await storage.createEmailSyncJob({
        connectionId: connection.id,
        organizationId,
        eventId: eventId || null,
        audienceId: null,
        jobType: 'push_attendees',
        direction: 'push',
        status: 'in_progress',
        startedAt: new Date(),
        initiatedBy: userId,
      });

      let decryptedApiKey: string;
      try {
        decryptedApiKey = decrypt(connection.apiKey);
      } catch (error) {
        logError("Failed to decrypt API key:", error);
        await storage.updateEmailSyncJob(syncJob.id, {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: 'Failed to access connection credentials',
        });
        return res.status(500).json({ message: "Failed to access connection credentials" });
      }

      const attendees = await storage.getAttendees(organizationId, eventId || undefined);

      const contacts = attendees
        .filter(a => a.email)
        .map(a => ({
          email: a.email!,
          firstName: a.firstName || undefined,
          lastName: a.lastName || undefined,
          phone: a.phone || undefined,
          company: a.company || undefined,
        }));

      const mailchimpProvider = createMailchimpProvider(decryptedApiKey, connection.serverPrefix || undefined);
      const syncResult = await mailchimpProvider.syncContacts(audienceId, contacts);

      const updatedSyncJob = await storage.updateEmailSyncJob(syncJob.id, {
        status: syncResult.failed > 0 ? 'completed_with_errors' : 'completed',
        finishedAt: new Date(),
        totalRecords: contacts.length,
        processedRecords: contacts.length,
        successCount: syncResult.created + syncResult.updated,
        errorCount: syncResult.failed,
        errorMessage: syncResult.errors.length > 0 
          ? `${syncResult.failed} records failed. First error: ${syncResult.errors[0]?.error || 'Unknown'}`
          : null,
        stats: {
          created: syncResult.created,
          updated: syncResult.updated,
          errors: syncResult.errors.map(e => ({ email: e.email, error: e.error })),
        },
      });

      await storage.updateEmailPlatformConnection(organizationId, id, {
        lastSyncedAt: new Date(),
        status: 'active',
      });

      res.json(updatedSyncJob);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError("Error running email sync:", error);
      res.status(500).json({ message: `Failed to sync: ${errorMessage}` });
    }
  });

  // Passkey (Cvent) Housing Integration routes
  function sanitizePasskeyConnection(connection: any) {
    let maskedClientId = null;
    let maskedClientSecret = null;
    
    if (connection.clientId) {
      try {
        const decrypted = decrypt(connection.clientId);
        maskedClientId = decrypted.length > 4 ? '****' + decrypted.slice(-4) : '****';
      } catch {
        maskedClientId = '****';
      }
    }
    
    if (connection.clientSecret) {
      maskedClientSecret = '********';
    }
    
    return {
      id: connection.id,
      organizationId: connection.organizationId,
      clientId: maskedClientId,
      clientSecret: maskedClientSecret,
      hasCredentials: !!(connection.clientId && connection.clientSecret),
      status: connection.status,
      errorMessage: connection.errorMessage,
      connectedBy: connection.connectedBy,
      tokenExpiresAt: connection.tokenExpiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  app.get('/api/passkey/connection', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const connection = await storage.getPasskeyConnection(organizationId);
      if (!connection) {
        return res.json(null);
      }
      
      res.json(sanitizePasskeyConnection(connection));
    } catch (error) {
      logError("Error fetching Passkey connection:", error);
      res.status(500).json({ message: "Failed to fetch Passkey connection" });
    }
  });

  app.post('/api/passkey/connection', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { clientId, clientSecret } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ message: "Client ID and Client Secret are required" });
      }
      
      const existingConnection = await storage.getPasskeyConnection(organizationId);
      
      let connection;
      if (existingConnection) {
        connection = await storage.updatePasskeyConnection(organizationId, {
          clientId,
          clientSecret,
          status: 'active',
          errorMessage: null,
          connectedBy: userId,
        });
      } else {
        connection = await storage.createPasskeyConnection({
          organizationId,
          clientId,
          clientSecret,
          status: 'active',
          connectedBy: userId,
        });
      }
      
      res.status(existingConnection ? 200 : 201).json(sanitizePasskeyConnection(connection));
    } catch (error) {
      logError("Error saving Passkey connection:", error);
      res.status(500).json({ message: "Failed to save Passkey connection" });
    }
  });

  app.delete('/api/passkey/connection', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      await storage.deletePasskeyConnection(organizationId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting Passkey connection:", error);
      res.status(500).json({ message: "Failed to delete Passkey connection" });
    }
  });

  // Passkey Event Mapping routes
  app.get('/api/passkey/events/:eventId/mapping', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId } = req.params;
      
      const mapping = await storage.getPasskeyEventMapping(organizationId, eventId);
      res.json(mapping || null);
    } catch (error) {
      logError("Error fetching Passkey event mapping:", error);
      res.status(500).json({ message: "Failed to fetch Passkey event mapping" });
    }
  });

  app.post('/api/passkey/events/:eventId/mapping', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId } = req.params;
      const { passkeyEventId, passkeyEventName, regLinkUrl, isEnabled } = req.body;
      
      if (!passkeyEventId) {
        return res.status(400).json({ message: "Passkey Event ID is required" });
      }
      
      const existingMapping = await storage.getPasskeyEventMapping(organizationId, eventId);
      
      let mapping;
      if (existingMapping) {
        mapping = await storage.updatePasskeyEventMapping(organizationId, eventId, {
          passkeyEventId,
          passkeyEventName,
          regLinkUrl,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
        });
      } else {
        mapping = await storage.createPasskeyEventMapping({
          organizationId,
          eventId,
          passkeyEventId,
          passkeyEventName,
          regLinkUrl,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
        });
      }
      
      res.status(existingMapping ? 200 : 201).json(mapping);
    } catch (error) {
      logError("Error saving Passkey event mapping:", error);
      res.status(500).json({ message: "Failed to save Passkey event mapping" });
    }
  });

  app.delete('/api/passkey/events/:eventId/mapping', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId } = req.params;
      
      await storage.deletePasskeyEventMapping(organizationId, eventId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting Passkey event mapping:", error);
      res.status(500).json({ message: "Failed to delete Passkey event mapping" });
    }
  });

  // Passkey Reservation routes
  app.get('/api/passkey/events/:eventId/reservations', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId } = req.params;
      
      const reservations = await storage.getPasskeyReservations(organizationId, eventId);
      res.json(reservations);
    } catch (error) {
      logError("Error fetching Passkey reservations:", error);
      res.status(500).json({ message: "Failed to fetch Passkey reservations" });
    }
  });

  // Generate booking link for attendee
  app.get('/api/passkey/attendees/:attendeeId/booking-link', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { attendeeId } = req.params;
      
      const attendee = await storage.getAttendee(organizationId, attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      
      const mapping = await storage.getPasskeyEventMapping(organizationId, attendee.eventId);
      if (!mapping || !mapping.isEnabled) {
        return res.status(404).json({ message: "Passkey housing is not configured for this event" });
      }
      
      if (!mapping.regLinkUrl) {
        return res.status(400).json({ message: "RegLink URL is not configured for this event" });
      }
      
      // Build the booking URL with attendee information
      const bookingUrl = new URL(mapping.regLinkUrl);
      bookingUrl.searchParams.set('firstName', attendee.firstName);
      bookingUrl.searchParams.set('lastName', attendee.lastName);
      if (attendee.email) {
        bookingUrl.searchParams.set('email', attendee.email);
      }
      if (attendee.phone) {
        bookingUrl.searchParams.set('phone', attendee.phone);
      }
      
      res.json({ 
        bookingUrl: bookingUrl.toString(),
        passkeyEventId: mapping.passkeyEventId,
        passkeyEventName: mapping.passkeyEventName,
      });
    } catch (error) {
      logError("Error generating Passkey booking link:", error);
      res.status(500).json({ message: "Failed to generate booking link" });
    }
  });

  // Custom Fonts routes
  app.get('/api/custom-fonts', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const fonts = await storage.getCustomFonts(organizationId);
      
      // For each font, get its variants
      const fontsWithVariants = await Promise.all(fonts.map(async (font) => {
        const variants = await storage.getCustomFontVariants(font.id);
        return { ...font, variants };
      }));
      
      res.json(fontsWithVariants);
    } catch (error) {
      logError("Error fetching custom fonts:", error);
      res.status(500).json({ message: "Failed to fetch custom fonts" });
    }
  });

  app.get('/api/custom-fonts/:id', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      
      const font = await storage.getCustomFont(organizationId, id);
      if (!font) {
        return res.status(404).json({ message: "Font not found" });
      }
      
      const variants = await storage.getCustomFontVariants(font.id);
      res.json({ ...font, variants });
    } catch (error) {
      logError("Error fetching custom font:", error);
      res.status(500).json({ message: "Failed to fetch custom font" });
    }
  });

  app.post('/api/custom-fonts', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { name, displayName, variants } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Font name is required" });
      }
      
      // Check if font name already exists
      const existing = await storage.getCustomFontByName(organizationId, name);
      if (existing) {
        return res.status(400).json({ message: "A font with this name already exists" });
      }
      
      // Create the font
      const font = await storage.createCustomFont({
        organizationId,
        name: name.toLowerCase().replace(/\s+/g, '-'), // CSS-safe name
        displayName: displayName || name,
      });
      
      // Create variants if provided
      if (variants && Array.isArray(variants)) {
        for (const variant of variants) {
          if (variant.fileUrl && variant.format) {
            await storage.createCustomFontVariant({
              customFontId: font.id,
              fileUrl: variant.fileUrl,
              format: variant.format,
              weight: variant.weight || 400,
              style: variant.style || 'normal',
            });
          }
        }
      }
      
      const allVariants = await storage.getCustomFontVariants(font.id);
      res.status(201).json({ ...font, variants: allVariants });
    } catch (error) {
      logError("Error creating custom font:", error);
      res.status(500).json({ message: "Failed to create custom font" });
    }
  });

  app.patch('/api/custom-fonts/:id', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      const { name, displayName } = req.body;
      
      const font = await storage.getCustomFont(organizationId, id);
      if (!font) {
        return res.status(404).json({ message: "Font not found" });
      }
      
      // If changing name, check for duplicates
      if (name && name !== font.name) {
        const existing = await storage.getCustomFontByName(organizationId, name);
        if (existing) {
          return res.status(400).json({ message: "A font with this name already exists" });
        }
      }
      
      const updates: { name?: string; displayName?: string } = {};
      if (name) updates.name = name.toLowerCase().replace(/\s+/g, '-');
      if (displayName !== undefined) updates.displayName = displayName;
      
      const updated = await storage.updateCustomFont(id, organizationId, updates);
      const variants = await storage.getCustomFontVariants(id);
      res.json({ ...updated, variants });
    } catch (error) {
      logError("Error updating custom font:", error);
      res.status(500).json({ message: "Failed to update custom font" });
    }
  });

  app.delete('/api/custom-fonts/:id', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id } = req.params;
      
      const font = await storage.getCustomFont(organizationId, id);
      if (!font) {
        return res.status(404).json({ message: "Font not found" });
      }
      
      await storage.deleteCustomFont(id, organizationId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting custom font:", error);
      res.status(500).json({ message: "Failed to delete custom font" });
    }
  });

  // Custom Font Variant routes
  app.post('/api/custom-fonts/:fontId/variants', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { fontId } = req.params;
      const { fileUrl, format, weight, style } = req.body;
      
      const font = await storage.getCustomFont(organizationId, fontId);
      if (!font) {
        return res.status(404).json({ message: "Font not found" });
      }
      
      if (!fileUrl || !format) {
        return res.status(400).json({ message: "fileUrl and format are required" });
      }
      
      const validFormats = ['woff2', 'woff', 'truetype', 'opentype'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ message: "Invalid format. Must be one of: " + validFormats.join(', ') });
      }
      
      const variant = await storage.createCustomFontVariant({
        customFontId: fontId,
        fileUrl,
        format,
        weight: weight || 400,
        style: style || 'normal',
      });
      
      res.status(201).json(variant);
    } catch (error) {
      logError("Error creating custom font variant:", error);
      res.status(500).json({ message: "Failed to create font variant" });
    }
  });

  app.delete('/api/custom-fonts/:fontId/variants/:variantId', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { fontId, variantId } = req.params;
      
      const font = await storage.getCustomFont(organizationId, fontId);
      if (!font) {
        return res.status(404).json({ message: "Font not found" });
      }
      
      await storage.deleteCustomFontVariant(variantId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting custom font variant:", error);
      res.status(500).json({ message: "Failed to delete font variant" });
    }
  });

  // Public endpoint to get custom fonts CSS for an event
  app.get('/api/public/events/:slug/fonts.css', async (req, res) => {
    try {
      const { slug } = req.params;
      const event = await storage.getEventByPublicSlug(slug);
      
      if (!event) {
        return res.status(404).send('/* Event not found */');
      }
      
      const fonts = await storage.getCustomFonts(event.organizationId);
      
      if (fonts.length === 0) {
        return res.type('text/css').send('/* No custom fonts configured */');
      }
      
      // Generate @font-face declarations
      let css = '/* Custom fonts */\n';
      
      for (const font of fonts) {
        const variants = await storage.getCustomFontVariants(font.id);
        
        for (const variant of variants) {
          const formatMap: { [key: string]: string } = {
            'woff2': 'woff2',
            'woff': 'woff',
            'truetype': 'truetype',
            'opentype': 'opentype',
          };
          
          css += `@font-face {
  font-family: '${font.name}';
  src: url('${variant.fileUrl}') format('${formatMap[variant.format] || variant.format}');
  font-weight: ${variant.weight || 400};
  font-style: ${variant.style || 'normal'};
  font-display: swap;
}\n`;
        }
      }
      
      res.type('text/css').send(css);
    } catch (error) {
      logError("Error generating fonts CSS:", error);
      res.status(500).send('/* Error generating fonts CSS */');
    }
  });

  // Onboarding routes
  app.get('/api/onboarding/status', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const org = await storage.getOrganization(organizationId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Calculate completion status based on org data and current step
      const hasEvents = (await storage.getEvents(organizationId)).length > 0;
      const hasPackages = (await storage.getPackages(organizationId)).length > 0;
      const currentStep = org.onboardingStep || 1;
      
      // A step is considered complete if user has progressed past it OR met its criteria
      const steps = [
        { 
          id: 1, 
          title: "Organization Profile", 
          description: "Tell us about your organization",
          completed: !!(org.organizationType && org.expectedEventsPerYear),
          skippable: false
        },
        { 
          id: 2, 
          title: "Create First Event", 
          description: "Set up your first event",
          completed: hasEvents,
          skippable: false
        },
        { 
          id: 3, 
          title: "Setup Registration", 
          description: "Configure your registration page",
          completed: hasPackages || currentStep > 3,
          skippable: true
        },
        { 
          id: 4, 
          title: "Branding", 
          description: "Customize your event pages",
          completed: currentStep > 4,
          skippable: true
        },
        { 
          id: 5, 
          title: "Payment Setup", 
          description: "Connect Stripe to accept payments",
          completed: !!org.paymentEnabled || currentStep > 5,
          skippable: true
        },
        { 
          id: 6, 
          title: "Invite Team", 
          description: "Add team members to collaborate",
          completed: org.onboardingCompleted || false,
          skippable: true
        }
      ];

      res.json({
        currentStep: org.onboardingStep || 1,
        onboardingCompleted: org.onboardingCompleted || false,
        steps,
        organization: sanitizeOrganization(org)
      });
    } catch (error) {
      logError("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  app.post('/api/onboarding/complete-step', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { step, data } = req.body;
      
      // Validate step number
      const stepNum = typeof step === 'number' ? step : parseInt(step, 10);
      if (isNaN(stepNum) || stepNum < 1 || stepNum > 6) {
        return res.status(400).json({ message: "Invalid step number" });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const currentStep = org.onboardingStep || 1;
      
      // Only allow completing current step or previous steps (to allow re-completing)
      if (stepNum > currentStep) {
        return res.status(400).json({ message: "Cannot complete a future step" });
      }

      const updateData: Record<string, any> = {};

      // Apply step-specific data updates with validation
      if (stepNum === 1) {
        // Step 1: Organization profile - validate required fields
        if (!data?.organizationType || !data?.expectedEventsPerYear) {
          return res.status(400).json({ 
            message: "Organization type and expected events per year are required" 
          });
        }
        
        // Validate organizationType is a valid option
        const validOrgTypes = ['conference', 'corporate', 'nonprofit', 'agency', 'education'];
        if (!validOrgTypes.includes(data.organizationType)) {
          return res.status(400).json({ message: "Invalid organization type" });
        }
        
        // Validate expectedEventsPerYear is a valid option
        const validEventRanges = ['1-5', '6-20', '21-50', '50+'];
        if (!validEventRanges.includes(data.expectedEventsPerYear)) {
          return res.status(400).json({ message: "Invalid expected events per year value" });
        }
        
        updateData.organizationType = data.organizationType;
        updateData.expectedEventsPerYear = data.expectedEventsPerYear;
        if (data.typicalEventSize) updateData.typicalEventSize = data.typicalEventSize;
        if (data.phone) updateData.phone = data.phone;
        if (data.website) updateData.website = data.website;
        if (data.country) updateData.country = data.country;
        if (data.timezone) updateData.timezone = data.timezone;
        if (data.currency) updateData.currency = data.currency;
        if (data.name) updateData.name = data.name;
      }

      // Move to next step if completing current step
      if (stepNum === currentStep) {
        updateData.onboardingStep = Math.min(stepNum + 1, 6);
      }

      // Check if all required steps (1 and 2) are complete
      const hasEvents = (await storage.getEvents(organizationId)).length > 0;
      const hasProfile = !!(updateData.organizationType || org.organizationType) && 
                         !!(updateData.expectedEventsPerYear || org.expectedEventsPerYear);
      
      // Mark as complete if steps 1 and 2 are done
      if (hasProfile && hasEvents) {
        updateData.onboardingCompleted = true;
      }

      const updated = await storage.updateOrganization(organizationId, updateData);
      res.json(sanitizeOrganization(updated));
    } catch (error) {
      logError("Error completing onboarding step:", error);
      res.status(500).json({ message: "Failed to complete onboarding step" });
    }
  });

  app.post('/api/onboarding/skip-step', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { step } = req.body;
      
      if (!step || typeof step !== 'number' || step < 1 || step > 6) {
        return res.status(400).json({ message: "Invalid step number" });
      }

      // Steps 1 and 2 are not skippable
      if (step === 1 || step === 2) {
        return res.status(400).json({ message: "This step cannot be skipped" });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const currentStep = org.onboardingStep || 1;
      if (step === currentStep) {
        const updated = await storage.updateOrganization(organizationId, {
          onboardingStep: Math.min(step + 1, 6)
        });
        res.json(sanitizeOrganization(updated));
      } else {
        res.json(sanitizeOrganization(org));
      }
    } catch (error) {
      logError("Error skipping onboarding step:", error);
      res.status(500).json({ message: "Failed to skip onboarding step" });
    }
  });

  app.post('/api/onboarding/dismiss', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const updated = await storage.updateOrganization(organizationId, {
        onboardingCompleted: true
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(sanitizeOrganization(updated));
    } catch (error) {
      logError("Error dismissing onboarding:", error);
      res.status(500).json({ message: "Failed to dismiss onboarding" });
    }
  });

  // Geocode autocomplete (for address suggestions)
  app.get("/api/geocode/autocomplete", isAuthenticated, async (req: any, res) => {
    try {
      const text = req.query.text;
      if (!text || text.length < 3) {
        return res.json({ suggestions: [] });
      }

      const apiKey = process.env.GEOAPIFY_API_KEY;
      if (!apiKey) {
        logWarn("GEOAPIFY_API_KEY not configured");
        return res.json({ suggestions: [] });
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&type=street&format=json&apiKey=${apiKey}`
      );

      if (!response.ok) {
        logError("Geoapify API error:", response.status);
        return res.json({ suggestions: [] });
      }

      const data = await response.json();
      const suggestions = (data.results || []).map((result: any) => ({
        formatted: result.formatted,
        housenumber: result.housenumber,
        street: result.street,
        city: result.city,
        state: result.state,
        country: result.country,
        postcode: result.postcode,
        lat: result.lat,
        lon: result.lon,
      }));

      res.json({ suggestions });
    } catch (error) {
      logError("Error fetching address suggestions:", error);
      res.json({ suggestions: [] });
    }
  });

  // Super Admin routes
  app.get("/api/admin/organizations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      if (!userIsSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const organizations = await storage.getAllOrganizationsWithStats();
      // Sanitize all organizations to mask secret keys
      res.json(organizations.map(sanitizeOrganization));
    } catch (error) {
      logError("Error fetching all organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Marketing Leads routes (super admin only)
  app.get("/api/admin/leads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const leads = await storage.getMarketingLeads();
      res.json(leads);
    } catch (error) {
      logError("Error fetching marketing leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.patch("/api/admin/leads/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const { status } = req.body;
      if (!status || !["new", "contacted", "qualified", "converted"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updateMarketingLeadStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(updated);
    } catch (error) {
      logError("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  // Marketing Activation Links (super admin only)
  app.get("/api/admin/marketing-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const links = await storage.getMarketingActivationLinks();
      res.json(links);
    } catch (error) {
      logError("Error fetching marketing links:", error);
      res.status(500).json({ message: "Failed to fetch marketing links" });
    }
  });

  app.get("/api/admin/marketing-links/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const link = await storage.getMarketingActivationLink(req.params.id);
      if (!link) {
        return res.status(404).json({ message: "Marketing link not found" });
      }
      res.json(link);
    } catch (error) {
      logError("Error fetching marketing link:", error);
      res.status(500).json({ message: "Failed to fetch marketing link" });
    }
  });

  const createMarketingLinkSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    destinationType: z.enum(["landing", "pricing", "lead-form", "signup"]).default("landing"),
    destinationUrl: z.string().url("Invalid URL"),
    utmSource: z.string().min(1, "Source is required"),
    utmMedium: z.string().min(1, "Medium is required"),
    utmCampaign: z.string().min(1, "Campaign is required"),
    utmContent: z.string().optional().nullable(),
    utmTerm: z.string().optional().nullable(),
    status: z.enum(["active", "paused", "archived"]).optional().default("active"),
  });

  app.post("/api/admin/marketing-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const data = createMarketingLinkSchema.parse(req.body);
      
      // Generate short code
      const shortCode = randomBytes(4).toString("hex");
      
      const link = await storage.createMarketingActivationLink({
        ...data,
        shortCode,
      });
      res.status(201).json(link);
    } catch (error: any) {
      logError("Error creating marketing link:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid marketing link data";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/admin/marketing-links/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const data = createMarketingLinkSchema.partial().parse(req.body);
      const updated = await storage.updateMarketingActivationLink(req.params.id, data);
      if (!updated) {
        return res.status(404).json({ message: "Marketing link not found" });
      }
      res.json(updated);
    } catch (error: any) {
      logError("Error updating marketing link:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Failed to update marketing link";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/admin/marketing-links/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      await storage.deleteMarketingActivationLink(req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting marketing link:", error);
      res.status(500).json({ message: "Failed to delete marketing link" });
    }
  });

  // Marketing analytics (super admin only)
  app.get("/api/admin/marketing-analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const metrics = await storage.getMarketingAcquisitionMetrics();
      res.json(metrics);
    } catch (error) {
      logError("Error fetching marketing analytics:", error);
      res.status(500).json({ message: "Failed to fetch marketing analytics" });
    }
  });

  // Marketing click breakdowns (super admin only)
  app.get("/api/admin/marketing-breakdowns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const breakdowns = await storage.getMarketingClickBreakdowns();
      res.json(breakdowns);
    } catch (error) {
      logError("Error fetching marketing breakdowns:", error);
      res.status(500).json({ message: "Failed to fetch marketing breakdowns" });
    }
  });

  // Toggle Revenue & ROI feature for an organization (super admin only)
  app.patch("/api/admin/organizations/:id/revenue-roi", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isSuperAdmin(user?.email, user?.isAdmin)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "Invalid request body. 'enabled' must be a boolean." });
      }
      
      const updated = await storage.updateOrganization(req.params.id, {
        enableRevenueRoi: enabled
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(sanitizeOrganization(updated));
    } catch (error) {
      logError("Error toggling revenue ROI feature:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.delete("/api/organizations/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      if (!userIsSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      await storage.deleteOrganization(req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Signup Invite Code Admin routes (super admin only)
  app.get("/api/admin/signup-invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      if (!userIsSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const codes = await storage.getSignupInviteCodes();
      res.json(codes);
    } catch (error) {
      logError("Error fetching signup invite codes:", error);
      res.status(500).json({ message: "Failed to fetch signup invite codes" });
    }
  });

  // Server-side schema with transforms for proper type handling
  const createInviteCodeSchema = z.object({
    code: z.string().min(1, "Code is required").transform(val => val.toUpperCase().trim()),
    description: z.string().optional().nullable().transform(val => val?.trim() || null),
    discountPercent: z.union([z.number(), z.string(), z.null()]).optional().transform(val => {
      if (val === "" || val === null || val === undefined) return null;
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(num) ? null : Math.min(100, Math.max(0, num));
    }),
    maxUses: z.union([z.number(), z.string(), z.null()]).optional().transform(val => {
      if (val === "" || val === null || val === undefined) return null;
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(num) || num < 1 ? null : num;
    }),
    expiresAt: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
      if (!val || val === "") return null;
      const date = typeof val === "string" ? new Date(val) : val;
      return isNaN(date.getTime()) ? null : date;
    }),
    isActive: z.union([z.boolean(), z.string()]).optional().default(true).transform(val => {
      if (typeof val === "string") return val === "true";
      return val ?? true;
    }),
    createdBy: z.string().optional().nullable(),
  });

  app.post("/api/admin/signup-invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      if (!userIsSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const data = createInviteCodeSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const code = await storage.createSignupInviteCode(data);
      res.status(201).json(code);
    } catch (error: any) {
      logError("Error creating signup invite code:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid signup invite code data";
      res.status(400).json({ message });
    }
  });

  // Partial schema for updates (all fields optional)
  const updateInviteCodeSchema = createInviteCodeSchema.partial().omit({ createdBy: true });

  app.patch("/api/admin/signup-invite-codes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      if (!userIsSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const data = updateInviteCodeSchema.parse(req.body);
      const code = await storage.updateSignupInviteCode(req.params.id, data);
      if (!code) {
        return res.status(404).json({ message: "Signup invite code not found" });
      }
      res.json(code);
    } catch (error: any) {
      logError("Error updating signup invite code:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Failed to update signup invite code";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/admin/signup-invite-codes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      if (!userIsSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      await storage.deleteSignupInviteCode(req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting signup invite code:", error);
      res.status(500).json({ message: "Failed to delete signup invite code" });
    }
  });

  // Public signup invite code validation endpoint
  app.post("/api/signup-invite-codes/validate", async (req: any, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Code is required" });
      }
      
      const result = await storage.validateSignupInviteCode(code);
      res.json(result);
    } catch (error) {
      logError("Error validating signup invite code:", error);
      res.status(500).json({ message: "Failed to validate signup invite code" });
    }
  });

  // Signup status endpoint - returns whether user needs invite code
  app.get("/api/auth/signup-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      
      if (userIsSuperAdmin) {
        return res.json({
          requiresInvite: false,
          userIsSuperAdmin: true,
        });
      }
      
      const redemptionData = await storage.getSignupRedemptionForUser(userId);
      
      if (redemptionData) {
        return res.json({
          requiresInvite: false,
          userIsSuperAdmin: false,
          redemption: {
            inviteCodeId: redemptionData.redemption.inviteCodeId,
            redeemedAt: redemptionData.redemption.redeemedAt,
            code: redemptionData.inviteCode.code,
            description: redemptionData.inviteCode.description,
          },
        });
      }
      
      // Default: don't require invite code for regular users
      return res.json({
        requiresInvite: false,
        userIsSuperAdmin: false,
      });
    } catch (error) {
      logError("Error fetching signup status:", error);
      res.status(500).json({ message: "Failed to fetch signup status" });
    }
  });

  // Redeem signup invite code endpoint
  app.post("/api/signup-invite-codes/redeem", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Code is required" });
      }
      
      const validation = await storage.validateSignupInviteCode(code);
      if (!validation.valid) {
        return res.status(400).json({ message: "Invalid, expired, or fully used invite code" });
      }
      
      const memberships = await storage.getUserOrganizations(userId);
      const organizationId = memberships.length > 0 ? memberships[0].organizationId : null;
      
      await storage.redeemSignupInviteCode(code, userId, organizationId);
      
      const user = await storage.getUser(userId);
      const userIsSuperAdmin = isSuperAdmin(user?.email, user?.isAdmin);
      const redemptionData = await storage.getSignupRedemptionForUser(userId);
      
      if (redemptionData) {
        return res.json({
          requiresInvite: false,
          userIsSuperAdmin,
          redemption: {
            inviteCodeId: redemptionData.redemption.inviteCodeId,
            redeemedAt: redemptionData.redemption.redeemedAt,
            code: redemptionData.inviteCode.code,
            description: redemptionData.inviteCode.description,
          },
        });
      }
      
      return res.json({
        requiresInvite: false,
        userIsSuperAdmin,
      });
    } catch (error) {
      logError("Error redeeming signup invite code:", error);
      res.status(500).json({ message: "Failed to redeem signup invite code" });
    }
  });

  // Event routes
  app.get("/api/events", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const events = await storage.getEvents(organizationId);
      res.json(events);
    } catch (error) {
      logError("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const slug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const data = insertEventSchema.parse({
        ...req.body,
        slug,
        organizationId,
        createdBy: userId,
      });
      const event = await storage.createEvent(data);
      res.status(201).json(event);
    } catch (error: any) {
      logError("Error creating event:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid event data";
      res.status(400).json({ message });
    }
  });

  app.get("/api/events/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const event = await storage.getEvent(organizationId, req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      logError("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const event = await storage.updateEvent(organizationId, req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      logError("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteEvent(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event Translations
  app.get("/api/events/:eventId/translations", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId } = req.params;
      const translations = await storage.getEventTranslations(organizationId, eventId);
      res.json(translations);
    } catch (error) {
      logError("Error fetching event translations:", error);
      res.status(500).json({ message: "Failed to fetch event translations" });
    }
  });

  app.get("/api/events/:eventId/translations/:lang", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, lang } = req.params;
      const translation = await storage.getEventTranslation(organizationId, eventId, lang);
      if (!translation) {
        return res.status(404).json({ message: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      logError("Error fetching event translation:", error);
      res.status(500).json({ message: "Failed to fetch event translation" });
    }
  });

  app.put("/api/events/:eventId/translations/:lang", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, lang } = req.params;
      const translation = await storage.upsertEventTranslation({
        organizationId,
        eventId,
        languageCode: lang,
        ...req.body,
      });
      res.json(translation);
    } catch (error) {
      logError("Error upserting event translation:", error);
      res.status(500).json({ message: "Failed to save event translation" });
    }
  });

  app.delete("/api/events/:eventId/translations/:lang", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, lang } = req.params;
      await storage.deleteEventTranslation(organizationId, eventId, lang);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting event translation:", error);
      res.status(500).json({ message: "Failed to delete event translation" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const [attendees, sessions, speakers, budgetItems, deliverablesList, milestonesList] = await Promise.all([
        storage.getAttendees(organizationId),
        storage.getSessions(organizationId),
        storage.getSpeakers(organizationId),
        storage.getBudgetItems(organizationId),
        storage.getDeliverables(organizationId),
        storage.getMilestones(organizationId),
      ]);

      const totalBudget = budgetItems.reduce((sum, item) => sum + parseFloat(item.plannedAmount || "0"), 0);
      const spentBudget = budgetItems.reduce((sum, item) => sum + parseFloat(item.actualAmount || "0"), 0);
      const pendingDeliverables = deliverablesList.filter(d => d.status !== "done").length;
      const upcomingMilestones = milestonesList.filter(m => m.status !== "completed").slice(0, 5);
      const recentAttendees = attendees.slice(0, 5);
      const upcomingSessions = sessions.slice(0, 5);

      res.json({
        totalAttendees: attendees.length,
        totalSessions: sessions.length,
        totalSpeakers: speakers.length,
        totalBudget,
        spentBudget,
        pendingDeliverables,
        upcomingMilestones,
        recentAttendees,
        upcomingSessions,
      });
    } catch (error) {
      logError("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Acquisition metrics endpoint
  app.get("/api/analytics/acquisition", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const metrics = await storage.getAcquisitionMetrics(organizationId);
      res.json(metrics);
    } catch (error) {
      logError("Error fetching acquisition metrics:", error);
      res.status(500).json({ message: "Failed to fetch acquisition metrics" });
    }
  });

  // Get active visitors for real-time activity dashboard
  app.get("/api/analytics/active-visitors", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const minutesAgo = parseInt(req.query.minutes as string) || 5;
      const activeVisitors = await storage.getActiveVisitors(organizationId, Math.min(minutesAgo, 30));
      res.json(activeVisitors);
    } catch (error) {
      logError("Error fetching active visitors:", error);
      res.status(500).json({ message: "Failed to fetch active visitors" });
    }
  });

  // Attendee routes
  app.get("/api/attendees", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const attendees = await storage.getAttendees(organizationId, eventId);
      res.json(attendees);
    } catch (error) {
      logError("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post("/api/attendees", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { inviteCode, ...attendeeData } = req.body;
      
      let inviteCodeId: string | undefined;
      let attendeeType = attendeeData.attendeeType;
      let ticketType = attendeeData.ticketType;
      let packageId: string | undefined = attendeeData.packageId;
      let foundInviteCode: any = null;
      
      // If invite code is provided, validate and apply associations
      if (inviteCode && attendeeData.eventId) {
        foundInviteCode = await storage.getInviteCodeByCode(
          organizationId,
          attendeeData.eventId,
          inviteCode
        );
        
        if (!foundInviteCode) {
          return res.status(400).json({ message: "Invalid invite code" });
        }
        
        if (!foundInviteCode.isActive) {
          return res.status(400).json({ message: "Invite code is no longer active" });
        }
        
        // Check quantity limit if set
        if (foundInviteCode.quantity !== null && 
            (foundInviteCode.usedCount || 0) >= foundInviteCode.quantity) {
          return res.status(400).json({ message: "Invite code has reached its usage limit" });
        }
        
        // Apply invite code associations
        inviteCodeId = foundInviteCode.id;
        
        // Apply attendee type from invite code if it has one
        if (foundInviteCode.attendeeTypeId) {
          const inviteAttendeeType = await storage.getAttendeeType(organizationId, foundInviteCode.attendeeTypeId);
          if (inviteAttendeeType) {
            attendeeType = inviteAttendeeType.type;
          }
        }
        
        // Apply package from invite code if it has one
        if (foundInviteCode.packageId) {
          const invitePackage = await storage.getPackage(organizationId, foundInviteCode.packageId);
          if (invitePackage) {
            ticketType = invitePackage.name;
            packageId = invitePackage.id;
          }
        }
      }
      
      const data = insertAttendeeSchema.parse({ 
        ...attendeeData, 
        organizationId,
        attendeeType,
        ticketType,
        inviteCodeId,
        packageId
      });
      const attendee = await storage.createAttendee(data);
      
      // Increment the used count AFTER successful attendee creation
      if (foundInviteCode) {
        try {
          await storage.updateInviteCode(organizationId, foundInviteCode.id, {
            usedCount: (foundInviteCode.usedCount || 0) + 1
          });
        } catch (e) {
          logError("Failed to update invite code usage count:", e);
        }
      }
      
      // If attendee type is "Speaker" (case-insensitive), create speaker record
      const isSpeakerType = attendeeType && attendeeType.toLowerCase() === 'speaker';
      if (isSpeakerType && attendeeData.eventId) {
        try {
          let speaker = await storage.getSpeakerByEmail(organizationId, attendeeData.eventId, attendee.email);
          if (!speaker) {
            speaker = await storage.createSpeaker({
              organizationId,
              eventId: attendeeData.eventId,
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              email: attendee.email,
              phone: attendee.phone || undefined,
              company: attendee.company || undefined,
              jobTitle: attendee.jobTitle || undefined,
              speakerRole: 'speaker',
            });
            logInfo(`Created speaker ${speaker.id} for attendee with speaker type`);
          }
        } catch (e) {
          logError("Failed to create speaker from attendee:", e);
        }
      }
      
      res.status(201).json(attendee);
    } catch (error) {
      logError("Error creating attendee:", error);
      res.status(400).json({ message: "Invalid attendee data" });
    }
  });

  app.patch("/api/attendees/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const attendee = await storage.updateAttendee(organizationId, req.params.id, req.body);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      res.json(attendee);
    } catch (error) {
      logError("Error updating attendee:", error);
      res.status(400).json({ message: "Failed to update attendee" });
    }
  });

  app.delete("/api/attendees/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteAttendee(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting attendee:", error);
      res.status(500).json({ message: "Failed to delete attendee" });
    }
  });

  // Bulk import attendees
  app.post("/api/attendees/bulk-import", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, attendees } = req.body;
      
      if (!eventId || !Array.isArray(attendees)) {
        return res.status(400).json({ message: "Event ID and attendees array are required" });
      }
      
      // Verify event belongs to organization
      const event = await storage.getEvent(organizationId, eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      let success = 0;
      let failed = 0;
      const errors: Array<{ row: number; error: string }> = [];
      
      for (let i = 0; i < attendees.length; i++) {
        const attendee = attendees[i];
        try {
          // Basic validation
          if (!attendee.firstName || !attendee.lastName || !attendee.email) {
            throw new Error("Missing required fields (firstName, lastName, email)");
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(attendee.email)) {
            throw new Error("Invalid email format");
          }
          
          // Prepare attendee data
          const attendeeData = {
            organizationId,
            eventId,
            firstName: attendee.firstName.trim(),
            lastName: attendee.lastName.trim(),
            email: attendee.email.trim().toLowerCase(),
            phone: attendee.phone?.trim() || null,
            company: attendee.company?.trim() || null,
            jobTitle: attendee.jobTitle?.trim() || null,
            attendeeType: attendee.attendeeType?.trim() || null,
            ticketType: attendee.ticketType?.trim() || null,
            registrationStatus: attendee.registrationStatus?.trim() || "pending",
            notes: attendee.notes?.trim() || null,
          };
          
          const parsed = insertAttendeeSchema.parse(attendeeData);
          const createdAttendee = await storage.createAttendee(parsed);
          
          // If attendee type is "Speaker" (case-insensitive), create speaker record
          const isSpeakerType = attendeeData.attendeeType && attendeeData.attendeeType.toLowerCase() === 'speaker';
          if (isSpeakerType) {
            try {
              let speaker = await storage.getSpeakerByEmail(organizationId, eventId, createdAttendee.email);
              if (!speaker) {
                await storage.createSpeaker({
                  organizationId,
                  eventId,
                  firstName: createdAttendee.firstName,
                  lastName: createdAttendee.lastName,
                  email: createdAttendee.email,
                  phone: createdAttendee.phone || undefined,
                  company: createdAttendee.company || undefined,
                  jobTitle: createdAttendee.jobTitle || undefined,
                  speakerRole: 'speaker',
                });
              }
            } catch (speakerError) {
              logError("Failed to create speaker from bulk import:", speakerError);
            }
          }
          
          success++;
        } catch (error: any) {
          failed++;
          errors.push({
            row: i + 1,
            error: error.message || "Failed to import attendee",
          });
        }
      }
      
      res.json({ success, failed, errors });
    } catch (error) {
      logError("Error bulk importing attendees:", error);
      res.status(500).json({ message: "Failed to import attendees" });
    }
  });

  // Bulk update attendees
  app.post("/api/attendees/bulk-update", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { attendeeIds, updates } = req.body;
      
      if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
        return res.status(400).json({ message: "Attendee IDs array is required" });
      }
      
      if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Updates object is required" });
      }

      // Only allow updating certain fields
      const allowedFields = ['registrationStatus', 'attendeeType', 'ticketType', 'checkedIn', 'notes'];
      const updateData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      let success = 0;
      let failed = 0;
      const errors: { id: string; error: string }[] = [];

      for (const attendeeId of attendeeIds) {
        try {
          // Verify attendee belongs to organization
          const attendee = await storage.getAttendee(organizationId, attendeeId);
          if (!attendee) {
            failed++;
            errors.push({ id: attendeeId, error: "Attendee not found" });
            continue;
          }
          
          await storage.updateAttendee(organizationId, attendeeId, updateData);
          success++;
        } catch (error: any) {
          failed++;
          errors.push({ id: attendeeId, error: error.message || "Failed to update" });
        }
      }

      res.json({ success, failed, errors, totalProcessed: attendeeIds.length });
    } catch (error) {
      logError("Error bulk updating attendees:", error);
      res.status(500).json({ message: "Failed to bulk update attendees" });
    }
  });

  // Bulk send email to attendees
  app.post("/api/attendees/bulk-email", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { attendeeIds, templateId } = req.body;
      
      if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
        return res.status(400).json({ message: "Attendee IDs array is required" });
      }
      
      if (!templateId) {
        return res.status(400).json({ message: "Template ID is required" });
      }

      // Get the template
      const template = await storage.getEmailTemplate(organizationId, templateId);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }

      // Get organization for sender info
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      let success = 0;
      let failed = 0;
      const errors: { id: string; error: string }[] = [];

      for (const attendeeId of attendeeIds) {
        try {
          // Get attendee
          const attendee = await storage.getAttendee(organizationId, attendeeId);
          if (!attendee) {
            failed++;
            errors.push({ id: attendeeId, error: "Attendee not found" });
            continue;
          }

          // Get event for the attendee
          const event = await storage.getEvent(organizationId, attendee.eventId);
          if (!event) {
            failed++;
            errors.push({ id: attendeeId, error: "Event not found" });
            continue;
          }

          // Process template with merge tags
          const mergeData = {
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            email: attendee.email,
            company: attendee.company || '',
            jobTitle: attendee.jobTitle || '',
            ticketType: attendee.ticketType || '',
            eventName: event.name,
            eventDate: event.startDate,
            eventLocation: event.location || '',
            checkInCode: attendee.checkInCode || '',
          };

          let subject = template.subject;
          let body = template.body;
          
          for (const [key, value] of Object.entries(mergeData)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, String(value));
            body = body.replace(regex, String(value));
          }

          // Create email message record
          const emailMessage = await storage.createEmailMessage({
            organizationId,
            eventId: attendee.eventId,
            templateId,
            recipientType: 'attendee',
            recipientId: attendeeId,
            recipientEmail: attendee.email,
            subject,
            body,
            status: 'queued',
          });

          // Send email using Resend if available
          if (process.env.RESEND_API_KEY) {
            try {
              const { Resend } = await import('resend');
              const resend = new Resend(process.env.RESEND_API_KEY);
              
              const fromEmail = template.fromEmail || `noreply@${organization.slug || 'events'}.com`;
              const fromName = template.fromName || organization.name;
              
              const emailResponse = await resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: attendee.email,
                subject,
                html: body,
              });

              await storage.updateEmailMessage(organizationId, emailMessage.id, {
                status: 'sent',
                sentAt: new Date(),
                externalId: emailResponse.data?.id,
              });

              // Update attendee status if this is an invite email
              if (template.isInviteEmail) {
                await storage.updateAttendee(organizationId, attendeeId, {
                  registrationStatus: 'invited',
                });
              }

              success++;
            } catch (sendError: any) {
              await storage.updateEmailMessage(organizationId, emailMessage.id, {
                status: 'failed',
              });
              failed++;
              errors.push({ id: attendeeId, error: sendError.message || "Failed to send email" });
            }
          } else {
            // No Resend API key, mark as sent for demo purposes
            await storage.updateEmailMessage(organizationId, emailMessage.id, {
              status: 'sent',
              sentAt: new Date(),
            });
            success++;
          }
        } catch (error: any) {
          failed++;
          errors.push({ id: attendeeId, error: error.message || "Failed to process" });
        }
      }

      res.json({ success, failed, errors, totalProcessed: attendeeIds.length });
    } catch (error) {
      logError("Error bulk emailing attendees:", error);
      res.status(500).json({ message: "Failed to bulk email attendees" });
    }
  });

  // Attendee Type routes
  app.get("/api/attendee-types", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const attendeeTypes = await storage.getAttendeeTypes(organizationId, eventId);
      res.json(attendeeTypes);
    } catch (error) {
      logError("Error fetching attendee types:", error);
      res.status(500).json({ message: "Failed to fetch attendee types" });
    }
  });

  app.get("/api/attendee-types/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const attendeeType = await storage.getAttendeeType(organizationId, req.params.id);
      if (!attendeeType) {
        return res.status(404).json({ message: "Attendee type not found" });
      }
      res.json(attendeeType);
    } catch (error) {
      logError("Error fetching attendee type:", error);
      res.status(500).json({ message: "Failed to fetch attendee type" });
    }
  });

  app.post("/api/attendee-types", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertAttendeeTypeSchema.parse({ ...req.body, organizationId });
      const attendeeType = await storage.createAttendeeType(data);
      res.status(201).json(attendeeType);
    } catch (error) {
      logError("Error creating attendee type:", error);
      res.status(400).json({ message: "Invalid attendee type data" });
    }
  });

  app.patch("/api/attendee-types/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const attendeeType = await storage.updateAttendeeType(organizationId, req.params.id, req.body);
      if (!attendeeType) {
        return res.status(404).json({ message: "Attendee type not found" });
      }
      res.json(attendeeType);
    } catch (error) {
      logError("Error updating attendee type:", error);
      res.status(400).json({ message: "Failed to update attendee type" });
    }
  });

  app.delete("/api/attendee-types/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteAttendeeType(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting attendee type:", error);
      res.status(500).json({ message: "Failed to delete attendee type" });
    }
  });

  // Package routes (global to organization, not event-specific)
  app.get("/api/packages", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const packages = await storage.getPackages(organizationId);
      res.json(packages);
    } catch (error) {
      logError("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.get("/api/packages/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const pkg = await storage.getPackage(organizationId, req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      logError("Error fetching package:", error);
      res.status(500).json({ message: "Failed to fetch package" });
    }
  });

  app.post("/api/packages", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const body = {
        ...req.body,
        organizationId,
        price: req.body.price !== undefined ? String(req.body.price) : "0",
      };
      const data = insertPackageSchema.parse(body);
      const pkg = await storage.createPackage(data);
      res.status(201).json(pkg);
    } catch (error) {
      logError("Error creating package:", error);
      res.status(400).json({ message: "Invalid package data" });
    }
  });

  app.patch("/api/packages/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const body = {
        ...req.body,
        ...(req.body.price !== undefined && { price: String(req.body.price) }),
      };
      const pkg = await storage.updatePackage(organizationId, req.params.id, body);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      logError("Error updating package:", error);
      res.status(400).json({ message: "Failed to update package" });
    }
  });

  app.delete("/api/packages/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deletePackage(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting package:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Get events assigned to a package
  app.get("/api/packages/:id/events", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventPackages = await storage.getEventPackagesByPackageId(organizationId, req.params.id);
      res.json(eventPackages.map(ep => ep.eventId));
    } catch (error) {
      logError("Error fetching package events:", error);
      res.status(500).json({ message: "Failed to fetch package events" });
    }
  });

  // Event Package routes (per-event package overrides)
  app.get("/api/events/:eventId/packages", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;

      // Get all base packages for the organization
      const basePackages = await storage.getPackages(organizationId);
      // Get event-specific overrides
      const eventPackageOverrides = await storage.getEventPackages(organizationId, eventId);

      // Create a map of overrides for quick lookup
      const overrideMap = new Map(eventPackageOverrides.map(ep => [ep.packageId, ep]));

      // Merge base packages with overrides
      const mergedPackages = basePackages.map(pkg => {
        const override = overrideMap.get(pkg.id);
        return {
          ...pkg,
          effectivePrice: override?.priceOverride ?? pkg.price,
          effectiveFeatures: override?.featuresOverride ?? pkg.features,
          hasOverride: !!override,
          isEnabled: override ? override.isEnabled : pkg.isActive,
          eventPackageId: override?.id,
        };
      });

      res.json(mergedPackages);
    } catch (error) {
      logError("Error fetching event packages:", error);
      res.status(500).json({ message: "Failed to fetch event packages" });
    }
  });

  app.put("/api/events/:eventId/packages/:packageId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, packageId } = req.params;
      const { priceOverride, featuresOverride, isEnabled } = req.body;

      const eventPackage = await storage.upsertEventPackage({
        organizationId,
        eventId,
        packageId,
        priceOverride: priceOverride !== undefined ? String(priceOverride) : null,
        featuresOverride: featuresOverride ?? null,
        isEnabled: isEnabled ?? true,
      });

      res.json(eventPackage);
    } catch (error) {
      logError("Error upserting event package:", error);
      res.status(400).json({ message: "Failed to update event package" });
    }
  });

  app.delete("/api/events/:eventId/packages/:packageId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, packageId } = req.params;

      await storage.deleteEventPackage(organizationId, eventId, packageId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting event package:", error);
      res.status(500).json({ message: "Failed to delete event package" });
    }
  });

  // Invite Code routes
  app.get("/api/invite-codes", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const inviteCodes = await storage.getInviteCodes(organizationId, eventId);
      res.json(inviteCodes);
    } catch (error) {
      logError("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.get("/api/invite-codes/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const inviteCode = await storage.getInviteCode(organizationId, req.params.id);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invite code not found" });
      }
      res.json(inviteCode);
    } catch (error) {
      logError("Error fetching invite code:", error);
      res.status(500).json({ message: "Failed to fetch invite code" });
    }
  });

  app.post("/api/invite-codes", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertInviteCodeSchema.parse({ ...req.body, organizationId });
      const inviteCode = await storage.createInviteCode(data);
      res.status(201).json(inviteCode);
    } catch (error) {
      logError("Error creating invite code:", error);
      res.status(400).json({ message: "Invalid invite code data" });
    }
  });

  app.patch("/api/invite-codes/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const inviteCode = await storage.updateInviteCode(organizationId, req.params.id, req.body);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invite code not found" });
      }
      res.json(inviteCode);
    } catch (error) {
      logError("Error updating invite code:", error);
      res.status(400).json({ message: "Failed to update invite code" });
    }
  });

  app.delete("/api/invite-codes/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteInviteCode(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting invite code:", error);
      res.status(500).json({ message: "Failed to delete invite code" });
    }
  });

  // Activation Links routes
  app.get("/api/activation-links", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const links = await storage.getActivationLinks(organizationId, eventId);
      res.json(links);
    } catch (error) {
      logError("Error fetching activation links:", error);
      res.status(500).json({ message: "Failed to fetch activation links" });
    }
  });

  app.get("/api/activation-links/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const link = await storage.getActivationLink(organizationId, req.params.id);
      if (!link) {
        return res.status(404).json({ message: "Activation link not found" });
      }
      res.json(link);
    } catch (error) {
      logError("Error fetching activation link:", error);
      res.status(500).json({ message: "Failed to fetch activation link" });
    }
  });

  app.get("/api/activation-links/:id/clicks", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const link = await storage.getActivationLink(organizationId, req.params.id);
      if (!link) {
        return res.status(404).json({ message: "Activation link not found" });
      }
      const clicks = await storage.getActivationLinkClicks(req.params.id);
      res.json(clicks);
    } catch (error) {
      logError("Error fetching activation link clicks:", error);
      res.status(500).json({ message: "Failed to fetch clicks" });
    }
  });

  app.post("/api/activation-links", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      // Generate a random short code
      const shortCode = randomBytes(4).toString("hex");
      const data = insertActivationLinkSchema.parse({ 
        ...req.body, 
        organizationId,
        shortCode,
        createdBy: userId,
      });
      const link = await storage.createActivationLink(data);
      res.status(201).json(link);
    } catch (error) {
      logError("Error creating activation link:", error);
      res.status(400).json({ message: "Invalid activation link data" });
    }
  });

  app.patch("/api/activation-links/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const link = await storage.updateActivationLink(organizationId, req.params.id, req.body);
      if (!link) {
        return res.status(404).json({ message: "Activation link not found" });
      }
      res.json(link);
    } catch (error) {
      logError("Error updating activation link:", error);
      res.status(400).json({ message: "Failed to update activation link" });
    }
  });

  app.delete("/api/activation-links/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteActivationLink(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting activation link:", error);
      res.status(500).json({ message: "Failed to delete activation link" });
    }
  });

  // Organization-scoped activation link analytics breakdowns
  app.get("/api/activation-links-breakdowns", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const breakdowns = await storage.getActivationLinkClickBreakdowns(organizationId, eventId);
      res.json(breakdowns);
    } catch (error) {
      logError("Error getting activation link breakdowns:", error);
      res.status(500).json({ message: "Failed to get analytics breakdowns" });
    }
  });

  // Public activation link tracking (no auth required)
  app.get("/api/public/track/:shortCode", async (req: any, res) => {
    try {
      const { shortCode } = req.params;
      logInfo(`Tracking link lookup for shortCode: ${shortCode}`, "activation-link");
      const link = await storage.getActivationLinkByShortCode(shortCode);
      
      if (!link) {
        logInfo(`Link not found for shortCode: ${shortCode}`, "activation-link");
        return res.status(404).json({ message: "Link not found", shortCode });
      }
      
      if (link.status !== "active") {
        logInfo(`Link found but status is: ${link.status} for shortCode: ${shortCode}`, "activation-link");
        return res.status(404).json({ message: "Link is not active", status: link.status });
      }

      // Create visitor hash from IP + User-Agent
      const ip = req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      const visitorHash = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex").substring(0, 32);
      const ipHash = createHash("sha256").update(String(ip)).digest("hex").substring(0, 32);

      // Record the click
      await storage.createActivationLinkClick({
        activationLinkId: link.id,
        visitorHash,
        ipHash,
        userAgent: userAgent.substring(0, 500),
        referrer: (req.headers.referer || req.headers.referrer || "").substring(0, 1000),
        queryParams: req.query as Record<string, string>,
      });

      // Increment click count
      await storage.incrementActivationLinkClicks(link.id);

      // Build destination URL with UTM params
      const event = await storage.getEvent(link.organizationId, link.eventId);
      let baseUrl = link.baseUrl;
      
      if (!baseUrl && event) {
        // Default to public registration page
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host;
        baseUrl = `${protocol}://${host}/event/${event.publicSlug}/register`;
      }

      if (!baseUrl) {
        return res.status(404).json({ message: "No destination configured" });
      }

      // Append UTM parameters
      const url = new URL(baseUrl);
      url.searchParams.set("utm_source", link.utmSource);
      url.searchParams.set("utm_medium", link.utmMedium);
      url.searchParams.set("utm_campaign", link.utmCampaign);
      if (link.utmContent) url.searchParams.set("utm_content", link.utmContent);
      if (link.utmTerm) url.searchParams.set("utm_term", link.utmTerm);
      
      // Add activation link ID for attribution tracking
      url.searchParams.set("al_id", link.id);
      
      // Add custom params
      if (link.customParams) {
        for (const [key, value] of Object.entries(link.customParams)) {
          url.searchParams.set(key, value);
        }
      }

      res.redirect(302, url.toString());
    } catch (error) {
      logError("Error tracking activation link:", error);
      res.status(500).json({ message: "Failed to process link" });
    }
  });

  // Speaker routes
  app.get("/api/speakers", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const speakers = await storage.getSpeakers(organizationId, eventId);
      res.json(speakers);
    } catch (error) {
      logError("Error fetching speakers:", error);
      res.status(500).json({ message: "Failed to fetch speakers" });
    }
  });

  app.post("/api/speakers", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertSpeakerSchema.parse({ ...req.body, organizationId });
      const speaker = await storage.createSpeaker(data);
      res.status(201).json(speaker);
    } catch (error) {
      logError("Error creating speaker:", error);
      res.status(400).json({ message: "Invalid speaker data" });
    }
  });

  app.patch("/api/speakers/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const speaker = await storage.updateSpeaker(organizationId, req.params.id, req.body);
      if (!speaker) {
        return res.status(404).json({ message: "Speaker not found" });
      }
      res.json(speaker);
    } catch (error) {
      logError("Error updating speaker:", error);
      res.status(400).json({ message: "Failed to update speaker" });
    }
  });

  app.delete("/api/speakers/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSpeaker(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting speaker:", error);
      res.status(500).json({ message: "Failed to delete speaker" });
    }
  });

  // Event Sponsor routes
  app.get("/api/events/:eventId/sponsors", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { tier, limit, activeOnly } = req.query;
      const options: { tier?: string; limit?: number; activeOnly?: boolean } = {};
      if (tier) options.tier = tier as string;
      if (limit) options.limit = parseInt(limit as string, 10);
      if (activeOnly === 'true') options.activeOnly = true;
      const sponsors = await storage.getEventSponsors(organizationId, req.params.eventId, options);
      res.json(sponsors);
    } catch (error) {
      logError("Error fetching event sponsors:", error);
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  app.post("/api/events/:eventId/sponsors", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const data = insertEventSponsorSchema.parse({ ...req.body, organizationId, eventId });
      
      // Create the sponsor first
      const sponsor = await storage.createEventSponsor(data);
      
      // Auto-create a base invite code for the sponsor if they have registration seats
      if (data.registrationSeats && data.registrationSeats > 0) {
        const sponsorCode = `SPONSOR-${sponsor.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`;
        const inviteCode = await storage.createInviteCode({
          organizationId,
          eventId,
          code: sponsorCode,
          quantity: data.registrationSeats,
          sponsorId: sponsor.id,
          isActive: true,
        });
        
        // Update sponsor with the base invite code ID
        await storage.updateEventSponsor(organizationId, sponsor.id, {
          baseInviteCodeId: inviteCode.id,
        });
        
        // Return sponsor with updated baseInviteCodeId
        const updatedSponsor = await storage.getEventSponsor(organizationId, sponsor.id);
        res.status(201).json(updatedSponsor);
      } else {
        res.status(201).json(sponsor);
      }
    } catch (error) {
      logError("Error creating event sponsor:", error);
      res.status(400).json({ message: "Invalid sponsor data" });
    }
  });

  app.patch("/api/events/:eventId/sponsors/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const sponsorId = req.params.id;
      
      // Get current sponsor to check if invite code needs to be created
      const currentSponsor = await storage.getEventSponsor(organizationId, sponsorId);
      if (!currentSponsor) {
        return res.status(404).json({ message: "Sponsor not found" });
      }
      
      // Update the sponsor
      const sponsor = await storage.updateEventSponsor(organizationId, sponsorId, req.body);
      if (!sponsor) {
        return res.status(404).json({ message: "Sponsor not found" });
      }
      
      // Auto-create invite code if registrationSeats added and no base invite code exists
      const newSeats = req.body.registrationSeats;
      if (newSeats && newSeats > 0 && !currentSponsor.baseInviteCodeId) {
        const sponsorCode = `SPONSOR-${sponsor.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${Date.now().toString(36).toUpperCase()}`;
        const inviteCode = await storage.createInviteCode({
          organizationId,
          eventId,
          code: sponsorCode,
          quantity: newSeats,
          sponsorId: sponsor.id,
          isActive: true,
        });
        
        // Update sponsor with the base invite code ID
        await storage.updateEventSponsor(organizationId, sponsor.id, {
          baseInviteCodeId: inviteCode.id,
        });
        
        // Return sponsor with updated baseInviteCodeId
        const updatedSponsor = await storage.getEventSponsor(organizationId, sponsor.id);
        return res.json(updatedSponsor);
      }
      
      // Update invite code quantity if it exists and seats changed
      if (currentSponsor.baseInviteCodeId && newSeats !== undefined) {
        await storage.updateInviteCode(organizationId, currentSponsor.baseInviteCodeId, {
          quantity: newSeats,
        });
      }
      
      res.json(sponsor);
    } catch (error) {
      logError("Error updating event sponsor:", error);
      res.status(400).json({ message: "Failed to update sponsor" });
    }
  });

  app.delete("/api/events/:eventId/sponsors/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteEventSponsor(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting event sponsor:", error);
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // Sponsor Contacts routes (admin)
  app.get("/api/sponsors/:sponsorId/contacts", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const contacts = await storage.getSponsorContacts(organizationId, req.params.sponsorId);
      res.json(contacts);
    } catch (error) {
      logError("Error fetching sponsor contacts:", error);
      res.status(500).json({ message: "Failed to fetch sponsor contacts" });
    }
  });

  app.get("/api/sponsors/:sponsorId/contacts/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const contact = await storage.getSponsorContact(organizationId, req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Sponsor contact not found" });
      }
      res.json(contact);
    } catch (error) {
      logError("Error fetching sponsor contact:", error);
      res.status(500).json({ message: "Failed to fetch sponsor contact" });
    }
  });

  app.post("/api/sponsors/:sponsorId/contacts", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertSponsorContactSchema.parse({ ...req.body, organizationId, sponsorId: req.params.sponsorId });
      const contact = await storage.createSponsorContact(data);
      res.status(201).json(contact);
    } catch (error) {
      logError("Error creating sponsor contact:", error);
      res.status(400).json({ message: "Invalid sponsor contact data" });
    }
  });

  app.patch("/api/sponsors/:sponsorId/contacts/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const contact = await storage.updateSponsorContact(organizationId, req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ message: "Sponsor contact not found" });
      }
      res.json(contact);
    } catch (error) {
      logError("Error updating sponsor contact:", error);
      res.status(400).json({ message: "Failed to update sponsor contact" });
    }
  });

  app.delete("/api/sponsors/:sponsorId/contacts/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSponsorContact(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting sponsor contact:", error);
      res.status(500).json({ message: "Failed to delete sponsor contact" });
    }
  });

  // Sponsor Tasks routes (admin, event-scoped)
  app.get("/api/events/:eventId/sponsor-tasks", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const tasks = await storage.getSponsorTasks(organizationId, req.params.eventId);
      res.json(tasks);
    } catch (error) {
      logError("Error fetching sponsor tasks:", error);
      res.status(500).json({ message: "Failed to fetch sponsor tasks" });
    }
  });

  app.get("/api/sponsor-tasks/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const task = await storage.getSponsorTask(organizationId, req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Sponsor task not found" });
      }
      res.json(task);
    } catch (error) {
      logError("Error fetching sponsor task:", error);
      res.status(500).json({ message: "Failed to fetch sponsor task" });
    }
  });

  app.post("/api/events/:eventId/sponsor-tasks", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertSponsorTaskSchema.parse({ ...req.body, organizationId, eventId: req.params.eventId });
      const task = await storage.createSponsorTask(data);
      res.status(201).json(task);
    } catch (error) {
      logError("Error creating sponsor task:", error);
      res.status(400).json({ message: "Invalid sponsor task data" });
    }
  });

  app.patch("/api/sponsor-tasks/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const task = await storage.updateSponsorTask(organizationId, req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Sponsor task not found" });
      }
      res.json(task);
    } catch (error) {
      logError("Error updating sponsor task:", error);
      res.status(400).json({ message: "Failed to update sponsor task" });
    }
  });

  app.delete("/api/sponsor-tasks/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSponsorTask(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting sponsor task:", error);
      res.status(500).json({ message: "Failed to delete sponsor task" });
    }
  });

  // Sponsor Task Completions routes (admin)
  app.get("/api/sponsors/:sponsorId/task-completions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const completions = await storage.getSponsorTaskCompletions(organizationId, req.params.sponsorId);
      res.json(completions);
    } catch (error) {
      logError("Error fetching sponsor task completions:", error);
      res.status(500).json({ message: "Failed to fetch task completions" });
    }
  });

  // Event-scoped task completions (for admin task management page)
  app.get("/api/events/:eventId/sponsor-task-completions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      // Get all sponsors for this event
      const sponsors = await storage.getEventSponsors(organizationId, eventId, {});
      
      // Get all task completions for each sponsor
      const allCompletions = [];
      for (const sponsor of sponsors) {
        const completions = await storage.getSponsorTaskCompletions(organizationId, sponsor.id);
        allCompletions.push(...completions.map(c => ({ ...c, sponsorName: sponsor.name })));
      }
      
      res.json(allCompletions);
    } catch (error) {
      logError("Error fetching event sponsor task completions:", error);
      res.status(500).json({ message: "Failed to fetch task completions" });
    }
  });

  app.patch("/api/task-completions/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { sendRejectionEmail, ...updateData } = req.body;
      
      const completion = await storage.updateSponsorTaskCompletion(organizationId, req.params.id, updateData);
      if (!completion) {
        return res.status(404).json({ message: "Task completion not found" });
      }
      
      // When a logo_upload task is approved, update the sponsor's logoUrl
      if (updateData.status === "approved") {
        try {
          const task = await storage.getSponsorTask(organizationId, completion.taskId);
          if (task && task.taskType === "logo_upload") {
            const submittedData = completion.submittedData as Record<string, unknown> | undefined;
            const logoUrl = submittedData?.logoUrl as string | undefined;
            if (logoUrl) {
              await storage.updateEventSponsor(organizationId, completion.sponsorId, { logoUrl });
              logInfo(`Updated sponsor ${completion.sponsorId} logoUrl from approved task`, 'Sponsors');
            }
          }
        } catch (logoError) {
          logError("Error updating sponsor logo from approved task:", logoError);
          // Don't fail the request if logo update fails
        }
      }
      
      // Send rejection email if requested and status is rejected
      if (sendRejectionEmail && updateData.status === "rejected") {
        try {
          // Get sponsor details
          const sponsor = await storage.getEventSponsor(organizationId, completion.sponsorId);
          if (sponsor && sponsor.contactEmail) {
            // Get task details
            const task = await storage.getSponsorTask(organizationId, completion.taskId);
            // Get event details
            const event = await storage.getEvent(organizationId, sponsor.eventId);
            
            if (task && event) {
              // Build portal URL if sponsor has access token
              let portalUrl: string | undefined;
              if (sponsor.portalAccessToken) {
                const forwardedProto = req.get('x-forwarded-proto');
                const protocol = forwardedProto || req.protocol || 'https';
                const host = req.get('host');
                portalUrl = `${protocol}://${host}/sponsor-portal?token=${sponsor.portalAccessToken}`;
              }
              
              await sendSponsorTaskRejectionEmail({
                sponsorEmail: sponsor.contactEmail,
                sponsorName: sponsor.name,
                taskName: task.name,
                eventName: event.name,
                rejectionReason: updateData.reviewNotes || '',
                portalUrl,
              });
            }
          }
        } catch (emailError) {
          logError("Error sending rejection email (continuing anyway):", emailError);
          // Don't fail the request if email fails - the rejection was still saved
        }
      }
      
      res.json(completion);
    } catch (error) {
      logError("Error updating task completion:", error);
      res.status(400).json({ message: "Failed to update task completion" });
    }
  });

  // Portal access token generation route (admin)
  app.post("/api/sponsors/:sponsorId/generate-portal-token", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const sponsorId = req.params.sponsorId;
      
      const sponsor = await storage.getEventSponsor(organizationId, sponsorId);
      if (!sponsor) {
        return res.status(404).json({ message: "Sponsor not found" });
      }
      
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await storage.updateEventSponsor(organizationId, sponsorId, {
        portalAccessToken: token,
        portalTokenExpiresAt: expiresAt,
      });
      
      res.json({ token, expiresAt });
    } catch (error) {
      logError("Error generating portal token:", error);
      res.status(500).json({ message: "Failed to generate portal token" });
    }
  });

  // Send portal access email to sponsor
  app.post("/api/sponsors/:sponsorId/send-portal-email", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const sponsorId = req.params.sponsorId;
      
      const sponsor = await storage.getEventSponsor(organizationId, sponsorId);
      if (!sponsor) {
        return res.status(404).json({ message: "Sponsor not found" });
      }
      
      if (!sponsor.portalAccessToken) {
        return res.status(400).json({ message: "No portal token exists. Generate a token first." });
      }
      
      if (!sponsor.contactEmail) {
        return res.status(400).json({ message: "No contact email set for this sponsor." });
      }
      
      // Get event details for the email
      const event = await storage.getEvent(organizationId, sponsor.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Build portal URL - handle both direct and proxied requests (TLS termination)
      const forwardedProto = req.get('x-forwarded-proto');
      const protocol = forwardedProto || req.protocol || 'https';
      const host = req.get('host') || req.headers.host;
      const baseUrl = `${protocol}://${host}`;
      const portalUrl = `${baseUrl}/sponsor-portal?token=${sponsor.portalAccessToken}`;
      
      // Build email content
      const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString("en-US", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      }) : "TBD";
      
      const emailContent = `
        <h2 style="color: #333;">Welcome to the {{event.name}} Sponsor Portal</h2>
        <p>Dear {{attendee.firstName}},</p>
        <p>You have been granted access to the sponsor portal for <strong>{{event.name}}</strong>${eventDate !== "TBD" ? ` on ${eventDate}` : ""}.</p>
        <p>Through the portal, you can:</p>
        <ul>
          <li>Update your company profile and logo</li>
          <li>Complete assigned tasks</li>
          <li>Register team members for the event</li>
          <li>Send invite emails to your team</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="${portalUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Access Your Sponsor Portal</a>
        </p>
        <p style="color: #666; font-size: 14px;">This link is valid for 30 days. If it expires, please contact the event organizer for a new access link.</p>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${portalUrl}" style="color: #0066cc;">${portalUrl}</a></p>
      `;
      
      // Send the email using Resend with proper CampaignEmailParams format
      const emailResult = await sendCampaignEmails({
        subject: `Your Sponsor Portal Access for ${event.name}`,
        content: emailContent,
        recipients: [{
          email: sponsor.contactEmail,
          firstName: sponsor.contactName || sponsor.name,
          lastName: "",
        }],
        eventContext: {
          name: event.name,
          date: eventDate,
          location: event.location || undefined,
        },
        organizationContext: {
          name: sponsor.name,
        },
        organizationId: sponsor.organizationId,
        baseUrl,
        enableTracking: false,
      });
      
      if (emailResult.totalFailed > 0) {
        return res.status(500).json({ message: "Failed to send portal email" });
      }
      
      res.json({ success: true, message: "Portal email sent successfully" });
    } catch (error) {
      logError("Error sending portal email:", error);
      res.status(500).json({ message: "Failed to send portal email" });
    }
  });

  // Public sponsor portal routes (no auth required, token-based)
  app.get("/api/sponsor-portal/auth", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      res.json(sponsor);
    } catch (error) {
      logError("Error validating sponsor portal token:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });

  app.get("/api/sponsor-portal/tasks", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const allTasks = await storage.getSponsorTasks(sponsor.organizationId, sponsor.eventId);
      const sponsorTasks = allTasks.filter(task => {
        if (!task.assignedTiers || task.assignedTiers.length === 0) return true;
        return task.assignedTiers.includes(sponsor.tier);
      });
      
      const completions = await storage.getSponsorTaskCompletions(sponsor.organizationId, sponsor.id);
      
      res.json({ tasks: sponsorTasks, completions });
    } catch (error) {
      logError("Error fetching sponsor portal tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.patch("/api/sponsor-portal/profile", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const allowedFields = ['bio', 'socialLinks', 'contactEmail', 'contactName', 'contactPhone', 'website'];
      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      const updated = await storage.updateEventSponsor(sponsor.organizationId, sponsor.id, updateData);
      res.json(updated);
    } catch (error) {
      logError("Error updating sponsor portal profile:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/sponsor-portal/task-completions/:taskId", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const taskId = req.params.taskId;
      const task = await storage.getSponsorTask(sponsor.organizationId, taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const completionData = insertSponsorTaskCompletionSchema.parse({
        ...req.body,
        organizationId: sponsor.organizationId,
        taskId,
        sponsorId: sponsor.id,
        status: 'submitted',
        submittedAt: new Date(),
      });
      
      const completion = await storage.upsertSponsorTaskCompletion(completionData);
      res.status(201).json(completion);
    } catch (error) {
      logError("Error submitting task completion:", error);
      res.status(400).json({ message: "Failed to submit task completion" });
    }
  });

  // Initialize object storage service for sponsor portal and content routes
  const objectStorageService = new ObjectStorageService();

  // Sponsor portal file upload routes (token-based auth)
  app.post("/api/sponsor-portal/assets/upload", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadUrl });
    } catch (error) {
      logError("Error getting portal upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post("/api/sponsor-portal/assets", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const { fileName, mimeType, byteSize, uploadUrl } = req.body;
      
      if (!fileName || !uploadUrl) {
        return res.status(400).json({ message: "fileName and uploadUrl are required" });
      }
      
      // Use the same method as the main content/assets route to normalize path and set ACL
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadUrl, {
        owner: `sponsor:${sponsor.id}`,
        visibility: "public",
      });
      
      // Construct public URL the same way as main route
      const publicUrl = `${req.protocol}://${req.get("host")}${objectPath}`;
      
      // Create content asset record for the organization
      // Note: uploadedBy is null for portal uploads since sponsors don't have user accounts
      const asset = await storage.createContentAsset({
        organizationId: sponsor.organizationId,
        fileName,
        mimeType: mimeType || 'application/octet-stream',
        byteSize: byteSize || 0,
        objectPath,
        publicUrl,
        uploadedBy: null,
      });
      
      res.status(201).json(asset);
    } catch (error) {
      logError("Error creating portal content asset:", error);
      res.status(400).json({ message: "Failed to create content asset" });
    }
  });

  // Sponsor portal team members routes
  app.get("/api/sponsor-portal/team-members", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      if (!sponsor.baseInviteCodeId) {
        return res.json({ teamMembers: [] });
      }
      
      const teamMembers = await storage.getAttendeesByInviteCode(sponsor.organizationId, sponsor.baseInviteCodeId);
      res.json({ teamMembers });
    } catch (error) {
      logError("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/sponsor-portal/team-members", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const seatsUsed = sponsor.seatsUsed || 0;
      const totalSeats = sponsor.registrationSeats || 0;
      
      if (seatsUsed >= totalSeats) {
        return res.status(400).json({ message: "No seats available. All registration seats have been used." });
      }
      
      if (!sponsor.baseInviteCodeId) {
        return res.status(400).json({ message: "Sponsor does not have a registration invite code configured" });
      }
      
      const { firstName, lastName, email, jobTitle } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      const existingAttendee = await storage.getAttendeeByEventAndEmail(sponsor.eventId, email);
      if (existingAttendee) {
        return res.status(400).json({ message: "An attendee with this email is already registered for this event" });
      }
      
      const checkInCode = `${sponsor.eventId.slice(0, 4).toUpperCase()}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`.slice(0, 12);
      
      const attendeeData = {
        organizationId: sponsor.organizationId,
        eventId: sponsor.eventId,
        firstName,
        lastName,
        email,
        jobTitle: jobTitle || null,
        company: sponsor.name,
        inviteCodeId: sponsor.baseInviteCodeId,
        registrationStatus: "pending",
        checkInCode,
      };
      
      const newAttendee = await storage.createAttendee(attendeeData);
      
      await storage.updateEventSponsor(sponsor.organizationId, sponsor.id, {
        seatsUsed: seatsUsed + 1,
      });
      
      res.status(201).json(newAttendee);
    } catch (error) {
      logError("Error creating team member:", error);
      res.status(400).json({ message: "Failed to create team member" });
    }
  });

  // Send invite email to a team member (sponsor portal)
  app.post("/api/sponsor-portal/team-members/:attendeeId/send-invite", async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const sponsor = await storage.getEventSponsorByToken(token);
      if (!sponsor) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      const attendeeId = req.params.attendeeId;
      const attendee = await storage.getAttendee(sponsor.organizationId, attendeeId);
      
      if (!attendee) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      // Verify this attendee belongs to this sponsor's invite code
      if (attendee.inviteCodeId !== sponsor.baseInviteCodeId) {
        return res.status(403).json({ message: "This team member is not associated with your sponsor account" });
      }
      
      // Get event for merge tags
      const event = await storage.getEvent(sponsor.organizationId, sponsor.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if email service is configured
      if (!process.env.RESEND_API_KEY) {
        return res.status(400).json({ message: "Email service not configured. Please contact the event organizer." });
      }
      
      // Get organization for merge tags
      const org = await storage.getOrganization(sponsor.organizationId);
      
      // Format event date
      const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';
      
      // Compose invitation email content
      const subject = `You're Invited: ${event.name}`;
      const content = `
        <p>Hello ${attendee.firstName},</p>
        <p>You have been registered to attend <strong>${event.name}</strong> as a guest of <strong>${sponsor.name}</strong>.</p>
        ${eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : ''}
        ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
        <p><strong>Your Check-in Code:</strong> ${attendee.checkInCode || 'Will be provided at the event'}</p>
        <p>If you have any questions, please contact your sponsor representative.</p>
        <p>We look forward to seeing you there!</p>
      `;
      
      // Send the email
      const result = await sendCampaignEmails({
        subject,
        content,
        recipients: [{
          email: attendee.email,
          firstName: attendee.firstName || undefined,
          lastName: attendee.lastName || undefined,
          company: attendee.company || sponsor.name,
          checkInCode: attendee.checkInCode || undefined,
          attendeeId: attendee.id,
        }],
        eventContext: {
          name: event.name,
          date: eventDate,
          location: event.location || undefined,
          description: event.description || undefined,
        },
        organizationContext: {
          name: org?.name,
        },
        organizationId: sponsor.organizationId,
        enableTracking: false,
      });
      
      if (result.totalSent > 0) {
        res.json({ success: true, message: "Invitation email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send invitation email" });
      }
    } catch (error) {
      logError("Error sending team member invite:", error);
      res.status(500).json({ message: "Failed to send invitation email" });
    }
  });

  // Session routes
  app.get("/api/sessions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const sessions = await storage.getSessions(organizationId, eventId);
      res.json(sessions);
    } catch (error) {
      logError("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertSessionSchema.parse({ ...req.body, organizationId });
      const session = await storage.createSession(data);
      res.status(201).json(session);
    } catch (error) {
      logError("Error creating session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.patch("/api/sessions/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const session = await storage.updateSession(organizationId, req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      logError("Error updating session:", error);
      res.status(400).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSession(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Session Tracks routes
  app.get("/api/session-tracks", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const tracks = await storage.getSessionTracks(organizationId);
      res.json(tracks);
    } catch (error) {
      logError("Error fetching session tracks:", error);
      res.status(500).json({ message: "Failed to fetch session tracks" });
    }
  });

  app.post("/api/session-tracks", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertSessionTrackSchema.parse({ ...req.body, organizationId });
      const track = await storage.createSessionTrack(data);
      res.status(201).json(track);
    } catch (error) {
      logError("Error creating session track:", error);
      res.status(400).json({ message: "Invalid session track data" });
    }
  });

  app.patch("/api/session-tracks/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const updateData = insertSessionTrackSchema.partial().parse(req.body);
      const track = await storage.updateSessionTrack(organizationId, req.params.id, updateData);
      if (!track) {
        return res.status(404).json({ message: "Session track not found" });
      }
      res.json(track);
    } catch (error) {
      logError("Error updating session track:", error);
      res.status(400).json({ message: "Failed to update session track" });
    }
  });

  app.delete("/api/session-tracks/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSessionTrack(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting session track:", error);
      res.status(500).json({ message: "Failed to delete session track" });
    }
  });

  // Session Rooms routes
  app.get("/api/session-rooms", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const rooms = await storage.getSessionRooms(organizationId);
      res.json(rooms);
    } catch (error) {
      logError("Error fetching session rooms:", error);
      res.status(500).json({ message: "Failed to fetch session rooms" });
    }
  });

  app.post("/api/session-rooms", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertSessionRoomSchema.parse({ ...req.body, organizationId });
      const room = await storage.createSessionRoom(data);
      res.status(201).json(room);
    } catch (error) {
      logError("Error creating session room:", error);
      res.status(400).json({ message: "Invalid session room data" });
    }
  });

  app.patch("/api/session-rooms/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const updateData = insertSessionRoomSchema.partial().parse(req.body);
      const room = await storage.updateSessionRoom(organizationId, req.params.id, updateData);
      if (!room) {
        return res.status(404).json({ message: "Session room not found" });
      }
      res.json(room);
    } catch (error) {
      logError("Error updating session room:", error);
      res.status(400).json({ message: "Failed to update session room" });
    }
  });

  app.delete("/api/session-rooms/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSessionRoom(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting session room:", error);
      res.status(500).json({ message: "Failed to delete session room" });
    }
  });

  // Session-Speaker relationship routes
  app.get("/api/sessions/:sessionId/speakers", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const session = await storage.getSession(organizationId, req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const sessionSpeakers = await storage.getSessionSpeakersBySession(organizationId, req.params.sessionId);
      res.json(sessionSpeakers);
    } catch (error) {
      logError("Error fetching session speakers:", error);
      res.status(500).json({ message: "Failed to fetch session speakers" });
    }
  });

  app.put("/api/sessions/:sessionId/speakers", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { speakerIds } = req.body;
      if (!Array.isArray(speakerIds)) {
        return res.status(400).json({ message: "speakerIds must be an array" });
      }
      await storage.setSessionSpeakers(organizationId, req.params.sessionId, speakerIds);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message?.includes("not found") || error.message?.includes("do not belong")) {
        return res.status(404).json({ message: error.message });
      }
      logError("Error setting session speakers:", error);
      res.status(500).json({ message: "Failed to set session speakers" });
    }
  });

  app.get("/api/speakers/:speakerId/sessions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const speaker = await storage.getSpeaker(organizationId, req.params.speakerId);
      if (!speaker) {
        return res.status(404).json({ message: "Speaker not found" });
      }
      const speakerSessions = await storage.getSessionSpeakersBySpeaker(organizationId, req.params.speakerId);
      res.json(speakerSessions);
    } catch (error) {
      logError("Error fetching speaker sessions:", error);
      res.status(500).json({ message: "Failed to fetch speaker sessions" });
    }
  });

  app.put("/api/speakers/:speakerId/sessions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { sessionIds } = req.body;
      if (!Array.isArray(sessionIds)) {
        return res.status(400).json({ message: "sessionIds must be an array" });
      }
      await storage.setSpeakerSessions(organizationId, req.params.speakerId, sessionIds);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message?.includes("not found") || error.message?.includes("do not belong")) {
        return res.status(404).json({ message: error.message });
      }
      logError("Error setting speaker sessions:", error);
      res.status(500).json({ message: "Failed to set speaker sessions" });
    }
  });

  // Content routes
  app.get("/api/content", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const sessionId = req.query.sessionId as string | undefined;
      const content = await storage.getContentItems(organizationId, eventId, sessionId);
      res.json(content);
    } catch (error) {
      logError("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertContentItemSchema.parse({ ...req.body, organizationId });
      const content = await storage.createContentItem(data);
      res.status(201).json(content);
    } catch (error) {
      logError("Error creating content:", error);
      res.status(400).json({ message: "Invalid content data" });
    }
  });

  app.patch("/api/content/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const content = await storage.updateContentItem(organizationId, req.params.id, req.body);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      logError("Error updating content:", error);
      res.status(400).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/content/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteContentItem(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Budget routes
  app.get("/api/budget", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const budget = await storage.getBudgetItems(organizationId, eventId);
      res.json(budget);
    } catch (error) {
      logError("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });

  app.post("/api/budget", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      // Convert empty categoryId to null to avoid FK violation
      const body = { ...req.body };
      if (body.categoryId === "") {
        body.categoryId = null;
      }
      const data = insertBudgetItemSchema.parse({ ...body, organizationId });
      const budget = await storage.createBudgetItem(data);
      res.status(201).json(budget);
    } catch (error) {
      logError("Error creating budget item:", error);
      res.status(400).json({ message: "Invalid budget data" });
    }
  });

  app.patch("/api/budget/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      // Convert empty categoryId to null to avoid FK violation
      const body = { ...req.body };
      if (body.categoryId === "") {
        body.categoryId = null;
      }
      const budget = await storage.updateBudgetItem(organizationId, req.params.id, body);
      if (!budget) {
        return res.status(404).json({ message: "Budget item not found" });
      }
      res.json(budget);
    } catch (error) {
      logError("Error updating budget item:", error);
      res.status(400).json({ message: "Failed to update budget item" });
    }
  });

  app.delete("/api/budget/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteBudgetItem(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting budget item:", error);
      res.status(500).json({ message: "Failed to delete budget item" });
    }
  });

  // Budget Categories routes (org-scoped)
  app.get("/api/budget-categories", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const categories = await storage.getBudgetCategories(organizationId);
      res.json(categories);
    } catch (error) {
      logError("Error fetching budget categories:", error);
      res.status(500).json({ message: "Failed to fetch budget categories" });
    }
  });

  app.post("/api/budget-categories", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertBudgetCategorySchema.parse({ ...req.body, organizationId });
      const category = await storage.createBudgetCategory(data);
      res.status(201).json(category);
    } catch (error) {
      logError("Error creating budget category:", error);
      res.status(400).json({ message: "Invalid budget category data" });
    }
  });

  app.patch("/api/budget-categories/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const category = await storage.updateBudgetCategory(organizationId, req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ message: "Budget category not found" });
      }
      res.json(category);
    } catch (error) {
      logError("Error updating budget category:", error);
      res.status(400).json({ message: "Failed to update budget category" });
    }
  });

  app.delete("/api/budget-categories/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteBudgetCategory(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting budget category:", error);
      res.status(500).json({ message: "Failed to delete budget category" });
    }
  });

  // Budget Offsets routes (event-scoped)
  app.get("/api/budget-offsets", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const offsets = await storage.getBudgetOffsets(organizationId, eventId);
      res.json(offsets);
    } catch (error) {
      logError("Error fetching budget offsets:", error);
      res.status(500).json({ message: "Failed to fetch budget offsets" });
    }
  });

  app.post("/api/budget-offsets", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertBudgetOffsetSchema.parse({ ...req.body, organizationId });
      const offset = await storage.createBudgetOffset(data);
      res.status(201).json(offset);
    } catch (error) {
      logError("Error creating budget offset:", error);
      res.status(400).json({ message: "Invalid budget offset data" });
    }
  });

  app.patch("/api/budget-offsets/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const offset = await storage.updateBudgetOffset(organizationId, req.params.id, req.body);
      if (!offset) {
        return res.status(404).json({ message: "Budget offset not found" });
      }
      res.json(offset);
    } catch (error) {
      logError("Error updating budget offset:", error);
      res.status(400).json({ message: "Failed to update budget offset" });
    }
  });

  app.delete("/api/budget-offsets/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteBudgetOffset(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting budget offset:", error);
      res.status(500).json({ message: "Failed to delete budget offset" });
    }
  });

  // Event Budget Settings routes
  app.get("/api/events/:eventId/budget-settings", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const event = await storage.getEvent(organizationId, req.params.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      const settings = await storage.getEventBudgetSettings(req.params.eventId);
      res.json(settings || { eventId: req.params.eventId, budgetCap: null });
    } catch (error) {
      logError("Error fetching event budget settings:", error);
      res.status(500).json({ message: "Failed to fetch event budget settings" });
    }
  });

  app.put("/api/events/:eventId/budget-settings", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const event = await storage.getEvent(organizationId, req.params.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      const { budgetCap } = req.body;
      const settings = await storage.upsertEventBudgetSettings({
        eventId: req.params.eventId,
        budgetCap: budgetCap ?? null,
      });
      res.json(settings);
    } catch (error) {
      logError("Error updating event budget settings:", error);
      res.status(400).json({ message: "Failed to update event budget settings" });
    }
  });

  // Budget Payments routes (event-scoped)
  app.get("/api/budget-payments", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const payments = await storage.getBudgetPayments(organizationId, eventId);
      res.json(payments);
    } catch (error) {
      logError("Error fetching budget payments:", error);
      res.status(500).json({ message: "Failed to fetch budget payments" });
    }
  });

  app.post("/api/budget-payments", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertBudgetPaymentSchema.parse({ ...req.body, organizationId });
      const payment = await storage.createBudgetPayment(data);
      res.status(201).json(payment);
    } catch (error) {
      logError("Error creating budget payment:", error);
      res.status(400).json({ message: "Invalid budget payment data" });
    }
  });

  app.patch("/api/budget-payments/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const payment = await storage.updateBudgetPayment(organizationId, req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ message: "Budget payment not found" });
      }
      res.json(payment);
    } catch (error) {
      logError("Error updating budget payment:", error);
      res.status(400).json({ message: "Failed to update budget payment" });
    }
  });

  app.delete("/api/budget-payments/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteBudgetPayment(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting budget payment:", error);
      res.status(500).json({ message: "Failed to delete budget payment" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const vendors = await storage.getVendors(organizationId);
      res.json(vendors);
    } catch (error) {
      logError("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const vendor = await storage.getVendor(organizationId, req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      logError("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertVendorSchema.parse({ ...req.body, organizationId });
      
      let budgetItemId: string | undefined;
      
      // If vendor is assigned to an event, create a budget item automatically
      if (data.eventId) {
        // Get the category name for the budget item
        let categoryName = "Vendor Services";
        if (data.categoryId) {
          const category = await storage.getBudgetCategory(organizationId, data.categoryId);
          if (category) {
            categoryName = category.name;
          }
        }
        
        // Create budget item with vendor cost as estimate (forecast only set when approved)
        const budgetItem = await storage.createBudgetItem({
          organizationId,
          eventId: data.eventId,
          category: categoryName,
          categoryId: data.categoryId || null,
          description: `Vendor: ${data.name}`,
          estimateAmount: data.cost || "0",
          forecastAmount: data.approvalStatus === "approved" ? (data.cost || "0") : "0",
          status: "pending",
        });
        budgetItemId = budgetItem.id;
      }
      
      const vendor = await storage.createVendor({ 
        ...data, 
        budgetItemId: budgetItemId || null 
      });
      res.status(201).json(vendor);
    } catch (error) {
      logError("Error creating vendor:", error);
      res.status(400).json({ message: "Invalid vendor data" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      // Get current vendor state before update
      const existingVendor = await storage.getVendor(organizationId, req.params.id);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      const updateData = { ...req.body };
      const newEventId = updateData.eventId;
      const newApprovalStatus = updateData.approvalStatus;
      const newCost = updateData.cost;
      
      // Handle event assignment - create budget item if event is being set for the first time
      if (newEventId && !existingVendor.eventId && !existingVendor.budgetItemId) {
        // Get the category name for the budget item
        let categoryName = "Vendor Services";
        const categoryId = updateData.categoryId || existingVendor.categoryId;
        if (categoryId) {
          const category = await storage.getBudgetCategory(organizationId, categoryId);
          if (category) {
            categoryName = category.name;
          }
        }
        
        // Determine the cost to use
        const costToUse = newCost || existingVendor.cost || "0";
        const effectiveApprovalStatus = newApprovalStatus || existingVendor.approvalStatus;
        
        // Create budget item
        const budgetItem = await storage.createBudgetItem({
          organizationId,
          eventId: newEventId,
          category: categoryName,
          categoryId: categoryId || null,
          description: `Vendor: ${updateData.name || existingVendor.name}`,
          estimateAmount: costToUse,
          forecastAmount: effectiveApprovalStatus === "approved" ? costToUse : "0",
          status: "pending",
        });
        updateData.budgetItemId = budgetItem.id;
      }
      
      // Handle approval status change to "approved" - update forecast amount
      if (newApprovalStatus === "approved" && existingVendor.approvalStatus !== "approved") {
        const budgetItemId = updateData.budgetItemId || existingVendor.budgetItemId;
        if (budgetItemId) {
          const costToUse = newCost || existingVendor.cost || "0";
          await storage.updateBudgetItem(organizationId, budgetItemId, {
            forecastAmount: costToUse,
          });
        }
      }
      
      // Handle cost change when already approved - update forecast amount
      if (newCost && existingVendor.approvalStatus === "approved" && !newApprovalStatus) {
        const budgetItemId = existingVendor.budgetItemId;
        if (budgetItemId) {
          await storage.updateBudgetItem(organizationId, budgetItemId, {
            forecastAmount: newCost,
          });
        }
      }
      
      const vendor = await storage.updateVendor(organizationId, req.params.id, updateData);
      res.json(vendor);
    } catch (error) {
      logError("Error updating vendor:", error);
      res.status(400).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteVendor(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Milestone routes
  app.get("/api/milestones", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const milestones = await storage.getMilestones(organizationId, eventId);
      res.json(milestones);
    } catch (error) {
      logError("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/milestones", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertMilestoneSchema.parse({ ...req.body, organizationId });
      const milestone = await storage.createMilestone(data);
      res.status(201).json(milestone);
    } catch (error) {
      logError("Error creating milestone:", error);
      res.status(400).json({ message: "Invalid milestone data" });
    }
  });

  app.patch("/api/milestones/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const milestone = await storage.updateMilestone(organizationId, req.params.id, req.body);
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      logError("Error updating milestone:", error);
      res.status(400).json({ message: "Failed to update milestone" });
    }
  });

  app.delete("/api/milestones/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteMilestone(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting milestone:", error);
      res.status(500).json({ message: "Failed to delete milestone" });
    }
  });

  // Deliverable routes
  app.get("/api/deliverables", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const deliverables = await storage.getDeliverables(organizationId, eventId);
      res.json(deliverables);
    } catch (error) {
      logError("Error fetching deliverables:", error);
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  app.post("/api/deliverables", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertDeliverableSchema.parse({ ...req.body, organizationId });
      const deliverable = await storage.createDeliverable(data);
      res.status(201).json(deliverable);
    } catch (error) {
      logError("Error creating deliverable:", error);
      res.status(400).json({ message: "Invalid deliverable data" });
    }
  });

  app.patch("/api/deliverables/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const deliverable = await storage.updateDeliverable(organizationId, req.params.id, req.body);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }
      res.json(deliverable);
    } catch (error) {
      logError("Error updating deliverable:", error);
      res.status(400).json({ message: "Failed to update deliverable" });
    }
  });

  app.delete("/api/deliverables/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteDeliverable(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting deliverable:", error);
      res.status(500).json({ message: "Failed to delete deliverable" });
    }
  });

  // Email campaign routes
  app.get("/api/emails", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const emails = await storage.getEmailCampaigns(organizationId, eventId);
      res.json(emails);
    } catch (error) {
      logError("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch email campaigns" });
    }
  });

  app.post("/api/emails", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertEmailCampaignSchema.parse({ ...req.body, organizationId, createdBy: userId });
      const email = await storage.createEmailCampaign(data);
      res.status(201).json(email);
    } catch (error) {
      logError("Error creating email campaign:", error);
      res.status(400).json({ message: "Invalid email campaign data" });
    }
  });

  app.patch("/api/emails/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      // Convert scheduledAt string to Date if present
      const updateData = { ...req.body };
      if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }
      const email = await storage.updateEmailCampaign(organizationId, req.params.id, updateData);
      if (!email) {
        return res.status(404).json({ message: "Email campaign not found" });
      }
      res.json(email);
    } catch (error) {
      logError("Error updating email campaign:", error);
      res.status(400).json({ message: "Failed to update email campaign" });
    }
  });

  app.delete("/api/emails/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteEmailCampaign(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting email campaign:", error);
      res.status(500).json({ message: "Failed to delete email campaign" });
    }
  });

  // Send email campaign with merge tag replacement
  app.post("/api/emails/:id/send", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      // Get the email campaign
      const campaigns = await storage.getEmailCampaigns(organizationId);
      const campaign = campaigns.find(c => c.id === req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Email campaign not found" });
      }

      // Get event details for merge tags
      const event = await storage.getEvent(organizationId, campaign.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get organization details for merge tags
      const org = await storage.getOrganization(organizationId);

      // Get recipients based on recipientType
      let attendees = await storage.getAttendees(organizationId, campaign.eventId);
      
      // Filter by recipientType if needed
      if (campaign.recipientType && campaign.recipientType !== "all") {
        attendees = attendees.filter(a => a.attendeeType === campaign.recipientType);
      }

      if (attendees.length === 0) {
        return res.status(400).json({ message: "No recipients found for this campaign" });
      }

      // Check if email service is configured
      if (!process.env.RESEND_API_KEY) {
        return res.status(400).json({ message: "Email service not configured. Please add RESEND_API_KEY to enable sending." });
      }

      // Format event date for merge tags
      const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';

      // Generate calendar links for merge tag
      const calendarLinksHtml = event.startDate ? generateCalendarLinksHtml({
        title: event.name,
        description: event.description || '',
        location: event.location || '',
        startDate: event.startDate,
        endDate: event.endDate || undefined,
      }) : '';

      // Send emails with merge tag replacement and tracking
      const result = await sendCampaignEmails({
        subject: campaign.subject,
        content: campaign.content,
        recipients: attendees.map(a => ({
          email: a.email,
          firstName: a.firstName || undefined,
          lastName: a.lastName || undefined,
          company: a.company || undefined,
          checkInCode: a.checkInCode || undefined,
          attendeeId: a.id,
        })),
        eventContext: {
          name: event.name,
          date: eventDate,
          location: event.location || undefined,
          description: event.description || undefined,
          addToCalendar: calendarLinksHtml,
        },
        organizationContext: {
          name: org?.name,
        },
        organizationId,
        campaignId: campaign.id,
        enableTracking: true,
        styles: campaign.styles as any || undefined,
      });

      // Update campaign status to sent
      await storage.updateEmailCampaign(organizationId, campaign.id, {
        status: "sent",
        sentAt: new Date(),
      });

      // If this is an invite email campaign, update attendee statuses to "invited" (only for successful sends)
      if (campaign.isInviteEmail && result.totalSent > 0) {
        // Get set of failed emails to skip them
        const failedEmails = new Set(result.errors.map(e => e.email));
        for (const attendee of attendees) {
          // Only update status if email was successfully sent (not in failed list and not suppressed)
          if (!failedEmails.has(attendee.email)) {
            const suppression = await storage.getEmailSuppression(organizationId, attendee.email);
            if (!suppression) {
              await storage.updateAttendee(organizationId, attendee.id, {
                registrationStatus: "invited",
              });
            }
          }
        }
      }

      res.json({
        message: `Campaign sent successfully`,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        totalSkipped: result.totalSkipped,
        messageIds: result.messageIds,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      logError("Error sending email campaign:", error);
      res.status(500).json({ message: "Failed to send email campaign" });
    }
  });

  // Social post routes
  app.get("/api/social", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const posts = await storage.getSocialPosts(organizationId, eventId);
      res.json(posts);
    } catch (error) {
      logError("Error fetching social posts:", error);
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  app.post("/api/social", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { status, platform, content } = req.body;
      
      if (status === 'published' && platform === 'linkedin') {
        // Support connectionId to specify which LinkedIn connection to use
        const connectionId = req.body.connectionId;
        let connection;
        
        if (connectionId) {
          // Use specific connection (personal or organization)
          const connections = await storage.getSocialConnections(userId);
          connection = connections.find(c => c.id === connectionId && c.platform === 'linkedin');
        } else {
          // Fall back to personal connection
          connection = await storage.getSocialConnectionByPlatform(userId, 'linkedin');
        }
        
        if (!connection || !connection.accessToken || !connection.isActive) {
          return res.status(400).json({ 
            message: "LinkedIn account not connected. Please connect your LinkedIn account first." 
          });
        }
        
        if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
          return res.status(400).json({ 
            message: "LinkedIn access token has expired. Please reconnect your LinkedIn account." 
          });
        }
        
        let accessToken: string;
        try {
          accessToken = decrypt(connection.accessToken);
        } catch (error) {
          logError("Error decrypting LinkedIn access token:", error);
          return res.status(500).json({ message: "Failed to decrypt access token" });
        }
        
        // Use organization URN for org connections, person URN for personal
        const authorUrn = connection.connectionType === 'organization' && connection.organizationUrn
          ? connection.organizationUrn
          : `urn:li:person:${connection.accountId}`;
        
        const linkedinPostBody = {
          author: authorUrn,
          commentary: content,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
        };
        
        const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202412',
          },
          body: JSON.stringify(linkedinPostBody),
        });
        
        if (!postResponse.ok) {
          const errorData = await postResponse.text();
          let errorMessage = 'Failed to post to LinkedIn';
          try {
            const errorJson = JSON.parse(errorData);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorData || errorMessage;
          }
          logError("LinkedIn post failed:", errorData);
          return res.status(postResponse.status).json({ 
            message: `LinkedIn posting failed: ${errorMessage}` 
          });
        }
        
        const shareUrn = postResponse.headers.get('x-restli-id') || postResponse.headers.get('X-RestLi-Id');
        logInfo(`LinkedIn post created successfully: ${shareUrn}`);
        
        const data = insertSocialPostSchema.parse({ 
          ...req.body, 
          organizationId, 
          eventId: req.body.eventId || null, 
          connectionId: connection.id,
          createdBy: userId,
          status: 'published',
        });
        const post = await storage.createSocialPost(data);
        res.status(201).json({ ...post, linkedinShareUrn: shareUrn });
      } else if (status === 'published' && platform === 'twitter') {
        // Twitter posting
        const connection = await storage.getSocialConnectionByPlatform(userId, 'twitter');
        
        if (!connection || !connection.accessToken || !connection.isActive) {
          return res.status(400).json({ 
            message: "Twitter account not connected. Please connect your Twitter account first by clicking 'Connect Account' on the Social Media page." 
          });
        }
        
        // Use helper to get access token (refreshes if expired)
        const tokenResult = await refreshTwitterAccessToken(connection, organizationId);
        if (!tokenResult) {
          return res.status(400).json({ 
            message: "Twitter access token has expired. Please reconnect your Twitter account." 
          });
        }
        const accessToken = tokenResult.accessToken;
        
        // Post tweet using Twitter API v2
        const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: content }),
        });
        
        if (!tweetResponse.ok) {
          const errorData = await tweetResponse.text();
          let errorMessage = 'Failed to post to Twitter';
          try {
            const errorJson = JSON.parse(errorData);
            errorMessage = errorJson.detail || errorJson.title || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorData || errorMessage;
          }
          logError("Twitter post failed:", errorData);
          return res.status(tweetResponse.status).json({ 
            message: `Twitter posting failed: ${errorMessage}` 
          });
        }
        
        const tweetData = await tweetResponse.json() as { data?: { id?: string } };
        const tweetId = tweetData.data?.id;
        logInfo(`Twitter post created successfully: ${tweetId}`);
        
        const data = insertSocialPostSchema.parse({ 
          ...req.body, 
          organizationId, 
          eventId: req.body.eventId || null, 
          connectionId: connection.id,
          createdBy: userId,
          status: 'published',
        });
        const post = await storage.createSocialPost(data);
        res.status(201).json({ ...post, tweetId });
      } else {
        // Draft post or unsupported platform - just save to database
        const connectionId = req.body.connectionId || null;
        const data = insertSocialPostSchema.parse({ 
          ...req.body, 
          organizationId, 
          eventId: req.body.eventId || null, 
          connectionId,
          createdBy: userId 
        });
        const post = await storage.createSocialPost(data);
        res.status(201).json(post);
      }
    } catch (error) {
      logError("Error creating social post:", error);
      res.status(400).json({ message: "Invalid social post data" });
    }
  });

  app.patch("/api/social/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { status } = req.body;
      
      const existingPost = await storage.getSocialPost(organizationId, req.params.id);
      if (!existingPost) {
        return res.status(404).json({ message: "Social post not found" });
      }
      
      if (status === 'published' && existingPost.status !== 'published' && existingPost.platform === 'linkedin') {
        // Support connectionId from request body or from the existing post
        const connectionId = req.body.connectionId || existingPost.connectionId;
        let connection;
        
        if (connectionId) {
          // Use specific connection (personal or organization)
          const connections = await storage.getSocialConnections(userId);
          connection = connections.find(c => c.id === connectionId && c.platform === 'linkedin');
        }
        
        // If no specific connection found, check for multiple connections
        if (!connection) {
          const allConnections = await storage.getSocialConnections(userId);
          const linkedInConnections = allConnections.filter(c => c.platform === 'linkedin' && c.isActive);
          
          if (linkedInConnections.length > 1) {
            return res.status(400).json({ 
              message: "Multiple LinkedIn accounts connected. Please select which account to post from." 
            });
          }
          
          connection = linkedInConnections[0];
        }
        
        if (!connection || !connection.accessToken || !connection.isActive) {
          return res.status(400).json({ 
            message: "LinkedIn account not connected. Please connect your LinkedIn account first." 
          });
        }
        
        if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
          return res.status(400).json({ 
            message: "LinkedIn access token has expired. Please reconnect your LinkedIn account." 
          });
        }
        
        let accessToken: string;
        try {
          accessToken = decrypt(connection.accessToken);
        } catch (error) {
          logError("Error decrypting LinkedIn access token:", error);
          return res.status(500).json({ message: "Failed to decrypt access token" });
        }
        
        // Use organization URN for org connections, person URN for personal
        const authorUrn = connection.connectionType === 'organization' && connection.organizationUrn
          ? connection.organizationUrn
          : `urn:li:person:${connection.accountId}`;
        const content = req.body.content || existingPost.content;
        
        const linkedinPostBody = {
          author: authorUrn,
          commentary: content,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
        };
        
        const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202412',
          },
          body: JSON.stringify(linkedinPostBody),
        });
        
        if (!postResponse.ok) {
          const errorData = await postResponse.text();
          let errorMessage = 'Failed to post to LinkedIn';
          try {
            const errorJson = JSON.parse(errorData);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorData || errorMessage;
          }
          logError("LinkedIn post failed:", errorData);
          return res.status(postResponse.status).json({ 
            message: `LinkedIn posting failed: ${errorMessage}` 
          });
        }
        
        const shareUrn = postResponse.headers.get('x-restli-id') || postResponse.headers.get('X-RestLi-Id');
        logInfo(`LinkedIn post created successfully via PATCH: ${shareUrn}`);
        
        // Preserve the connectionId that was used for publishing
        const updateData: Record<string, any> = { ...req.body, status: 'published' };
        if (connection.id) {
          updateData.connectionId = connection.id;
        }
        const post = await storage.updateSocialPost(organizationId, req.params.id, updateData);
        res.json({ ...post, linkedinShareUrn: shareUrn });
      } else if (status === 'published' && existingPost.status !== 'published' && existingPost.platform === 'twitter') {
        // Twitter publishing from draft
        const connection = await storage.getSocialConnectionByPlatform(userId, 'twitter');
        
        if (!connection || !connection.accessToken || !connection.isActive) {
          return res.status(400).json({ 
            message: "Twitter account not connected. Please connect your Twitter account first by clicking 'Connect Account' on the Social Media page." 
          });
        }
        
        // Use helper to get access token (refreshes if expired)
        const tokenResult = await refreshTwitterAccessToken(connection, organizationId);
        if (!tokenResult) {
          return res.status(400).json({ 
            message: "Twitter access token has expired. Please reconnect your Twitter account." 
          });
        }
        const accessToken = tokenResult.accessToken;
        
        const content = req.body.content || existingPost.content;
        
        // Post tweet using Twitter API v2
        const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: content }),
        });
        
        if (!tweetResponse.ok) {
          const errorData = await tweetResponse.text();
          let errorMessage = 'Failed to post to Twitter';
          try {
            const errorJson = JSON.parse(errorData);
            errorMessage = errorJson.detail || errorJson.title || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorData || errorMessage;
          }
          logError("Twitter post failed:", errorData);
          return res.status(tweetResponse.status).json({ 
            message: `Twitter posting failed: ${errorMessage}` 
          });
        }
        
        const tweetData = await tweetResponse.json() as { data?: { id?: string } };
        const tweetId = tweetData.data?.id;
        logInfo(`Twitter post created successfully via PATCH: ${tweetId}`);
        
        const updateData: Record<string, any> = { ...req.body, status: 'published' };
        if (connection.id) {
          updateData.connectionId = connection.id;
        }
        const post = await storage.updateSocialPost(organizationId, req.params.id, updateData);
        res.json({ ...post, tweetId });
      } else {
        // For non-publish updates, only include connectionId if explicitly provided
        const updateData = { ...req.body };
        if (req.body.connectionId === undefined) {
          delete updateData.connectionId;
        }
        const post = await storage.updateSocialPost(organizationId, req.params.id, updateData);
        if (!post) {
          return res.status(404).json({ message: "Social post not found" });
        }
        res.json(post);
      }
    } catch (error) {
      logError("Error updating social post:", error);
      res.status(400).json({ message: "Failed to update social post" });
    }
  });

  app.delete("/api/social/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteSocialPost(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting social post:", error);
      res.status(500).json({ message: "Failed to delete social post" });
    }
  });

  // Email template routes
  app.get("/api/email-templates", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const templates = await storage.getEmailTemplates(organizationId, eventId);
      res.json(templates);
    } catch (error) {
      logError("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertEmailTemplateSchema.parse({ ...req.body, organizationId, eventId: req.body.eventId || null, createdBy: userId });
      const template = await storage.createEmailTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      logError("Error creating email template:", error);
      res.status(400).json({ message: "Invalid email template data" });
    }
  });

  app.patch("/api/email-templates/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const template = await storage.updateEmailTemplate(organizationId, req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      logError("Error updating email template:", error);
      res.status(400).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteEmailTemplate(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  app.post("/api/email-templates/:id/test-email", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      // Get user's email
      const user = await storage.getUser(userId);
      if (!user?.email) {
        return res.status(400).json({ message: "User email not found" });
      }
      
      // Get the template with proper org scoping
      const template = await storage.getEmailTemplate(organizationId, req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      // Send test email
      const result = await sendTestEmail({
        to: user.email,
        subject: template.subject,
        content: template.content,
        headerImageUrl: template.headerImageUrl,
        styles: template.styles as any || undefined,
      });
      
      if (result.success) {
        res.json({ message: "Test email sent successfully", email: user.email });
      } else {
        res.status(500).json({ message: result.error || "Failed to send test email" });
      }
    } catch (error) {
      logError("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Check-in routes (code-based access - no organizationId verification needed for scan)
  app.post("/api/check-in/scan", isAuthenticated, requireInviteRedemption, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Check-in code is required" });
      }
      
      const attendee = await storage.getAttendeeByCheckInCode(code);
      if (!attendee) {
        return res.status(404).json({ message: "Invalid check-in code" });
      }
      
      if (attendee.checkedIn) {
        return res.status(400).json({ message: "Already checked in", attendee });
      }
      
      const checkedInAttendee = await storage.checkInAttendee(attendee.id);
      res.json({ message: "Check-in successful", attendee: checkedInAttendee });
    } catch (error) {
      logError("Error during check-in:", error);
      res.status(500).json({ message: "Failed to process check-in" });
    }
  });

  app.get("/api/check-in/stats", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const attendees = await storage.getAttendees(organizationId);
      const totalAttendees = attendees.length;
      const checkedIn = attendees.filter(a => a.checkedIn).length;
      const pending = totalAttendees - checkedIn;
      
      res.json({
        totalAttendees,
        checkedIn,
        pending,
        checkInRate: totalAttendees > 0 ? Math.round((checkedIn / totalAttendees) * 100) : 0,
      });
    } catch (error) {
      logError("Error fetching check-in stats:", error);
      res.status(500).json({ message: "Failed to fetch check-in stats" });
    }
  });

  // Helper function to escape XML special characters
  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Public sitemap endpoint
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      // Get all published landing pages with their event slugs
      const publishedPages = await storage.getPublishedLandingPagesForSitemap();
      
      // Filter out entries without valid slugs
      const validPages = publishedPages.filter(p => p.slug);
      const urls = validPages.map(p => ({
        loc: escapeXml(`${baseUrl}/event/${p.slug}`),
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }));
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>`;
      
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      logError("Error generating sitemap:", error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Helper function to resolve event by slug with custom domain scoping
  async function resolveEventBySlug(req: any, slug: string): Promise<Event | undefined> {
    // If request came via custom domain, scope to that organization
    if (req.resolvedOrganization?.id) {
      logInfo(`[Public Event] Resolving event via custom domain for org: ${req.resolvedOrganization.id}`, 'custom-domain');
      return storage.getEventBySlugAndOrganization(slug, req.resolvedOrganization.id);
    }
    // Otherwise, do global slug lookup
    return storage.getEventBySlug(slug);
  }

  // Public event registration routes (no auth required)
  app.get("/api/public/event/:slug", async (req: any, res) => {
    try {
      logInfo(`[Public Event] Fetching event with slug: ${req.params.slug}`);
      const event = await resolveEventBySlug(req, req.params.slug);
      
      if (!event) {
        logInfo(`[Public Event] No event found for slug: ${req.params.slug}`);
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (!event.isPublic && event.status !== 'published') {
        logInfo(`[Public Event] Event ${event.id} is not public or published`);
        return res.status(404).json({ message: "Event not found" });
      }
      
      logInfo(`[Public Event] Found event: ${event.name} (${event.id}), org: ${event.organizationId}`);
      
      const sessions = await storage.getSessions(event.organizationId, event.id);
      const speakers = await storage.getSpeakers(event.organizationId, event.id);
      const sponsors = await storage.getEventSponsors(event.organizationId, event.id, { activeOnly: true });
      
      // Also fetch the landing page configuration if published
      const pages = await storage.getEventPages(event.organizationId, event.id);
      const landingPage = pages.find(p => p.pageType === "landing" && p.isPublished);
      
      // Fetch registration config to know if password is required
      const registrationConfig = await storage.getRegistrationConfig(event.organizationId, event.id);
      const requirePassword = registrationConfig?.step1Config?.requirePassword || false;
      
      logInfo(`[Public Event] Sessions: ${sessions.length}, Speakers: ${speakers.length}, Sponsors: ${sponsors.length}, Pages: ${pages.length}, Landing published: ${!!landingPage}`);
      
      res.json({ event, sessions, speakers, sponsors, landingPage: landingPage || null, requirePassword, organizationId: event.organizationId });
    } catch (error) {
      logError("[Public Event] Error fetching public event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Public API endpoint for custom pages by slug
  app.get("/api/public/event/:slug/page/:pageSlug", async (req: any, res) => {
    try {
      const { slug, pageSlug } = req.params;
      logInfo(`[Public Custom Page] Fetching page ${pageSlug} for event ${slug}`);
      
      const event = await resolveEventBySlug(req, slug);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (!event.isPublic && event.status !== 'published') {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const pages = await storage.getEventPages(event.organizationId, event.id);
      const customPage = pages.find(p => p.pageType === "custom" && p.slug === pageSlug && p.isPublished);
      
      if (!customPage) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // Get landing page theme as fallback
      const landingPage = pages.find(p => p.pageType === "landing" && p.isPublished);
      const landingTheme = landingPage?.theme || null;
      
      // Use custom page theme or fall back to landing theme
      const effectivePage = {
        ...customPage,
        theme: customPage.theme || landingTheme
      };
      
      // Also fetch sessions, speakers, sponsors for section rendering
      const sessions = await storage.getSessions(event.organizationId, event.id);
      const speakers = await storage.getSpeakers(event.organizationId, event.id);
      const sponsors = await storage.getEventSponsors(event.organizationId, event.id, { activeOnly: true });
      
      res.json({ 
        event, 
        customPage: effectivePage,
        landingTheme,
        sessions,
        speakers,
        sponsors,
        organizationId: event.organizationId
      });
    } catch (error) {
      logError("[Public Custom Page] Error fetching custom page:", error);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  app.get("/api/public/event/:slug/registration", async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const pages = await storage.getEventPages(event.organizationId, event.id);
      const registrationPage = pages.find(p => p.pageType === "registration" && p.isPublished);
      const landingPage = pages.find(p => p.pageType === "landing" && p.isPublished);
      
      // Fetch registration config to know which fields are required
      const registrationConfig = await storage.getRegistrationConfig(event.organizationId, event.id);
      
      // Use landing page theme as fallback if registration page has no theme
      // Also provide landing theme even if no registration page exists
      const landingTheme = landingPage?.theme || null;
      const effectivePage = registrationPage ? {
        ...registrationPage,
        theme: registrationPage.theme || landingTheme
      } : null;
      
      res.json({ 
        event, 
        registrationPage: effectivePage, 
        landingTheme,
        registrationConfig: registrationConfig?.step1Config || null
      });
    } catch (error) {
      logError("Error fetching registration page:", error);
      res.status(500).json({ message: "Failed to fetch registration page" });
    }
  });

  app.get("/api/public/event/:slug/portal", async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const sessions = await storage.getSessions(event.organizationId, event.id);
      const speakers = await storage.getSpeakers(event.organizationId, event.id);
      const pages = await storage.getEventPages(event.organizationId, event.id);
      const portalPage = pages.find(p => p.pageType === "portal" && p.isPublished);
      const landingPage = pages.find(p => p.pageType === "landing" && p.isPublished);
      
      // Use landing page theme as fallback if portal page has no theme
      // Also provide landing theme even if no portal page exists
      const landingTheme = landingPage?.theme || null;
      const effectivePage = portalPage ? {
        ...portalPage,
        theme: portalPage.theme || landingTheme
      } : null;
      
      res.json({ event, sessions, speakers, portalPage: effectivePage, landingTheme });
    } catch (error) {
      logError("Error fetching portal page:", error);
      res.status(500).json({ message: "Failed to fetch portal page" });
    }
  });

  // Get housing status for public event page
  app.get("/api/public/event/:slug/housing-status", async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const mapping = await storage.getPasskeyEventMapping(event.organizationId, event.id);
      
      if (!mapping || !mapping.isEnabled || !mapping.regLinkUrl) {
        return res.json({ 
          housingEnabled: false,
          bookingUrl: null,
          eventName: null
        });
      }
      
      res.json({ 
        housingEnabled: true,
        bookingUrl: mapping.regLinkUrl,
        eventName: mapping.passkeyEventName || null
      });
    } catch (error) {
      logError("Error fetching housing status:", error);
      res.status(500).json({ message: "Failed to fetch housing status" });
    }
  });

  // Get public packages for an event (public ones + any unlocked by invite code)
  app.get("/api/public/event/:slug/packages", async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get all packages for this organization
      const allPackages = await storage.getPackages(event.organizationId);
      
      // Get event-specific package overrides
      const eventPackageOverrides = await storage.getEventPackages(event.organizationId, event.id);
      const overrideMap = new Map(eventPackageOverrides.map(ep => [ep.packageId, ep]));
      
      // Filter to only enabled packages for this event that are public and active
      const publicPackages = allPackages
        .map(pkg => {
          const override = overrideMap.get(pkg.id);
          // Skip if no override (package not linked to event)
          if (!override) return null;
          // Skip if not enabled
          if (override.isEnabled !== true) return null;
          // Skip if not active or not public
          if (pkg.isActive !== true || pkg.isPublic !== true) return null;
          return {
            ...pkg,
            effectivePrice: override?.priceOverride ?? pkg.price,
            effectiveFeatures: override?.featuresOverride ?? pkg.features,
          };
        })
        .filter((pkg): pkg is NonNullable<typeof pkg> => pkg !== null);
      
      res.json(publicPackages);
    } catch (error) {
      logError("Error fetching public packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Validate invite code and return unlocked package if any
  app.post("/api/public/validate-invite-code/:slug", validateInviteCodeLimiter, async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const { code } = req.body;
      if (!code) {
        return res.json({ valid: false, inviteCode: null, unlockedPackage: null });
      }
      
      const inviteCode = await storage.getInviteCodeByCode(event.organizationId, event.id, code);
      
      if (!inviteCode || !inviteCode.isActive) {
        return res.json({ valid: false, inviteCode: null, unlockedPackage: null });
      }
      
      // Check quantity limit
      if (inviteCode.quantity !== null && (inviteCode.usedCount || 0) >= inviteCode.quantity) {
        return res.json({ valid: false, inviteCode: null, unlockedPackage: null, message: "Code has reached its usage limit" });
      }
      
      let unlockedPackage = null;
      if (inviteCode.packageId) {
        const pkg = await storage.getPackage(event.organizationId, inviteCode.packageId);
        if (pkg && pkg.isActive) {
          // Get event-specific override if any
          const eventPackageOverrides = await storage.getEventPackages(event.organizationId, event.id);
          const override = eventPackageOverrides.find(ep => ep.packageId === pkg.id);
          
          unlockedPackage = {
            ...pkg,
            effectivePrice: override?.priceOverride ?? pkg.price,
            effectiveFeatures: override?.featuresOverride ?? pkg.features,
          };
        }
      }
      
      // Get submission data if this is a speaker invite code
      let submissionData = null;
      if (inviteCode.cfpSubmissionId) {
        const submission = await storage.getCfpSubmission(inviteCode.cfpSubmissionId, event.organizationId);
        if (submission) {
          // Parse name into first and last name
          const nameParts = submission.authorName.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          submissionData = {
            firstName,
            lastName,
            email: submission.authorEmail,
            company: submission.authorAffiliation || '',
            submissionTitle: submission.title,
          };
        }
      }
      
      // Return invite code info with discount details and submission data
      res.json({
        valid: true,
        inviteCode: {
          id: inviteCode.id,
          code: inviteCode.code,
          discountType: inviteCode.discountType,
          discountValue: inviteCode.discountValue,
          packageId: inviteCode.packageId,
          attendeeTypeId: inviteCode.attendeeTypeId,
          forcePackage: inviteCode.forcePackage ?? false,
          cfpSubmissionId: inviteCode.cfpSubmissionId,
        },
        unlockedPackage,
        submissionData,
      });
    } catch (error) {
      logError("Error validating invite code:", error);
      res.status(500).json({ message: "Failed to validate invite code" });
    }
  });

  app.post("/api/public/register/:slug", publicRegistrationLimiter, async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published') || !event.registrationOpen) {
        return res.status(404).json({ message: "Registration not available" });
      }
      
      const { inviteCode, ...registrationData } = req.body;
      
      // Fetch registration config and validate required fields
      const registrationConfig = await storage.getRegistrationConfig(event.organizationId, event.id);
      const step1Config = registrationConfig?.step1Config;
      
      // Default required fields (backward compatibility)
      const defaultRequired = {
        firstName: true,
        lastName: true,
        email: true,
        phone: false,
        company: false,
        jobTitle: false,
      };
      
      // Determine which fields are required based on config or defaults
      const isRequired = {
        firstName: step1Config?.collectFirstName ?? defaultRequired.firstName,
        lastName: step1Config?.collectLastName ?? defaultRequired.lastName,
        email: step1Config?.collectEmail ?? defaultRequired.email,
        phone: step1Config?.collectPhone ?? defaultRequired.phone,
        company: step1Config?.collectCompany ?? defaultRequired.company,
        jobTitle: step1Config?.collectJobTitle ?? defaultRequired.jobTitle,
      };
      
      // Validate required fields
      const missingFields: string[] = [];
      if (isRequired.firstName && !registrationData.firstName?.trim()) {
        missingFields.push("First Name");
      }
      if (isRequired.lastName && !registrationData.lastName?.trim()) {
        missingFields.push("Last Name");
      }
      if (isRequired.email && !registrationData.email?.trim()) {
        missingFields.push("Email");
      }
      if (isRequired.phone && !registrationData.phone?.trim()) {
        missingFields.push("Phone");
      }
      if (isRequired.company && !registrationData.company?.trim()) {
        missingFields.push("Company");
      }
      if (isRequired.jobTitle && !registrationData.jobTitle?.trim()) {
        missingFields.push("Job Title");
      }
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(", ")}` 
        });
      }
      
      let inviteCodeId: string | undefined;
      let attendeeType = registrationData.attendeeType;
      let ticketType = registrationData.ticketType;
      let packageId: string | undefined = registrationData.packageId;
      let foundInviteCode: any = null;
      
      // If invite code is provided, validate and apply associations
      if (inviteCode) {
        foundInviteCode = await storage.getInviteCodeByCode(
          event.organizationId,
          event.id,
          inviteCode
        );
        
        if (!foundInviteCode) {
          return res.status(400).json({ message: "Invalid invite code" });
        }
        
        if (!foundInviteCode.isActive) {
          return res.status(400).json({ message: "Invite code is no longer active" });
        }
        
        // Check quantity limit if set
        if (foundInviteCode.quantity !== null && 
            (foundInviteCode.usedCount || 0) >= foundInviteCode.quantity) {
          return res.status(400).json({ message: "Invite code has reached its usage limit" });
        }
        
        // Apply invite code associations
        inviteCodeId = foundInviteCode.id;
        
        // Apply attendee type from invite code if it has one
        if (foundInviteCode.attendeeTypeId) {
          const inviteAttendeeType = await storage.getAttendeeType(event.organizationId, foundInviteCode.attendeeTypeId);
          if (inviteAttendeeType) {
            attendeeType = inviteAttendeeType.type;
          }
        }
        
        // Apply package from invite code if it has one
        if (foundInviteCode.packageId) {
          const invitePackage = await storage.getPackage(event.organizationId, foundInviteCode.packageId);
          if (invitePackage) {
            ticketType = invitePackage.name;
            packageId = invitePackage.id;
          }
        }
      }
      
      // Generate a unique check-in code
      const checkInCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Hash password if provided (requirePassword is enabled in registration config)
      let passwordHash: string | undefined;
      if (registrationData.password && typeof registrationData.password === 'string' && registrationData.password.length >= 8) {
        passwordHash = await hashPassword(registrationData.password);
      }
      
      // Extract activation link attribution data
      const activationLinkId = registrationData.activationLinkId || undefined;
      const utmSource = registrationData.utmSource || undefined;
      const utmMedium = registrationData.utmMedium || undefined;
      const utmCampaign = registrationData.utmCampaign || undefined;
      const utmContent = registrationData.utmContent || undefined;
      const utmTerm = registrationData.utmTerm || undefined;

      const data = insertAttendeeSchema.parse({
        ...registrationData,
        organizationId: event.organizationId,
        eventId: event.id,
        checkInCode,
        registrationStatus: "confirmed",
        attendeeType,
        ticketType,
        inviteCodeId,
        packageId,
        activationLinkId,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        customData: registrationData.customData || null,
        passwordHash
      });
      
      const attendee = await storage.createAttendee(data);
      
      // Track activation link conversion
      if (activationLinkId) {
        try {
          await storage.incrementActivationLinkConversions(activationLinkId);
          logInfo(`Activation link ${activationLinkId} conversion recorded for attendee ${attendee.id}`);
        } catch (e) {
          logError("Failed to track activation link conversion:", e);
        }
      }
      
      // Increment the used count AFTER successful attendee creation
      if (foundInviteCode) {
        try {
          await storage.updateInviteCode(event.organizationId, foundInviteCode.id, {
            usedCount: (foundInviteCode.usedCount || 0) + 1
          });
        } catch (e) {
          logError("Failed to update invite code usage count:", e);
        }
        
        // If this invite code is linked to a CFP submission, create speaker and link to session
        if (foundInviteCode.cfpSubmissionId) {
          try {
            const submission = await storage.getCfpSubmission(foundInviteCode.cfpSubmissionId, event.organizationId);
            if (submission && submission.sessionId) {
              // Check if speaker already exists for this email
              let speaker = await storage.getSpeakerByEmail(event.organizationId, event.id, attendee.email);
              
              if (speaker) {
                // Update existing speaker with latest info
                speaker = await storage.updateSpeaker(event.organizationId, speaker.id, {
                  firstName: attendee.firstName,
                  lastName: attendee.lastName,
                  phone: attendee.phone || undefined,
                  company: attendee.company || undefined,
                  jobTitle: attendee.jobTitle || undefined,
                  bio: submission.bio || speaker.bio || undefined,
                }) || speaker;
                logInfo(`Updated existing speaker ${speaker.id} for CFP submission ${submission.id}`);
              } else {
                // Create a new speaker record
                const speakerData = {
                  organizationId: event.organizationId,
                  eventId: event.id,
                  firstName: attendee.firstName,
                  lastName: attendee.lastName,
                  email: attendee.email,
                  phone: attendee.phone || undefined,
                  company: attendee.company || undefined,
                  jobTitle: attendee.jobTitle || undefined,
                  bio: submission.bio || undefined,
                  speakerRole: 'speaker',
                };
                speaker = await storage.createSpeaker(speakerData);
                logInfo(`Created new speaker ${speaker.id} for CFP submission ${submission.id}`);
              }
              
              // Check if speaker is already linked to this session
              const existingLinks = await storage.getSessionSpeakersBySession(event.organizationId, submission.sessionId);
              const alreadyLinked = existingLinks.some(link => link.speakerId === speaker!.id);
              
              if (!alreadyLinked) {
                // Link the speaker to the session
                await storage.createSessionSpeaker({
                  sessionId: submission.sessionId,
                  speakerId: speaker.id,
                });
                logInfo(`Linked speaker ${speaker.id} to session ${submission.sessionId}`);
              }
            }
          } catch (e) {
            logError("Failed to create speaker from CFP submission:", e);
          }
        }
      }
      
      // If attendee type is "Speaker" (case-insensitive), ensure they appear on the Speakers page
      const isSpeakerType = attendeeType && attendeeType.toLowerCase() === 'speaker';
      if (isSpeakerType) {
        try {
          // Check if speaker already exists for this email
          let speaker = await storage.getSpeakerByEmail(event.organizationId, event.id, attendee.email);
          
          if (!speaker) {
            // Create a new speaker record
            speaker = await storage.createSpeaker({
              organizationId: event.organizationId,
              eventId: event.id,
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              email: attendee.email,
              phone: attendee.phone || undefined,
              company: attendee.company || undefined,
              jobTitle: attendee.jobTitle || undefined,
              speakerRole: 'speaker',
            });
            logInfo(`Created speaker ${speaker.id} for attendee with speaker type`);
          }
        } catch (e) {
          logError("Failed to create speaker from attendee registration:", e);
        }
      }
      
      res.status(201).json({ message: "Registration successful", attendee });
    } catch (error) {
      logError("Error during public registration:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // Attendee Authentication Endpoints
  app.post("/api/public/attendee/login", publicRegistrationLimiter, async (req: any, res) => {
    try {
      const { email, password, eventSlug } = req.body;
      
      if (!email || !password || !eventSlug) {
        return res.status(400).json({ message: "Email, password, and event slug are required" });
      }
      
      const event = await resolveEventBySlug(req, eventSlug);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Find attendee by email and event (efficient database lookup)
      const attendee = await storage.getAttendeeByEventAndEmail(event.id, email);
      
      if (!attendee) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (!attendee.passwordHash) {
        return res.status(401).json({ message: "No password set for this account. Please contact event organizers." });
      }
      
      const isValid = await verifyPassword(password, attendee.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Store attendee session data
      (req.session as any).attendee = {
        id: attendee.id,
        eventId: attendee.eventId,
        organizationId: attendee.organizationId,
        email: attendee.email
      };
      
      // Return attendee data (without password hash)
      const { passwordHash, ...safeAttendee } = attendee;
      res.json({ message: "Login successful", attendee: safeAttendee });
    } catch (error) {
      logError("Error during attendee login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/public/attendee/logout", async (req, res) => {
    try {
      if ((req.session as any).attendee) {
        delete (req.session as any).attendee;
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      logError("Error during attendee logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/public/attendee/me", async (req, res) => {
    try {
      const attendeeSession = (req.session as any).attendee;
      
      if (!attendeeSession || !attendeeSession.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const attendee = await storage.getAttendee(attendeeSession.organizationId, attendeeSession.id);
      
      if (!attendee) {
        delete (req.session as any).attendee;
        return res.status(401).json({ message: "Attendee not found" });
      }
      
      // Get event info for context
      const event = await storage.getEvent(attendee.organizationId, attendee.eventId);
      
      // Get package info if attendee has one
      let packageInfo = null;
      if (attendee.packageId) {
        packageInfo = await storage.getPackage(attendee.organizationId, attendee.packageId);
      }
      
      // Return attendee data (without password hash)
      const { passwordHash, ...safeAttendee } = attendee;
      res.json({ 
        attendee: safeAttendee, 
        event: event ? { id: event.id, name: event.name, publicSlug: event.publicSlug } : null,
        package: packageInfo ? { id: packageInfo.id, name: packageInfo.name, features: packageInfo.features } : null
      });
    } catch (error) {
      logError("Error fetching attendee session:", error);
      res.status(500).json({ message: "Failed to fetch attendee data" });
    }
  });

  app.patch("/api/public/attendee/profile", async (req, res) => {
    try {
      const attendeeSession = (req.session as any).attendee;
      
      if (!attendeeSession || !attendeeSession.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { firstName, lastName, phone, company, jobTitle } = req.body;
      
      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (company !== undefined) updateData.company = company;
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updated = await storage.updateAttendee(attendeeSession.organizationId, attendeeSession.id, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      
      const { passwordHash, ...safeAttendee } = updated;
      res.json({ message: "Profile updated successfully", attendee: safeAttendee });
    } catch (error) {
      logError("Error updating attendee profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ===== ATTENDEE PORTAL ROUTES =====
  // These routes require attendee authentication via session

  // Helper to get attendee from session and validate event access
  const getPortalAttendee = async (req: any, eventId: string) => {
    const attendeeSession = (req.session as any).attendee;
    if (!attendeeSession || !attendeeSession.id) {
      return null;
    }
    const attendee = await storage.getAttendee(attendeeSession.organizationId, attendeeSession.id);
    if (!attendee || attendee.eventId !== eventId) {
      return null;
    }
    return attendee;
  };

  // --- ATTENDEE SAVED SESSIONS ---

  // Get saved sessions for logged-in attendee
  app.get("/api/portal/:eventId/saved-sessions", async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const savedSessions = await storage.getAttendeeSavedSessions(attendee.id);
      res.json(savedSessions);
    } catch (error) {
      logError("Error fetching saved sessions:", error);
      res.status(500).json({ message: "Failed to fetch saved sessions" });
    }
  });

  // Save a session to personal schedule
  app.post("/api/portal/:eventId/sessions/:sessionId/save", async (req: any, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const savedSession = await storage.saveSession(attendee.id, sessionId);
      res.status(201).json(savedSession);
    } catch (error) {
      logError("Error saving session:", error);
      res.status(500).json({ message: "Failed to save session" });
    }
  });

  // Remove saved session from personal schedule
  app.delete("/api/portal/:eventId/sessions/:sessionId/save", async (req: any, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      await storage.unsaveSession(attendee.id, sessionId);
      res.status(204).send();
    } catch (error) {
      logError("Error removing saved session:", error);
      res.status(500).json({ message: "Failed to remove saved session" });
    }
  });

  // Check if session is saved
  app.get("/api/portal/:eventId/sessions/:sessionId/is-saved", async (req: any, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const isSaved = await storage.isSessionSaved(attendee.id, sessionId);
      res.json({ isSaved });
    } catch (error) {
      logError("Error checking if session is saved:", error);
      res.status(500).json({ message: "Failed to check saved status" });
    }
  });

  // --- ATTENDEE INTERESTS ---

  // Get attendee's interests
  app.get("/api/portal/:eventId/interests", async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const interests = await storage.getAttendeeInterests(attendee.id);
      res.json(interests || { attendeeId: attendee.id, interests: [], preferredSessionTypes: [], preferredTracks: [] });
    } catch (error) {
      logError("Error fetching attendee interests:", error);
      res.status(500).json({ message: "Failed to fetch interests" });
    }
  });

  // Update attendee interests (upsert)
  app.put("/api/portal/:eventId/interests", async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const data = insertAttendeeInterestsSchema.parse({
        ...req.body,
        attendeeId: attendee.id,
      });
      
      const interests = await storage.upsertAttendeeInterests(attendee.id, data);
      res.json(interests);
    } catch (error: any) {
      logError("Error updating attendee interests:", error);
      res.status(400).json({ message: error.message || "Failed to update interests" });
    }
  });

  // --- SESSION FEEDBACK ---

  // Get my feedback for a session
  app.get("/api/portal/:eventId/sessions/:sessionId/feedback", async (req: any, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const feedback = await storage.getAttendeeSessionFeedback(attendee.id, sessionId);
      res.json(feedback || null);
    } catch (error) {
      logError("Error fetching session feedback:", error);
      res.status(500).json({ message: "Failed to fetch session feedback" });
    }
  });

  // Submit feedback for a session
  app.post("/api/portal/:eventId/sessions/:sessionId/feedback", async (req: any, res) => {
    try {
      const { eventId, sessionId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      // Check if feedback already exists
      const existing = await storage.getAttendeeSessionFeedback(attendee.id, sessionId);
      if (existing) {
        return res.status(400).json({ message: "Feedback already submitted for this session" });
      }
      
      const data = insertSessionFeedbackSchema.parse({
        ...req.body,
        attendeeId: attendee.id,
        sessionId,
        organizationId: attendee.organizationId,
      });
      
      const feedback = await storage.createSessionFeedback(data);
      res.status(201).json(feedback);
    } catch (error: any) {
      logError("Error submitting session feedback:", error);
      res.status(400).json({ message: error.message || "Failed to submit feedback" });
    }
  });

  // --- EVENT FEEDBACK ---

  // Get my event feedback
  app.get("/api/portal/:eventId/feedback", async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      const feedback = await storage.getAttendeeEventFeedback(attendee.id, eventId);
      res.json(feedback || null);
    } catch (error) {
      logError("Error fetching event feedback:", error);
      res.status(500).json({ message: "Failed to fetch event feedback" });
    }
  });

  // Submit event feedback
  app.post("/api/portal/:eventId/feedback", async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      // Check if feedback already exists
      const existing = await storage.getAttendeeEventFeedback(attendee.id, eventId);
      if (existing) {
        return res.status(400).json({ message: "Feedback already submitted for this event" });
      }
      
      // Derive wouldRecommend from recommendationScore for backward compatibility
      const recommendationScore = req.body.recommendationScore;
      const wouldRecommend = recommendationScore !== null && recommendationScore !== undefined
        ? recommendationScore >= 7  // Passives and promoters count as "would recommend"
        : req.body.wouldRecommend ?? null;
      
      const data = insertEventFeedbackSchema.parse({
        ...req.body,
        wouldRecommend,
        attendeeId: attendee.id,
        eventId,
        organizationId: attendee.organizationId,
      });
      
      const feedback = await storage.createEventFeedback(data);
      res.status(201).json(feedback);
    } catch (error: any) {
      logError("Error submitting event feedback:", error);
      res.status(400).json({ message: error.message || "Failed to submit feedback" });
    }
  });

  // --- RECOMMENDATIONS ---

  // Get recommended sessions based on interests
  app.get("/api/portal/:eventId/recommendations", async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const attendee = await getPortalAttendee(req, eventId);
      if (!attendee) {
        return res.status(401).json({ message: "Not authenticated or invalid event" });
      }
      
      // Get attendee interests
      const interests = await storage.getAttendeeInterests(attendee.id);
      
      // Get all sessions for the event
      const sessions = await storage.getSessions(attendee.organizationId, eventId);
      
      // Get saved sessions to exclude them from recommendations
      const savedSessions = await storage.getAttendeeSavedSessions(attendee.id);
      const savedSessionIds = new Set(savedSessions.map(s => s.sessionId));
      
      // Get tracks for the event
      const tracks = await storage.getSessionTracks(attendee.organizationId, eventId);
      const trackMap = new Map(tracks.map(t => [t.id, t]));
      
      // Score sessions based on matching interests
      const scoredSessions = sessions
        .filter(session => !savedSessionIds.has(session.id)) // Exclude already saved
        .map(session => {
          let score = 0;
          
          if (interests) {
            // Match by track
            if (session.trackId && interests.preferredTracks?.includes(session.trackId)) {
              score += 3;
            }
            
            // Match by session type
            if (session.sessionType && interests.preferredSessionTypes?.includes(session.sessionType)) {
              score += 2;
            }
            
            // Match by interests (keywords in title or description)
            if (interests.interests && Array.isArray(interests.interests)) {
              for (const interest of interests.interests) {
                const lowerInterest = interest.toLowerCase();
                if (session.title?.toLowerCase().includes(lowerInterest)) {
                  score += 2;
                }
                if (session.description?.toLowerCase().includes(lowerInterest)) {
                  score += 1;
                }
              }
            }
          }
          
          // Add track info
          const track = session.trackId ? trackMap.get(session.trackId) : null;
          
          return {
            ...session,
            track: track ? { id: track.id, name: track.name, color: track.color } : null,
            recommendationScore: score
          };
        })
        .filter(session => session.recommendationScore > 0) // Only include sessions with some match
        .sort((a, b) => b.recommendationScore - a.recommendationScore) // Sort by score descending
        .slice(0, 10); // Return top 10
      
      res.json(scoredSessions);
    } catch (error) {
      logError("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // ===== ADMIN FEEDBACK ROUTES =====
  // These routes require organization admin authentication

  // Get all session feedback for an event
  app.get("/api/organizations/:orgId/events/:eventId/session-feedback", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, eventId } = req.params;
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === orgId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify event belongs to organization
      const event = await storage.getEvent(orgId, eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get all sessions for the event to aggregate feedback
      const sessions = await storage.getSessions(orgId, eventId);
      const feedbackBySession = await Promise.all(
        sessions.map(async (session) => {
          const feedback = await storage.getSessionFeedback(orgId, session.id);
          const saveCount = await storage.getSessionSaveCount(session.id);
          return {
            session: { id: session.id, title: session.title },
            feedback,
            saveCount,
            averageRating: feedback.length > 0 
              ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length 
              : null,
            feedbackCount: feedback.length
          };
        })
      );
      
      res.json(feedbackBySession);
    } catch (error) {
      logError("Error fetching session feedback:", error);
      res.status(500).json({ message: "Failed to fetch session feedback" });
    }
  });

  // Get feedback for a specific session
  app.get("/api/organizations/:orgId/events/:eventId/session-feedback/:sessionId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, eventId, sessionId } = req.params;
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === orgId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const feedback = await storage.getSessionFeedback(orgId, sessionId);
      const saveCount = await storage.getSessionSaveCount(sessionId);
      
      res.json({ feedback, saveCount });
    } catch (error) {
      logError("Error fetching session feedback:", error);
      res.status(500).json({ message: "Failed to fetch session feedback" });
    }
  });

  // Get all event feedback
  app.get("/api/organizations/:orgId/events/:eventId/event-feedback", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, eventId } = req.params;
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === orgId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify event belongs to organization
      const event = await storage.getEvent(orgId, eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const feedback = await storage.getEventFeedback(orgId, eventId);
      
      // Calculate aggregate stats
      const stats = {
        totalResponses: feedback.length,
        averageOverallRating: feedback.length > 0 
          ? feedback.reduce((sum, f) => sum + (f.overallRating || 0), 0) / feedback.length 
          : null,
        npsScore: feedback.length > 0
          ? (() => {
              const promoters = feedback.filter(f => (f.recommendScore || 0) >= 9).length;
              const detractors = feedback.filter(f => (f.recommendScore || 0) <= 6).length;
              return Math.round(((promoters - detractors) / feedback.length) * 100);
            })()
          : null
      };
      
      res.json({ feedback, stats });
    } catch (error) {
      logError("Error fetching event feedback:", error);
      res.status(500).json({ message: "Failed to fetch event feedback" });
    }
  });

  // Get feedback configuration
  app.get("/api/organizations/:orgId/events/:eventId/feedback-config", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, eventId } = req.params;
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === orgId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const config = await storage.getFeedbackConfig(eventId);
      res.json(config || { eventId, isEnabled: false });
    } catch (error) {
      logError("Error fetching feedback config:", error);
      res.status(500).json({ message: "Failed to fetch feedback config" });
    }
  });

  // Update feedback configuration
  app.put("/api/organizations/:orgId/events/:eventId/feedback-config", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, eventId } = req.params;
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === orgId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify event belongs to organization
      const event = await storage.getEvent(orgId, eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const data = insertFeedbackConfigSchema.parse({
        ...req.body,
        eventId,
        organizationId: orgId,
      });
      
      const config = await storage.upsertFeedbackConfig(data);
      res.json(config);
    } catch (error: any) {
      logError("Error updating feedback config:", error);
      res.status(400).json({ message: error.message || "Failed to update feedback config" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/overview", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      
      const [allAttendees, allSessions, allSpeakers, allBudgetItems, allDeliverables, allMilestones, allEmailCampaigns, allSocialPosts, events, allEventFeedback] = await Promise.all([
        storage.getAttendees(organizationId),
        storage.getSessions(organizationId),
        storage.getSpeakers(organizationId),
        storage.getBudgetItems(organizationId),
        storage.getDeliverables(organizationId),
        storage.getMilestones(organizationId),
        storage.getEmailCampaigns(organizationId),
        storage.getSocialPosts(organizationId),
        storage.getEvents(organizationId),
        storage.getAllEventFeedback(organizationId, eventId),
      ]);

      // Filter by eventId if provided
      const attendees = eventId ? allAttendees.filter(a => a.eventId === eventId) : allAttendees;
      const sessions = eventId ? allSessions.filter(s => s.eventId === eventId) : allSessions;
      const speakers = eventId ? allSpeakers.filter(s => s.eventId === eventId) : allSpeakers;
      const budgetItems = eventId ? allBudgetItems.filter(b => b.eventId === eventId) : allBudgetItems;
      const deliverables = eventId ? allDeliverables.filter(d => d.eventId === eventId) : allDeliverables;
      const milestones = eventId ? allMilestones.filter(m => m.eventId === eventId) : allMilestones;
      const emailCampaigns = eventId ? allEmailCampaigns.filter(e => e.eventId === eventId) : allEmailCampaigns;
      const socialPosts = eventId ? allSocialPosts.filter(p => p.eventId === eventId) : allSocialPosts;

      // Get budget caps from event budget settings
      let totalBudgetCap = 0;
      if (eventId) {
        // Single event - get its budget cap
        const settings = await storage.getEventBudgetSettings(eventId);
        totalBudgetCap = parseFloat(settings?.budgetCap || "0");
      } else {
        // All events - sum up all budget caps
        const settingsPromises = events.map(e => storage.getEventBudgetSettings(e.id));
        const allSettings = await Promise.all(settingsPromises);
        totalBudgetCap = allSettings.reduce((sum, s) => sum + parseFloat(s?.budgetCap || "0"), 0);
      }

      // Registration trends by date
      const registrationsByDate = attendees.reduce((acc: Record<string, number>, a) => {
        const date = a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : 'unknown';
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Attendee status breakdown
      const statusBreakdown = attendees.reduce((acc: Record<string, number>, a) => {
        const status = a.registrationStatus || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Check-in metrics
      const checkedInCount = attendees.filter(a => a.checkedIn).length;
      const checkInRate = attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0;

      // Budget metrics - use forecastAmount for committed spending (from approved vendors)
      const totalPlanned = budgetItems.reduce((sum, item) => sum + parseFloat(item.plannedAmount || "0"), 0);
      const totalForecast = budgetItems.reduce((sum, item) => sum + parseFloat(item.forecastAmount || "0"), 0);
      const totalSpent = totalForecast; // Program Spend shows committed/forecast amounts
      const budgetRemaining = totalBudgetCap - totalSpent;
      
      // Calculate utilization rate as forecast total vs budget cap
      const utilizationRate = totalBudgetCap > 0 ? Math.round((totalForecast / totalBudgetCap) * 100) : 0;

      // Project progress
      const completedDeliverables = deliverables.filter(d => d.status === "done").length;
      const completedMilestones = milestones.filter(m => m.status === "completed").length;
      const projectProgress = deliverables.length > 0 ? Math.round((completedDeliverables / deliverables.length) * 100) : 0;

      // Marketing metrics
      const sentEmails = emailCampaigns.filter(e => e.status === "sent").length;
      const scheduledEmails = emailCampaigns.filter(e => e.status === "scheduled").length;
      const publishedPosts = socialPosts.filter(p => p.status === "published").length;
      const scheduledPosts = socialPosts.filter(p => p.status === "scheduled").length;

      // NPS (Net Promoter Score) calculation from event feedback
      // Use recommendationScore (0-10) or fall back to wouldRecommend boolean
      const feedbackWithScores = allEventFeedback.filter(f => f.recommendationScore !== null || f.wouldRecommend !== null);
      let promoters = 0;
      let passives = 0;
      let detractors = 0;
      
      feedbackWithScores.forEach(f => {
        // Prefer recommendationScore if available, otherwise convert boolean
        const score = f.recommendationScore !== null 
          ? f.recommendationScore 
          : (f.wouldRecommend ? 10 : 0); // true = 10 (promoter), false = 0 (detractor)
        
        if (score >= 9) {
          promoters++;
        } else if (score >= 7) {
          passives++;
        } else {
          detractors++;
        }
      });
      
      const totalResponses = feedbackWithScores.length;
      const npsScore = totalResponses > 0 
        ? Math.round(((promoters / totalResponses) - (detractors / totalResponses)) * 100)
        : null;

      res.json({
        attendance: {
          total: attendees.length,
          checkedIn: checkedInCount,
          checkInRate,
          statusBreakdown,
          registrationsByDate,
        },
        sessions: {
          total: sessions.length,
          speakers: speakers.length,
        },
        budget: {
          totalPlanned,
          totalSpent,
          budgetCap: totalBudgetCap,
          budgetRemaining,
          utilizationRate,
        },
        project: {
          deliverables: deliverables.length,
          completedDeliverables,
          milestones: milestones.length,
          completedMilestones,
          projectProgress,
        },
        marketing: {
          totalEmails: emailCampaigns.length,
          sentEmails,
          scheduledEmails,
          totalPosts: socialPosts.length,
          publishedPosts,
          scheduledPosts,
        },
        nps: {
          score: npsScore,
          totalResponses,
          promoters,
          passives,
          detractors,
          promoterRate: totalResponses > 0 ? Math.round((promoters / totalResponses) * 100) : 0,
          detractorRate: totalResponses > 0 ? Math.round((detractors / totalResponses) * 100) : 0,
        },
      });
    } catch (error) {
      logError("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ICP Match Rate endpoint
  app.get("/api/analytics/icp-match", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;

      // Get attendees (filtered by eventId if provided)
      const allAttendees = await storage.getAttendees(organizationId, eventId);
      
      // Default targeting (used when event has no targeting configured)
      const defaultTargeting = {
        companyTypes: ['open'] as string[],
        roles: ['open'] as string[],
        functions: ['open'] as string[],
        accountFocus: 'open' as string,
      };

      // Build a map of eventId -> audienceTargeting for efficient lookup
      type TargetingConfig = typeof defaultTargeting;
      const eventTargetingMap = new Map<string, TargetingConfig>();
      
      if (eventId) {
        // Single event mode
        const event = await storage.getEvent(organizationId, eventId);
        if (event?.audienceTargeting) {
          eventTargetingMap.set(eventId, event.audienceTargeting as TargetingConfig);
        }
      } else {
        // All programs mode - get all events and build targeting map
        const allEvents = await storage.getEvents(organizationId);
        for (const event of allEvents) {
          if (event.audienceTargeting) {
            eventTargetingMap.set(event.id, event.audienceTargeting as TargetingConfig);
          }
        }
      }

      // Helper function to infer role from job title
      const inferRole = (jobTitle: string | null | undefined): string | null => {
        if (!jobTitle) return null;
        const title = jobTitle.toLowerCase();
        if (title.includes('ceo') || title.includes('cto') || title.includes('cmo') || 
            title.includes('cfo') || title.includes('coo') || title.includes('president') ||
            title.includes('chief')) {
          return 'executive';
        }
        if (title.includes('vp') || title.includes('vice president')) {
          return 'vp';
        }
        if (title.includes('director')) {
          return 'director';
        }
        if (title.includes('manager')) {
          return 'manager';
        }
        return null;
      };

      // Helper function to infer function from job title
      const inferFunction = (jobTitle: string | null | undefined): string | null => {
        if (!jobTitle) return null;
        const title = jobTitle.toLowerCase();
        if (title.includes('marketing') || title.includes('brand') || title.includes('content') ||
            title.includes('demand gen') || title.includes('communications')) {
          return 'marketing';
        }
        if (title.includes('sales') || title.includes('revenue') || title.includes('account executive') ||
            title.includes('business development') || title.includes('bdr') || title.includes('sdr')) {
          return 'sales';
        }
        if (title.includes('product') && !title.includes('production')) {
          return 'product';
        }
        if (title.includes('engineer') || title.includes('software') || title.includes('developer') ||
            title.includes('technical') || title.includes('architect')) {
          return 'engineering';
        }
        if (title.includes('operations') || title.includes('ops') || title.includes('supply chain') ||
            title.includes('logistics')) {
          return 'operations';
        }
        return null;
      };

      // Helper function to infer company type from company name
      const inferCompanyType = (company: string | null | undefined): string | null => {
        if (!company) return null;
        const name = company.toLowerCase();
        // Enterprise indicators: large company suffixes and long formal names
        if (name.includes('inc') || name.includes('corp') || name.includes('llc') ||
            name.includes('ltd') || name.includes('group') || name.includes('holdings') ||
            name.includes('international') || company.length > 30) {
          return 'enterprise';
        }
        // Mid-market: medium-length names, typical B2B indicators
        if (company.length > 15 || name.includes('solutions') || name.includes('technologies') ||
            name.includes('systems')) {
          return 'mid-market';
        }
        // SMB: shorter names, less formal
        return 'smb';
      };

      let companyTypeMatches = 0;
      let roleMatches = 0;
      let functionMatches = 0;
      let overallMatches = 0;

      const isOpen = (arr: string[]) => arr.includes('open');

      for (const attendee of allAttendees) {
        // Get the targeting config for this attendee's event
        const targeting = eventTargetingMap.get(attendee.eventId) || defaultTargeting;
        
        const inferredRole = inferRole(attendee.jobTitle);
        const inferredFunction = inferFunction(attendee.jobTitle);
        const inferredCompanyType = inferCompanyType(attendee.company);

        // Check company type match
        const companyTypeMatch = isOpen(targeting.companyTypes) || 
          (inferredCompanyType !== null && targeting.companyTypes.includes(inferredCompanyType));
        
        // Check role match
        const roleMatch = isOpen(targeting.roles) || 
          (inferredRole !== null && targeting.roles.includes(inferredRole));
        
        // Check function match
        const functionMatch = isOpen(targeting.functions) || 
          (inferredFunction !== null && targeting.functions.includes(inferredFunction));

        if (companyTypeMatch) companyTypeMatches++;
        if (roleMatch) roleMatches++;
        if (functionMatch) functionMatches++;

        // Overall match requires all criteria to match
        if (companyTypeMatch && roleMatch && functionMatch) {
          overallMatches++;
        }
      }

      const totalAttendees = allAttendees.length;
      const icpMatchRate = totalAttendees > 0 ? Math.round((overallMatches / totalAttendees) * 1000) / 10 : 0;

      res.json({
        icpMatchRate,
        totalAttendees,
        matchedAttendees: overallMatches,
        breakdown: {
          companyTypeMatch: totalAttendees > 0 ? Math.round((companyTypeMatches / totalAttendees) * 100) : 0,
          roleMatch: totalAttendees > 0 ? Math.round((roleMatches / totalAttendees) * 100) : 0,
          functionMatch: totalAttendees > 0 ? Math.round((functionMatches / totalAttendees) * 100) : 0,
        },
      });
    } catch (error) {
      logError("Error calculating ICP match rate:", error);
      res.status(500).json({ message: "Failed to calculate ICP match rate" });
    }
  });

  // Social connections routes (user-scoped - no organizationId needed)
  app.get("/api/social-connections", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await storage.getSocialConnections(userId);
      res.json(connections);
    } catch (error) {
      logError("Error fetching social connections:", error);
      res.status(500).json({ message: "Failed to fetch social connections" });
    }
  });

  app.post("/api/social-connections", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { platform, accountName } = req.body;
      
      const existing = await storage.getSocialConnectionByPlatform(userId, platform);
      if (existing) {
        return res.status(400).json({ message: "Connection already exists for this platform" });
      }
      
      const connection = await storage.createSocialConnection({
        userId,
        platform,
        accountName: accountName || `${platform} Account`,
        isActive: true,
      });
      res.status(201).json(connection);
    } catch (error) {
      logError("Error creating social connection:", error);
      res.status(400).json({ message: "Failed to create social connection" });
    }
  });

  app.delete("/api/social-connections/:id", isAuthenticated, requireInviteRedemption, async (req, res) => {
    try {
      await storage.deleteSocialConnection(req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting social connection:", error);
      res.status(500).json({ message: "Failed to delete social connection" });
    }
  });

  // LinkedIn OAuth endpoints
  app.get("/api/social/linkedin/authorize", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const credentials = await storage.getSocialMediaCredentials(organizationId);
      const linkedinCred = credentials.find(c => c.provider === 'linkedin');
      
      if (!linkedinCred || !linkedinCred.clientId || !linkedinCred.isConfigured) {
        return res.status(400).json({ 
          message: "LinkedIn OAuth is not configured. Please add your LinkedIn App credentials in Settings > Integrations." 
        });
      }
      
      let clientId: string;
      try {
        clientId = decrypt(linkedinCred.clientId);
        logInfo(`LinkedIn client ID (first 8 chars): ${clientId.substring(0, 8)}...`);
      } catch (error) {
        logError("Error decrypting LinkedIn client ID:", error);
        return res.status(500).json({ message: "Failed to decrypt LinkedIn credentials" });
      }
      
      const state = randomBytes(32).toString('hex');
      (req.session as any).linkedinState = state;
      (req.session as any).linkedinUserId = userId;
      
      const appUrl = process.env.APP_URL || 
        (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : (process.env.REPL_SLUG && process.env.REPL_OWNER 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER.toLowerCase()}.repl.co`
            : 'http://localhost:5000'));
      const redirectUri = `${appUrl}/api/social/linkedin/callback`;
      
      logInfo(`LinkedIn OAuth redirect URI: ${redirectUri}`);
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
        scope: 'openid profile email w_member_social',
      });
      
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
      res.redirect(authUrl);
    } catch (error) {
      logError("Error initiating LinkedIn OAuth:", error);
      res.status(500).json({ message: "Failed to initiate LinkedIn OAuth" });
    }
  });

  app.get("/api/social/linkedin/callback", async (req: any, res) => {
    try {
      const { code, state, error, error_description } = req.query;
      
      if (error) {
        logError("LinkedIn OAuth error:", error, error_description);
        return res.redirect('/social?error=' + encodeURIComponent(error_description || error));
      }
      
      if (!code || !state) {
        return res.redirect('/social?error=' + encodeURIComponent('Missing authorization code or state'));
      }
      
      const sessionState = (req.session as any).linkedinState;
      const userId = (req.session as any).linkedinUserId;
      
      if (!sessionState || state !== sessionState) {
        return res.redirect('/social?error=' + encodeURIComponent('Invalid state parameter. Please try again.'));
      }
      
      delete (req.session as any).linkedinState;
      delete (req.session as any).linkedinUserId;
      
      if (!userId) {
        return res.redirect('/social?error=' + encodeURIComponent('Session expired. Please log in and try again.'));
      }
      
      const organizationId = await getOrganizationId(userId, req.session);
      const credentials = await storage.getSocialMediaCredentials(organizationId);
      const linkedinCred = credentials.find(c => c.provider === 'linkedin');
      
      if (!linkedinCred || !linkedinCred.clientId || !linkedinCred.clientSecret) {
        return res.redirect('/social?error=' + encodeURIComponent('LinkedIn credentials not found'));
      }
      
      let clientId: string, clientSecret: string;
      try {
        clientId = decrypt(linkedinCred.clientId);
        clientSecret = decrypt(linkedinCred.clientSecret);
      } catch (error) {
        logError("Error decrypting LinkedIn credentials:", error);
        return res.redirect('/social?error=' + encodeURIComponent('Failed to decrypt credentials'));
      }
      
      const appUrl = process.env.APP_URL || 
        (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : (process.env.REPL_SLUG && process.env.REPL_OWNER 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER.toLowerCase()}.repl.co`
            : 'http://localhost:5000'));
      const redirectUri = `${appUrl}/api/social/linkedin/callback`;
      
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        logError("LinkedIn token exchange failed:", errorData);
        return res.redirect('/social?error=' + encodeURIComponent('Failed to exchange authorization code'));
      }
      
      const tokenData = await tokenResponse.json() as { access_token: string; expires_in: number; refresh_token?: string };
      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in;
      
      const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      let accountId = 'unknown';
      let accountName = 'LinkedIn User';
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json() as { sub?: string; name?: string };
        accountId = userInfo.sub || 'unknown';
        accountName = userInfo.name || 'LinkedIn User';
      } else {
        logWarn("Failed to fetch LinkedIn user info, continuing with unknown ID");
      }
      
      const existingConnection = await storage.getSocialConnectionByPlatform(userId, 'linkedin');
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      
      if (existingConnection) {
        await storage.updateSocialConnection(existingConnection.id, {
          accessToken: encrypt(accessToken),
          accountId,
          accountName,
          tokenExpiresAt,
          isActive: true,
        });
      } else {
        await storage.createSocialConnection({
          userId,
          platform: 'linkedin',
          accessToken: encrypt(accessToken),
          accountId,
          accountName,
          tokenExpiresAt,
          isActive: true,
        });
      }
      
      logInfo(`LinkedIn OAuth completed for user ${userId}`);
      res.redirect('/social?success=' + encodeURIComponent('LinkedIn account connected successfully!'));
    } catch (error) {
      logError("Error in LinkedIn OAuth callback:", error);
      res.redirect('/social?error=' + encodeURIComponent('An unexpected error occurred'));
    }
  });

  // LinkedIn organization pages endpoint - get list of pages user can admin
  app.get("/api/social/linkedin/organizations", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connection = await storage.getSocialConnectionByPlatform(userId, 'linkedin');
      
      if (!connection || !connection.accessToken) {
        return res.status(400).json({ message: "No LinkedIn connection found. Please connect your LinkedIn account first." });
      }
      
      let accessToken: string;
      try {
        accessToken = decrypt(connection.accessToken);
      } catch (error) {
        return res.status(400).json({ message: "Failed to decrypt access token. Please reconnect your LinkedIn account." });
      }
      
      // Fetch organization admin roles
      const orgResponse = await fetch('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName,vanityName,logoV2(original~:playableStreams))))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'LinkedIn-Version': '202412',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      
      if (!orgResponse.ok) {
        const errorData = await orgResponse.text();
        logError("Failed to fetch LinkedIn organizations:", errorData);
        // Return empty array if user doesn't have org admin access
        return res.json({ organizations: [] });
      }
      
      const orgData = await orgResponse.json() as { elements?: Array<{ organization?: string; 'organization~'?: { id?: number; localizedName?: string; vanityName?: string } }> };
      
      const organizations = (orgData.elements || []).map((elem: any) => ({
        urn: elem.organization,
        id: elem['organization~']?.id,
        name: elem['organization~']?.localizedName || 'Unknown Organization',
        vanityName: elem['organization~']?.vanityName,
      })).filter((org: any) => org.urn);
      
      res.json({ organizations });
    } catch (error) {
      logError("Error fetching LinkedIn organizations:", error);
      res.status(500).json({ message: "Failed to fetch LinkedIn organizations" });
    }
  });

  // Add LinkedIn organization page connection
  app.post("/api/social/linkedin/organizations", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationUrn, organizationName } = req.body;
      
      if (!organizationUrn || !organizationName) {
        return res.status(400).json({ message: "Organization URN and name are required" });
      }
      
      // Get the user's personal LinkedIn connection to copy the access token
      const personalConnection = await storage.getSocialConnectionByPlatform(userId, 'linkedin');
      
      if (!personalConnection || !personalConnection.accessToken) {
        return res.status(400).json({ message: "No LinkedIn connection found. Please connect your LinkedIn account first." });
      }
      
      // Check if this org page is already connected
      const existingConnections = await storage.getSocialConnections(userId);
      const existingOrgConnection = existingConnections.find(
        c => c.platform === 'linkedin' && c.organizationUrn === organizationUrn
      );
      
      if (existingOrgConnection) {
        return res.status(400).json({ message: "This organization page is already connected" });
      }
      
      // Create a new connection for the organization page
      const newConnection = await storage.createSocialConnection({
        userId,
        platform: 'linkedin',
        accessToken: personalConnection.accessToken, // Same token works for org
        accountId: personalConnection.accountId,
        accountName: organizationName,
        tokenExpiresAt: personalConnection.tokenExpiresAt,
        isActive: true,
        connectionType: 'organization',
        organizationUrn,
        organizationName,
      });
      
      res.status(201).json(newConnection);
    } catch (error) {
      logError("Error adding LinkedIn organization connection:", error);
      res.status(500).json({ message: "Failed to add organization connection" });
    }
  });

  // Twitter/X OAuth 2.0 with PKCE endpoints
  app.get("/api/social/twitter/authorize", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const credentials = await storage.getSocialMediaCredentials(organizationId);
      const twitterCred = credentials.find(c => c.provider === 'twitter');
      
      if (!twitterCred || !twitterCred.clientId || !twitterCred.isConfigured) {
        return res.status(400).json({ 
          message: "Twitter OAuth is not configured. Please add your Twitter App credentials in Settings > Integrations." 
        });
      }
      
      let clientId: string;
      try {
        clientId = decrypt(twitterCred.clientId);
        logInfo(`Twitter client ID (first 8 chars): ${clientId.substring(0, 8)}...`);
      } catch (error) {
        logError("Error decrypting Twitter client ID:", error);
        return res.status(500).json({ message: "Failed to decrypt Twitter credentials" });
      }
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = randomBytes(32).toString('base64url');
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
      const state = randomBytes(32).toString('hex');
      
      (req.session as any).twitterState = state;
      (req.session as any).twitterCodeVerifier = codeVerifier;
      (req.session as any).twitterUserId = userId;
      
      const appUrl = process.env.APP_URL || 
        (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : (process.env.REPL_SLUG && process.env.REPL_OWNER 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER.toLowerCase()}.repl.co`
            : 'http://localhost:5000'));
      const redirectUri = `${appUrl}/api/social/twitter/callback`;
      
      logInfo(`Twitter OAuth redirect URI: ${redirectUri}`);
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
        scope: 'tweet.write tweet.read users.read offline.access',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      
      const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
      res.redirect(authUrl);
    } catch (error) {
      logError("Error initiating Twitter OAuth:", error);
      res.status(500).json({ message: "Failed to initiate Twitter OAuth" });
    }
  });

  app.get("/api/social/twitter/callback", async (req: any, res) => {
    try {
      const { code, state, error, error_description } = req.query;
      
      if (error) {
        logError("Twitter OAuth error:", error, error_description);
        return res.redirect('/social?error=' + encodeURIComponent(error_description || error));
      }
      
      if (!code || !state) {
        return res.redirect('/social?error=' + encodeURIComponent('Missing authorization code or state'));
      }
      
      const sessionState = (req.session as any).twitterState;
      const codeVerifier = (req.session as any).twitterCodeVerifier;
      const userId = (req.session as any).twitterUserId;
      
      if (!sessionState || state !== sessionState) {
        return res.redirect('/social?error=' + encodeURIComponent('Invalid state parameter. Please try again.'));
      }
      
      delete (req.session as any).twitterState;
      delete (req.session as any).twitterCodeVerifier;
      delete (req.session as any).twitterUserId;
      
      if (!userId || !codeVerifier) {
        return res.redirect('/social?error=' + encodeURIComponent('Session expired. Please log in and try again.'));
      }
      
      const organizationId = await getOrganizationId(userId, req.session);
      const credentials = await storage.getSocialMediaCredentials(organizationId);
      const twitterCred = credentials.find(c => c.provider === 'twitter');
      
      if (!twitterCred || !twitterCred.clientId || !twitterCred.clientSecret) {
        return res.redirect('/social?error=' + encodeURIComponent('Twitter credentials not found'));
      }
      
      let clientId: string, clientSecret: string;
      try {
        clientId = decrypt(twitterCred.clientId);
        clientSecret = decrypt(twitterCred.clientSecret);
      } catch (error) {
        logError("Error decrypting Twitter credentials:", error);
        return res.redirect('/social?error=' + encodeURIComponent('Failed to decrypt credentials'));
      }
      
      const appUrl = process.env.APP_URL || 
        (process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : (process.env.REPL_SLUG && process.env.REPL_OWNER 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER.toLowerCase()}.repl.co`
            : 'http://localhost:5000'));
      const redirectUri = `${appUrl}/api/social/twitter/callback`;
      
      // Exchange authorization code for access token
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        logError("Twitter token exchange failed:", errorData);
        return res.redirect('/social?error=' + encodeURIComponent('Failed to exchange authorization code'));
      }
      
      const tokenData = await tokenResponse.json() as { 
        access_token: string; 
        expires_in: number; 
        refresh_token?: string;
        token_type: string;
      };
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in;
      
      // Get user info from Twitter
      const userInfoResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      let accountId = 'unknown';
      let accountName = 'Twitter User';
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json() as { data?: { id?: string; username?: string; name?: string } };
        accountId = userInfo.data?.id || 'unknown';
        accountName = userInfo.data?.name || userInfo.data?.username || 'Twitter User';
      } else {
        logWarn("Failed to fetch Twitter user info, continuing with unknown ID");
      }
      
      const existingConnection = await storage.getSocialConnectionByPlatform(userId, 'twitter');
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      
      if (existingConnection) {
        await storage.updateSocialConnection(existingConnection.id, {
          accessToken: encrypt(accessToken),
          refreshToken: refreshToken ? encrypt(refreshToken) : null,
          accountId,
          accountName,
          tokenExpiresAt,
          isActive: true,
        });
      } else {
        await storage.createSocialConnection({
          userId,
          platform: 'twitter',
          accessToken: encrypt(accessToken),
          refreshToken: refreshToken ? encrypt(refreshToken) : null,
          accountId,
          accountName,
          tokenExpiresAt,
          isActive: true,
        });
      }
      
      logInfo(`Twitter OAuth completed for user ${userId}`);
      res.redirect('/social?success=' + encodeURIComponent('Twitter account connected successfully!'));
    } catch (error) {
      logError("Error in Twitter OAuth callback:", error);
      res.redirect('/social?error=' + encodeURIComponent('An unexpected error occurred'));
    }
  });

  // Event Pages routes (site builder)
  app.get("/api/events/:eventId/pages", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const pages = await storage.getEventPages(organizationId, eventId);
      res.json(pages);
    } catch (error) {
      logError("Error fetching event pages:", error);
      res.status(500).json({ message: "Failed to fetch event pages" });
    }
  });

  app.get("/api/events/:eventId/pages/:pageType", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { eventId, pageType } = req.params;
      const page = await storage.getEventPageByType(organizationId, eventId, pageType);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      logError("Error fetching event page:", error);
      res.status(500).json({ message: "Failed to fetch event page" });
    }
  });

  app.post("/api/events/:eventId/pages", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      // Extract id separately since it's omitted from insertEventPageSchema for normal creates
      // but needed for custom page updates
      const { theme, id: pageId, ...rest } = req.body;
      
      // Sanitize customCss in theme before persisting to prevent XSS
      const sanitizedTheme = theme ? {
        ...theme,
        customCss: theme.customCss ? sanitizeCustomCss(theme.customCss) : undefined
      } : theme;
      
      const data = insertEventPageSchema.parse({ ...rest, organizationId, eventId });
      // Pass pageId for custom page updates (upsertEventPage uses it to decide update vs insert)
      const page = await storage.upsertEventPage({ ...data, theme: sanitizedTheme, id: pageId });
      res.status(201).json(page);
    } catch (error) {
      logError("Error creating/updating event page:", error);
      res.status(400).json({ message: "Invalid event page data" });
    }
  });

  app.patch("/api/events/:eventId/pages/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      // Sanitize customCss in theme before persisting to prevent XSS
      const updateData = { ...req.body };
      if (updateData.theme?.customCss) {
        updateData.theme = {
          ...updateData.theme,
          customCss: sanitizeCustomCss(updateData.theme.customCss)
        };
      }
      
      const page = await storage.updateEventPage(organizationId, req.params.id, updateData);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      logError("Error updating event page:", error);
      res.status(400).json({ message: "Failed to update event page" });
    }
  });

  app.delete("/api/events/:eventId/pages/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteEventPage(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting event page:", error);
      res.status(500).json({ message: "Failed to delete event page" });
    }
  });

  // Page Version routes (version history)
  app.get("/api/events/:eventId/pages/:pageId/versions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { pageId } = req.params;
      
      const page = await storage.getEventPage(organizationId, pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const versions = await storage.getPageVersions(organizationId, pageId);
      res.json(versions);
    } catch (error) {
      logError("Error fetching page versions:", error);
      res.status(500).json({ message: "Failed to fetch page versions" });
    }
  });

  const createVersionSchema = z.object({
    label: z.string().optional(),
    sections: z.array(z.any()).optional(),
    theme: z.record(z.any()).optional(),
    seo: z.record(z.any()).optional(),
  });

  app.post("/api/events/:eventId/pages/:pageId/versions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { pageId } = req.params;
      
      const page = await storage.getEventPage(organizationId, pageId);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const validatedData = createVersionSchema.parse(req.body);
      
      const latestVersion = await storage.getLatestVersionNumber(organizationId, pageId);
      const version = await storage.createPageVersion({
        organizationId,
        eventPageId: pageId,
        version: latestVersion + 1,
        ...validatedData,
      });
      res.status(201).json(version);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid version data", errors: error.errors });
      }
      logError("Error creating page version:", error);
      res.status(400).json({ message: "Failed to create page version" });
    }
  });

  app.post("/api/events/:eventId/pages/:pageId/versions/:versionId/restore", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { pageId, versionId } = req.params;
      
      const currentPage = await storage.getEventPage(organizationId, pageId);
      if (!currentPage) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const version = await storage.getPageVersion(organizationId, versionId);
      if (!version || version.eventPageId !== pageId) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      // Use transaction with direct db calls
      const result = await db.transaction(async (tx) => {
        // Get latest version number
        const [latestRow] = await tx.select({ version: pageVersions.version })
          .from(pageVersions)
          .where(and(
            eq(pageVersions.organizationId, organizationId),
            eq(pageVersions.eventPageId, pageId)
          ))
          .orderBy(desc(pageVersions.version))
          .limit(1);
        const latestVersion = latestRow?.version ?? 0;
        
        // Create snapshot of current state before restoring
        await tx.insert(pageVersions).values({
          organizationId,
          eventPageId: pageId,
          version: latestVersion + 1,
          label: "Before restore",
          sections: currentPage.sections,
          theme: currentPage.theme,
          seo: currentPage.seo,
        });
        
        // Restore the page to the selected version
        const [updated] = await tx.update(eventPages)
          .set({
            sections: version.sections,
            theme: version.theme,
            seo: version.seo,
            updatedAt: new Date(),
          })
          .where(and(
            eq(eventPages.organizationId, organizationId),
            eq(eventPages.id, pageId)
          ))
          .returning();
        
        return updated;
      });
      
      res.json(result);
    } catch (error) {
      logError("Error restoring page version:", error);
      res.status(500).json({ message: "Failed to restore page version" });
    }
  });

  // Registration config routes
  app.get("/api/events/:eventId/registration-config", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const config = await storage.getRegistrationConfig(organizationId, req.params.eventId);
      res.json(config || null);
    } catch (error) {
      logError("Error fetching registration config:", error);
      res.status(500).json({ message: "Failed to fetch registration config" });
    }
  });

  app.post("/api/events/:eventId/registration-config", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const data = {
        ...req.body,
        organizationId,
        eventId,
      };
      const config = await storage.upsertRegistrationConfig(data);
      res.status(201).json(config);
    } catch (error) {
      logError("Error saving registration config:", error);
      res.status(400).json({ message: "Failed to save registration config" });
    }
  });

  // Custom Fields routes
  app.get("/api/custom-fields", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const fields = await storage.getCustomFields(organizationId);
      res.json(fields);
    } catch (error) {
      logError("Error fetching custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.post("/api/custom-fields", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const data = insertCustomFieldSchema.parse({ ...req.body, organizationId });
      const field = await storage.createCustomField(data);
      res.status(201).json(field);
    } catch (error) {
      logError("Error creating custom field:", error);
      res.status(400).json({ message: "Invalid custom field data" });
    }
  });

  app.patch("/api/custom-fields/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const field = await storage.updateCustomField(organizationId, req.params.id, req.body);
      if (!field) {
        return res.status(404).json({ message: "Custom field not found" });
      }
      res.json(field);
    } catch (error) {
      logError("Error updating custom field:", error);
      res.status(400).json({ message: "Failed to update custom field" });
    }
  });

  app.delete("/api/custom-fields/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      await storage.deleteCustomField(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting custom field:", error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  // Public custom fields endpoint (no auth required)
  app.get("/api/public/custom-fields/:slug", async (req, res) => {
    try {
      const fields = await storage.getActiveCustomFieldsByEventSlug(req.params.slug);
      res.json(fields);
    } catch (error) {
      logError("Error fetching public custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  // Payment endpoints for public registration
  app.get("/api/public/event/:slug/payment-config", async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const org = await storage.getOrganization(event.organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json({
        paymentEnabled: org.paymentEnabled ?? false,
        stripePublishableKey: org.paymentEnabled ? org.stripePublishableKey : null,
      });
    } catch (error) {
      logError("Error fetching payment config:", error);
      res.status(500).json({ message: "Failed to fetch payment configuration" });
    }
  });

  app.post("/api/public/event/:slug/create-payment-intent", createPaymentIntentLimiter, async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published') || !event.registrationOpen) {
        return res.status(404).json({ message: "Registration not available" });
      }
      
      const { packageId, inviteCodeId, currency } = req.body;
      
      if (!packageId) {
        return res.status(400).json({ message: "Package is required for payment" });
      }
      
      // Validate currency if provided
      const allowedCurrencies = ["usd", "eur", "gbp", "cad", "aud"];
      const selectedCurrency = (currency || "usd").toLowerCase();
      if (!allowedCurrencies.includes(selectedCurrency)) {
        return res.status(400).json({ message: "Invalid currency" });
      }
      
      // Get package details
      const pkg = await storage.getPackage(event.organizationId, packageId);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      
      // Check for event-specific price override
      const eventPackages = await storage.getEventPackages(event.organizationId, event.id);
      const override = eventPackages.find(ep => ep.packageId === packageId);
      let price = parseFloat(override?.priceOverride ?? pkg.price ?? "0");
      
      // Apply discount if invite code provided
      if (inviteCodeId) {
        const inviteCode = await storage.getInviteCode(event.organizationId, inviteCodeId);
        if (inviteCode && inviteCode.isActive) {
          price = calculateFinalPrice(price, inviteCode.discountType, inviteCode.discountValue);
        }
      }
      
      // Validate amount - must be finite, non-negative and within limits
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 999999.99) {
        logError("Invalid payment amount calculated", "Payment");
        return res.status(400).json({ message: "Invalid payment amount" });
      }
      
      // If price is 0 or less, no payment needed
      if (price <= 0) {
        return res.json({ 
          paymentRequired: false,
          finalPrice: 0,
        });
      }
      
      // Create payment intent
      const result = await createPaymentIntent(
        event.organizationId,
        price,
        selectedCurrency,
        {
          eventId: event.id,
          eventName: event.name,
          packageId: pkg.id,
          packageName: pkg.name,
        }
      );
      
      if (!result) {
        return res.status(400).json({ message: "Payment processing is not configured for this organization" });
      }
      
      res.json({
        paymentRequired: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        finalPrice: price,
      });
    } catch (error) {
      logError(error, "Payment");
      res.status(500).json({ message: "An error occurred processing your request" });
    }
  });

  app.post("/api/public/event/:slug/verify-payment", verifyPaymentLimiter, async (req: any, res) => {
    try {
      const event = await resolveEventBySlug(req, req.params.slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }
      
      // Validate paymentIntentId format (Stripe format: pi_*)
      if (typeof paymentIntentId !== 'string' || !/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) {
        return res.status(400).json({ message: "Invalid payment intent ID format" });
      }
      
      const paymentIntent = await getPaymentIntent(event.organizationId, paymentIntentId);
      
      if (!paymentIntent) {
        return res.status(400).json({ message: "Payment verification failed" });
      }
      
      res.json({
        verified: paymentIntent.status === "succeeded",
        status: paymentIntent.status,
      });
    } catch (error) {
      logError(error, "Payment");
      res.status(500).json({ message: "An error occurred processing your request" });
    }
  });

  // Public housing/booking link endpoint (for post-registration flow)
  // Requires checkInCode as a secret to verify the request is from the attendee
  app.get("/api/public/event/:slug/housing/:attendeeId", async (req: any, res) => {
    try {
      const { slug, attendeeId } = req.params;
      const { code } = req.query;
      
      // Require checkInCode for authentication
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Check-in code is required" });
      }
      
      const event = await resolveEventBySlug(req, slug);
      if (!event || (!event.isPublic && event.status !== 'published')) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get the attendee and verify they belong to this event
      const attendee = await storage.getAttendee(event.organizationId, attendeeId);
      if (!attendee || attendee.eventId !== event.id) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      
      // Verify the checkInCode matches (security check)
      if (attendee.checkInCode !== code) {
        return res.status(403).json({ message: "Invalid check-in code" });
      }
      
      // Check if housing is enabled for this event
      const mapping = await storage.getPasskeyEventMapping(event.organizationId, event.id);
      if (!mapping || !mapping.isEnabled) {
        return res.json({ housingEnabled: false });
      }
      
      // Build the booking URL with attendee information
      // Use regLinkUrl if configured, otherwise fall back to passkeyEventId (which is also a URL)
      let bookingUrl = null;
      const baseUrl = mapping.regLinkUrl || mapping.passkeyEventId;
      if (baseUrl) {
        try {
          const url = new URL(baseUrl);
          url.searchParams.set('firstName', attendee.firstName);
          url.searchParams.set('lastName', attendee.lastName);
          if (attendee.email) {
            url.searchParams.set('email', attendee.email);
          }
          if (attendee.phone) {
            url.searchParams.set('phone', attendee.phone);
          }
          bookingUrl = url.toString();
        } catch (e) {
          // If the URL is invalid, just use it as-is without query params
          bookingUrl = baseUrl;
        }
      }
      
      res.json({
        housingEnabled: true,
        bookingUrl,
        passkeyEventName: mapping.passkeyEventName,
      });
    } catch (error) {
      logError("Error fetching housing info:", error);
      res.status(500).json({ message: "Failed to fetch housing information" });
    }
  });

  // Object Storage routes
  // Serve uploaded objects (public access for email rendering)
  app.get("/objects/*", async (req, res) => {
    try {
      const objectPath = `/objects/${req.params[0]}`;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found" });
      }
      logError("Error serving object:", error);
      res.status(500).json({ message: "Failed to serve object" });
    }
  });

  // Get presigned upload URL
  app.post("/api/content/assets/upload", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadUrl });
    } catch (error) {
      logError("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Create content asset record after upload
  app.post("/api/content/assets", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const { fileName, mimeType, byteSize, uploadUrl } = req.body;
      
      if (!fileName || !mimeType || !uploadUrl) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Normalize the upload URL to an object path and set ACL to public
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadUrl, {
        owner: userId,
        visibility: "public",
      });
      
      // Construct public URL
      const publicUrl = `${req.protocol}://${req.get("host")}${objectPath}`;
      
      const data = insertContentAssetSchema.parse({
        organizationId,
        fileName,
        mimeType,
        byteSize: byteSize || 0,
        objectPath,
        publicUrl,
        uploadedBy: userId,
      });
      
      const asset = await storage.createContentAsset(data);
      res.status(201).json(asset);
    } catch (error: any) {
      logError("Error creating content asset:", error);
      res.status(400).json({ message: error.message || "Failed to create content asset" });
    }
  });

  // List all content assets for the organization
  app.get("/api/content/assets", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const assets = await storage.getContentAssets(organizationId);
      res.json(assets);
    } catch (error) {
      logError("Error fetching content assets:", error);
      res.status(500).json({ message: "Failed to fetch content assets" });
    }
  });

  // Delete a content asset
  app.delete("/api/content/assets/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const asset = await storage.getContentAsset(req.params.id, organizationId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      await storage.deleteContentAsset(req.params.id, organizationId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting content asset:", error);
      res.status(500).json({ message: "Failed to delete content asset" });
    }
  });

  // AI Content Generation endpoint
  app.post("/api/ai/generate-content", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const { sectionType, eventId, customPrompt } = req.body;
      
      if (!sectionType || !eventId) {
        return res.status(400).json({ message: "sectionType and eventId are required" });
      }
      
      // Validate section type
      const validSectionTypes = ["hero", "text", "cta", "features", "faq", "testimonials"];
      if (!validSectionTypes.includes(sectionType)) {
        return res.status(400).json({ message: `Invalid section type. Supported types: ${validSectionTypes.join(", ")}` });
      }
      
      // Fetch event details
      const event = await storage.getEvent(eventId, organizationId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Build location string
      const locationParts = [event.location, event.city, event.state, event.country].filter(Boolean);
      const eventLocation = locationParts.length > 0 ? locationParts.join(", ") : undefined;
      
      // Format date
      const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) : undefined;
      
      // Generate content using AI
      const generatedContent = await generateSectionContent({
        sectionType,
        eventName: event.name,
        eventDescription: event.description || undefined,
        eventDate,
        eventLocation,
        prompt: customPrompt,
      });
      
      logInfo(`AI content generated for event ${eventId}, section type: ${sectionType}`);
      
      res.json(generatedContent);
    } catch (error: any) {
      logError("Error generating AI content:", error);
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });

  // ============================================
  // CFP (Call for Papers) Routes
  // ============================================

  // Admin CFP Config Routes
  app.get("/api/events/:eventId/cfp", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const config = await storage.getCfpConfig(eventId, organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      res.json(config);
    } catch (error) {
      logError("Error fetching CFP config:", error);
      res.status(500).json({ message: "Failed to fetch CFP config" });
    }
  });

  app.post("/api/events/:eventId/cfp", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      // Convert date strings to Date objects
      const body = { ...req.body };
      if (body.submissionDeadline && typeof body.submissionDeadline === 'string') {
        body.submissionDeadline = new Date(body.submissionDeadline);
      }
      if (body.notificationDate && typeof body.notificationDate === 'string') {
        body.notificationDate = new Date(body.notificationDate);
      }
      
      // Check if config already exists
      const existing = await storage.getCfpConfig(eventId, organizationId);
      if (existing) {
        // Update existing config
        const data = insertCfpConfigSchema.partial().parse(body);
        const updated = await storage.updateCfpConfig(existing.id, organizationId, data);
        return res.json(updated);
      }
      
      // Create new config
      const data = insertCfpConfigSchema.parse({
        ...body,
        eventId,
        organizationId,
      });
      const config = await storage.createCfpConfig(data);
      res.status(201).json(config);
    } catch (error: any) {
      logError("Error creating/updating CFP config:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid CFP config data";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/events/:eventId/cfp", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      // Convert date strings to Date objects
      const body = { ...req.body };
      if (body.submissionDeadline && typeof body.submissionDeadline === 'string') {
        body.submissionDeadline = new Date(body.submissionDeadline);
      }
      if (body.notificationDate && typeof body.notificationDate === 'string') {
        body.notificationDate = new Date(body.notificationDate);
      }
      
      const existing = await storage.getCfpConfig(eventId, organizationId);
      if (!existing) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      
      const data = insertCfpConfigSchema.partial().parse(body);
      const updated = await storage.updateCfpConfig(existing.id, organizationId, data);
      res.json(updated);
    } catch (error: any) {
      logError("Error updating CFP config:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid CFP config data";
      res.status(400).json({ message });
    }
  });

  // CFP Topics Routes
  app.get("/api/events/:eventId/cfp/topics", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const config = await storage.getCfpConfig(eventId, organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      
      const topics = await storage.getCfpTopics(config.id, organizationId);
      res.json(topics);
    } catch (error) {
      logError("Error fetching CFP topics:", error);
      res.status(500).json({ message: "Failed to fetch CFP topics" });
    }
  });

  app.post("/api/events/:eventId/cfp/topics", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const config = await storage.getCfpConfig(eventId, organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      
      const data = insertCfpTopicSchema.parse({
        ...req.body,
        cfpConfigId: config.id,
        organizationId,
      });
      const topic = await storage.createCfpTopic(data);
      res.status(201).json(topic);
    } catch (error: any) {
      logError("Error creating CFP topic:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid topic data";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/events/:eventId/cfp/topics/:topicId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const topicId = parseInt(req.params.topicId, 10);
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }
      
      const data = insertCfpTopicSchema.partial().parse(req.body);
      const updated = await storage.updateCfpTopic(topicId, organizationId, data);
      if (!updated) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(updated);
    } catch (error: any) {
      logError("Error updating CFP topic:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid topic data";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/events/:eventId/cfp/topics/:topicId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const topicId = parseInt(req.params.topicId, 10);
      
      if (isNaN(topicId)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }
      
      const deleted = await storage.deleteCfpTopic(topicId, organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.status(204).send();
    } catch (error) {
      logError("Error deleting CFP topic:", error);
      res.status(500).json({ message: "Failed to delete topic" });
    }
  });

  // CFP Submissions Routes
  app.get("/api/events/:eventId/cfp/submissions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const config = await storage.getCfpConfig(eventId, organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      
      const submissions = await storage.getCfpSubmissions(config.id, organizationId);
      res.json(submissions);
    } catch (error) {
      logError("Error fetching CFP submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get("/api/events/:eventId/cfp/submissions/:submissionId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const submissionId = parseInt(req.params.submissionId, 10);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      const submission = await storage.getCfpSubmission(submissionId, organizationId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Get reviews for this submission
      const reviews = await storage.getCfpReviews(submissionId, organizationId);
      
      res.json({ ...submission, reviews });
    } catch (error) {
      logError("Error fetching CFP submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.patch("/api/events/:eventId/cfp/submissions/:submissionId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const submissionId = parseInt(req.params.submissionId, 10);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      // Get the current submission to check if status is changing to accepted
      const currentSubmission = await storage.getCfpSubmission(submissionId, organizationId);
      if (!currentSubmission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      const data = insertCfpSubmissionSchema.partial().parse(req.body);
      const updated = await storage.updateCfpSubmission(submissionId, organizationId, data);
      if (!updated) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Send acceptance email if status changed to accepted
      if (data.status === 'accepted' && currentSubmission.status !== 'accepted') {
        try {
          const event = await storage.getEvent(organizationId, eventId);
          if (event && updated.authorEmail) {
            // Check if invite code already exists for this submission
            let existingCode = await storage.getInviteCodeBySubmission(organizationId, eventId, submissionId);
            
            // Create a unique invite code for the speaker if one doesn't exist
            if (!existingCode) {
              const uniqueCode = `SPEAKER-${submissionId}-${randomBytes(4).toString('hex').toUpperCase()}`;
              existingCode = await storage.createInviteCode({
                organizationId,
                eventId,
                code: uniqueCode,
                quantity: 1,
                cfpSubmissionId: submissionId,
                isActive: true,
              });
            }
            
            // Create a speaker record for the submitter so they appear on the Speakers page
            const nameParts = updated.authorName.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Check if speaker already exists for this email
            let speaker = await storage.getSpeakerByEmail(organizationId, eventId, updated.authorEmail);
            if (!speaker) {
              speaker = await storage.createSpeaker({
                organizationId,
                eventId,
                firstName,
                lastName,
                email: updated.authorEmail,
                company: updated.authorAffiliation || undefined,
                bio: updated.bio || undefined,
                speakerRole: 'speaker',
              });
              logInfo(`Created speaker ${speaker.id} from accepted CFP submission ${submissionId}`);
            }
            
            await sendSubmissionAcceptanceEmail({
              authorEmail: updated.authorEmail,
              authorName: updated.authorName,
              submissionTitle: updated.title,
              eventName: event.name,
              eventSlug: event.publicSlug || event.id,
              inviteCode: existingCode.code,
            });
          }
        } catch (emailError) {
          logError("Failed to send acceptance notification email:", emailError);
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      logError("Error updating CFP submission:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid submission data";
      res.status(400).json({ message });
    }
  });

  app.post("/api/events/:eventId/cfp/submissions/:submissionId/resend-acceptance", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const submissionId = parseInt(req.params.submissionId, 10);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      const submission = await storage.getCfpSubmission(submissionId, organizationId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      if (submission.status !== 'accepted') {
        return res.status(400).json({ message: "Can only resend acceptance email for accepted submissions" });
      }
      
      const event = await storage.getEvent(organizationId, eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (!submission.authorEmail) {
        return res.status(400).json({ message: "Submission has no author email" });
      }
      
      // Check if invite code already exists for this submission
      let existingCode = await storage.getInviteCodeBySubmission(organizationId, eventId, submissionId);
      
      // Create a unique invite code for the speaker if one doesn't exist
      if (!existingCode) {
        const uniqueCode = `SPEAKER-${submissionId}-${randomBytes(4).toString('hex').toUpperCase()}`;
        existingCode = await storage.createInviteCode({
          organizationId,
          eventId,
          code: uniqueCode,
          quantity: 1,
          cfpSubmissionId: submissionId,
          isActive: true,
        });
      }
      
      const result = await sendSubmissionAcceptanceEmail({
        authorEmail: submission.authorEmail,
        authorName: submission.authorName,
        submissionTitle: submission.title,
        eventName: event.name,
        eventSlug: event.publicSlug || event.id,
        inviteCode: existingCode.code,
      });
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || "Failed to send email" });
      }
      
      res.json({ message: "Acceptance email sent successfully" });
    } catch (error) {
      logError("Error resending acceptance email:", error);
      res.status(500).json({ message: "Failed to resend acceptance email" });
    }
  });

  app.delete("/api/events/:eventId/cfp/submissions/:submissionId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const submissionId = parseInt(req.params.submissionId, 10);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      const deleted = await storage.deleteCfpSubmission(submissionId, organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Submission not found" });
      }
      res.status(204).send();
    } catch (error) {
      logError("Error deleting CFP submission:", error);
      res.status(500).json({ message: "Failed to delete submission" });
    }
  });

  // CFP Reviewers Routes
  app.get("/api/events/:eventId/cfp/reviewers", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const config = await storage.getCfpConfig(eventId, organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      
      const reviewers = await storage.getCfpReviewers(config.id, organizationId);
      res.json(reviewers);
    } catch (error) {
      logError("Error fetching CFP reviewers:", error);
      res.status(500).json({ message: "Failed to fetch reviewers" });
    }
  });

  app.post("/api/events/:eventId/cfp/reviewers", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      
      if (!eventId) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const config = await storage.getCfpConfig(eventId, organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP config not found" });
      }
      
      const data = insertCfpReviewerSchema.parse({
        ...req.body,
        cfpConfigId: config.id,
        organizationId,
      });
      const reviewer = await storage.createCfpReviewer(data);
      res.status(201).json(reviewer);
    } catch (error: any) {
      logError("Error creating CFP reviewer:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid reviewer data";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/events/:eventId/cfp/reviewers/:reviewerId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const reviewerId = parseInt(req.params.reviewerId, 10);
      
      if (isNaN(reviewerId)) {
        return res.status(400).json({ message: "Invalid reviewer ID" });
      }
      
      const data = insertCfpReviewerSchema.partial().parse(req.body);
      const updated = await storage.updateCfpReviewer(reviewerId, organizationId, data);
      if (!updated) {
        return res.status(404).json({ message: "Reviewer not found" });
      }
      res.json(updated);
    } catch (error: any) {
      logError("Error updating CFP reviewer:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid reviewer data";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/events/:eventId/cfp/reviewers/:reviewerId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const reviewerId = parseInt(req.params.reviewerId, 10);
      
      if (isNaN(reviewerId)) {
        return res.status(400).json({ message: "Invalid reviewer ID" });
      }
      
      const deleted = await storage.deleteCfpReviewer(reviewerId, organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Reviewer not found" });
      }
      res.status(204).send();
    } catch (error) {
      logError("Error deleting CFP reviewer:", error);
      res.status(500).json({ message: "Failed to delete reviewer" });
    }
  });

  // Assign reviewer to submission
  app.post("/api/events/:eventId/cfp/submissions/:submissionId/assign-reviewer", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const submissionId = parseInt(req.params.submissionId, 10);
      const { reviewerId } = req.body;
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      if (!reviewerId || isNaN(parseInt(reviewerId, 10))) {
        return res.status(400).json({ message: "Invalid reviewer ID" });
      }
      
      // Verify submission exists
      const submission = await storage.getCfpSubmission(submissionId, organizationId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Verify reviewer exists
      const reviewer = await storage.getCfpReviewer(parseInt(reviewerId, 10), organizationId);
      if (!reviewer) {
        return res.status(404).json({ message: "Reviewer not found" });
      }
      
      const review = await storage.assignReviewerToSubmission(submissionId, parseInt(reviewerId, 10), organizationId);
      
      // Send email notification to reviewer
      try {
        const event = await storage.getEvent(organizationId, eventId);
        if (event && reviewer.email) {
          await sendReviewerNotificationEmail({
            reviewerEmail: reviewer.email,
            reviewerName: reviewer.name || 'Reviewer',
            submissionTitle: submission.title,
            submissionId: submissionId,
            eventName: event.name,
            eventSlug: event.publicSlug || event.id,
          });
        }
      } catch (emailError) {
        // Log but don't fail the assignment if email fails
        logError("Failed to send reviewer notification email:", emailError);
      }
      
      res.status(201).json(review);
    } catch (error) {
      logError("Error assigning reviewer:", error);
      res.status(500).json({ message: "Failed to assign reviewer" });
    }
  });

  // Create session from accepted submission
  app.post("/api/events/:eventId/cfp/submissions/:submissionId/create-session", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.params.eventId;
      const submissionId = parseInt(req.params.submissionId, 10);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      const submission = await storage.getCfpSubmission(submissionId, organizationId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      if (submission.status !== 'accepted') {
        return res.status(400).json({ message: "Only accepted submissions can be converted to sessions" });
      }
      
      // Create session from submission
      const sessionData = insertSessionSchema.parse({
        organizationId,
        eventId,
        title: submission.title,
        description: submission.abstract,
        type: submission.type || 'presentation',
        status: 'scheduled',
        ...req.body, // Allow overrides for date, room, track, etc.
      });
      
      const session = await storage.createSession(sessionData);
      
      // Update submission with session reference
      await storage.updateCfpSubmission(submissionId, organizationId, {
        sessionId: session.id,
      });
      
      res.status(201).json(session);
    } catch (error: any) {
      logError("Error creating session from submission:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Failed to create session";
      res.status(400).json({ message });
    }
  });

  // ============================================
  // Public CFP Routes (no auth, rate limited)
  // ============================================

  app.get("/api/public/cfp/:slug", publicRegistrationLimiter, async (req: any, res) => {
    try {
      const { slug } = req.params;
      
      // Find event by public slug
      const event = await storage.getEventByPublicSlug(slug);
      if (!event) {
        return res.status(404).json({ message: "CFP not found" });
      }
      
      const config = await storage.getCfpConfig(event.id, event.organizationId);
      if (!config || !config.isOpen) {
        return res.status(404).json({ message: "CFP not found or not open" });
      }
      
      // Get topics
      const topics = await storage.getCfpTopics(config.id, event.organizationId);
      
      // Return public CFP info only
      res.json({
        title: config.title,
        description: config.description,
        topics: topics.map(t => ({ id: t.id, name: t.name, description: t.description })),
        submissionDeadline: config.submissionDeadline,
        isOpen: config.isOpen,
        eventName: event.name,
        guidelines: config.guidelines,
        maxAbstractLength: config.maxAbstractLength,
        allowMultipleSubmissions: config.allowMultipleSubmissions,
      });
    } catch (error) {
      logError("Error fetching public CFP:", error);
      res.status(500).json({ message: "Failed to fetch CFP" });
    }
  });

  app.post("/api/public/cfp/:slug/submit", publicRegistrationLimiter, async (req: any, res) => {
    try {
      const { slug } = req.params;
      
      // Find event by public slug
      const event = await storage.getEventByPublicSlug(slug);
      if (!event) {
        return res.status(404).json({ message: "CFP not found" });
      }
      
      const config = await storage.getCfpConfig(event.id, event.organizationId);
      if (!config) {
        return res.status(404).json({ message: "CFP not found" });
      }
      
      if (!config.isOpen) {
        return res.status(400).json({ message: "CFP is closed for submissions" });
      }
      
      // Check deadline
      if (config.submissionDeadline && new Date(config.submissionDeadline) < new Date()) {
        return res.status(400).json({ message: "CFP deadline has passed" });
      }
      
      // Validate submission
      const data = insertCfpSubmissionSchema.parse({
        ...req.body,
        cfpConfigId: config.id,
        eventId: event.id,
        organizationId: event.organizationId,
        status: 'pending',
      });
      
      const submission = await storage.createCfpSubmission(data);
      
      // Create a deliverable task for reviewing the CFP submission
      try {
        await storage.createDeliverable({
          organizationId: event.organizationId,
          eventId: event.id,
          title: `Review CFP: ${submission.title}`,
          description: `New CFP submission received from ${submission.authorName} (${submission.authorEmail}). Please review and assign reviewers.`,
          status: "todo",
          priority: "medium",
        });
      } catch (deliverableError) {
        logError("Error creating deliverable for CFP submission:", deliverableError);
        // Don't fail the submission if deliverable creation fails
      }
      
      res.status(201).json({
        id: submission.id,
        message: "Submission received successfully",
      });
    } catch (error: any) {
      logError("Error submitting to CFP:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid submission data";
      res.status(400).json({ message });
    }
  });

  // ============================================
  // Public Document Share Routes
  // ============================================

  app.get("/api/public/documents/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const result = await storage.getDocumentShareByToken(token);
      
      if (!result) {
        return res.status(404).json({ message: "Shared document not found or link has expired" });
      }
      
      const { share, document } = result;
      
      res.json({
        document: {
          id: document.id,
          name: document.name,
          description: document.description,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          fileUrl: document.fileUrl,
          createdAt: document.createdAt,
        },
        permission: share.permission,
        expiresAt: share.expiresAt,
      });
    } catch (error: any) {
      logError("Error fetching shared document:", error);
      res.status(500).json({ message: "Failed to fetch shared document" });
    }
  });

  // ============================================
  // Reviewer Routes (authenticated)
  // ============================================

  app.get("/api/reviewer/assignments", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      // Get all reviewer records for this user by userId
      let reviewerRecords = await storage.getCfpReviewersByUserId(userId);
      
      // If no records found by userId, try to find by email and auto-link
      if (reviewerRecords.length === 0 && userEmail) {
        const reviewersByEmail = await storage.getCfpReviewersByEmail(userEmail);
        // Link these reviewers to the user
        for (const reviewer of reviewersByEmail) {
          if (!reviewer.userId) {
            await storage.updateCfpReviewer(reviewer.id, reviewer.organizationId, { userId });
          }
        }
        // Fetch again after linking
        reviewerRecords = await storage.getCfpReviewersByUserId(userId);
        // If still empty, return the email-matched ones
        if (reviewerRecords.length === 0) {
          reviewerRecords = reviewersByEmail;
        }
      }
      
      if (reviewerRecords.length === 0) {
        return res.json([]);
      }
      
      // Get all reviews assigned to these reviewer records
      const allReviews: any[] = [];
      for (const reviewer of reviewerRecords) {
        const reviews = await storage.getCfpReviewsByReviewer(reviewer.id, reviewer.organizationId);
        for (const review of reviews) {
          const submission = await storage.getCfpSubmission(review.submissionId, reviewer.organizationId);
          if (submission) {
            allReviews.push({
              review,
              submission,
              reviewer,
            });
          }
        }
      }
      
      res.json(allReviews);
    } catch (error) {
      logError("Error fetching reviewer assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/reviewer/assignments/:submissionId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const submissionId = parseInt(req.params.submissionId, 10);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }
      
      // Get all reviewer records for this user (by userId or email)
      let reviewerRecords = await storage.getCfpReviewersByUserId(userId);
      if (reviewerRecords.length === 0 && userEmail) {
        reviewerRecords = await storage.getCfpReviewersByEmail(userEmail);
      }
      if (reviewerRecords.length === 0) {
        return res.status(403).json({ message: "Not authorized as a reviewer" });
      }
      
      // Find the submission and verify access
      for (const reviewer of reviewerRecords) {
        const reviews = await storage.getCfpReviewsByReviewer(reviewer.id, reviewer.organizationId);
        const review = reviews.find(r => r.submissionId === submissionId);
        if (review) {
          const submission = await storage.getCfpSubmission(submissionId, reviewer.organizationId);
          if (submission) {
            return res.json({
              review,
              submission,
              reviewer,
            });
          }
        }
      }
      
      res.status(404).json({ message: "Assignment not found" });
    } catch (error) {
      logError("Error fetching reviewer assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.patch("/api/reviewer/reviews/:reviewId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const reviewId = parseInt(req.params.reviewId, 10);
      
      if (isNaN(reviewId)) {
        return res.status(400).json({ message: "Invalid review ID" });
      }
      
      // Get all reviewer records for this user to find the one that owns this review
      let reviewerRecords = await storage.getCfpReviewersByUserId(userId);
      if (reviewerRecords.length === 0 && userEmail) {
        reviewerRecords = await storage.getCfpReviewersByEmail(userEmail);
      }
      if (reviewerRecords.length === 0) {
        return res.status(403).json({ message: "Not authorized as a reviewer" });
      }
      
      // Find the review and verify ownership
      for (const reviewer of reviewerRecords) {
        const reviews = await storage.getCfpReviewsByReviewer(reviewer.id, reviewer.organizationId);
        const existingReview = reviews.find(r => r.id === reviewId);
        if (existingReview) {
          const data = insertCfpReviewSchema.partial().parse(req.body);
          const updated = await storage.updateCfpReview(reviewId, reviewer.organizationId, data);
          if (updated) {
            // Check if the review status transitioned to "submitted" (only trigger on this explicit transition)
            const statusChangedToSubmitted = existingReview.status !== "submitted" && updated.status === "submitted";
            
            if (statusChangedToSubmitted) {
              // Create a deliverable for the submitted review
              try {
                const submission = await storage.getCfpSubmission(updated.submissionId, reviewer.organizationId);
                if (submission) {
                  await storage.createDeliverable({
                    organizationId: reviewer.organizationId,
                    eventId: submission.eventId,
                    title: `Review submitted: ${submission.title}`,
                    description: `${reviewer.name} submitted their review for "${submission.title}" by ${submission.authorName}. Score: ${updated.score ?? 'N/A'}, Recommendation: ${updated.recommendation ?? 'N/A'}.`,
                    status: "todo",
                    priority: "low",
                  });
                }
              } catch (deliverableError) {
                logError("Error creating deliverable for review submission:", deliverableError);
                // Don't fail the review update if deliverable creation fails
              }
            }
            
            return res.json(updated);
          }
        }
      }
      
      res.status(404).json({ message: "Review not found" });
    } catch (error: any) {
      logError("Error updating review:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid review data";
      res.status(400).json({ message });
    }
  });

  // Email Tracking Endpoints (PUBLIC - no auth required, but token validation)
  
  // 1x1 transparent tracking pixel for email opens
  const TRACKING_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  
  app.get("/api/email/track/open/:token.gif", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Validate signed token
      const validation = validateTrackingToken(token);
      if (!validation.valid) {
        logWarn('Invalid open tracking token', 'EmailTracking');
        res.set('Content-Type', 'image/gif');
        return res.send(TRACKING_PIXEL);
      }
      
      if (validation.expired) {
        logWarn('Expired open tracking token', 'EmailTracking');
        res.set('Content-Type', 'image/gif');
        return res.send(TRACKING_PIXEL);
      }
      
      const messageId = validation.data?.messageId;
      if (!messageId) {
        res.set('Content-Type', 'image/gif');
        return res.send(TRACKING_PIXEL);
      }
      
      const message = await storage.getEmailMessage(messageId);
      
      if (message) {
        await storage.incrementEmailOpenCount(messageId);
        await storage.createEmailEvent({
          messageId,
          organizationId: message.organizationId,
          eventType: 'open',
          metadata: {
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            timestamp: new Date().toISOString(),
          },
        });
        logInfo(`Email opened: ${messageId}`, 'EmailTracking');
      }
      
      res.set({
        'Content-Type': 'image/gif',
        'Content-Length': TRACKING_PIXEL.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.send(TRACKING_PIXEL);
    } catch (error) {
      logError("Error tracking email open:", error);
      res.set('Content-Type', 'image/gif');
      res.send(TRACKING_PIXEL);
    }
  });

  // Click tracking redirect
  app.get("/api/email/track/click/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Validate signed token
      const validation = validateTrackingToken(token);
      if (!validation.valid) {
        logWarn('Invalid click tracking token', 'EmailTracking');
        return res.status(400).send('Invalid tracking link');
      }
      
      if (validation.expired) {
        logWarn('Expired click tracking token', 'EmailTracking');
        return res.status(400).send('This link has expired');
      }
      
      const data = validation.data;
      if (!data?.messageId || !data?.url) {
        return res.status(400).send('Invalid tracking data');
      }
      
      const destinationUrl = data.url;
      
      // Validate URL scheme (only allow http/https)
      if (!isValidRedirectUrl(destinationUrl)) {
        logWarn(`Invalid redirect URL scheme: ${destinationUrl}`, 'EmailTracking');
        return res.status(400).send('Invalid redirect URL');
      }
      
      const message = await storage.getEmailMessage(data.messageId);
      
      if (message) {
        await storage.incrementEmailClickCount(data.messageId);
        await storage.createEmailEvent({
          messageId: data.messageId,
          organizationId: message.organizationId,
          eventType: 'click',
          metadata: {
            destinationUrl,
            linkIndex: data.linkIndex,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            timestamp: new Date().toISOString(),
          },
        });
        logInfo(`Email link clicked: ${data.messageId} -> ${destinationUrl}`, 'EmailTracking');
      }
      
      res.redirect(302, destinationUrl);
    } catch (error) {
      logError("Error tracking email click:", error);
      res.status(500).send('Error processing request');
    }
  });

  // Unsubscribe page
  app.get("/api/email/unsubscribe/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Validate signed token
      const validation = validateTrackingToken(token);
      if (!validation.valid) {
        return res.status(400).send('Invalid unsubscribe link');
      }
      
      if (validation.expired) {
        return res.status(400).send('This unsubscribe link has expired. Please contact support.');
      }
      
      const data = validation.data;
      if (!data?.organizationId || !data?.email) {
        return res.status(400).send('Invalid unsubscribe link');
      }
      
      const { organizationId, email } = data;

      // Check if already suppressed
      const existing = await storage.getEmailSuppression(organizationId, email);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Unsubscribe</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .card { background: #f8f9fa; border-radius: 8px; padding: 40px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .btn { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; border: none; cursor: pointer; font-size: 16px; }
            .btn:hover { background: #c82333; }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <div class="card">
            ${existing ? `
              <h1 class="success">Already Unsubscribed</h1>
              <p>You have already been unsubscribed from our email list.</p>
            ` : `
              <h1>Unsubscribe</h1>
              <p>Click the button below to unsubscribe from our emails.</p>
              <form method="POST" action="/api/email/unsubscribe/${token}">
                <button type="submit" class="btn">Confirm Unsubscribe</button>
              </form>
            `}
          </div>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      logError("Error showing unsubscribe page:", error);
      res.status(500).send('Error processing request');
    }
  });

  // Process unsubscribe
  app.post("/api/email/unsubscribe/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      // Validate signed token
      const validation = validateTrackingToken(token);
      if (!validation.valid) {
        return res.status(400).send('Invalid unsubscribe link');
      }
      
      if (validation.expired) {
        return res.status(400).send('This unsubscribe link has expired. Please contact support.');
      }
      
      const data = validation.data;
      if (!data?.organizationId || !data?.email) {
        return res.status(400).send('Invalid unsubscribe link');
      }
      
      const { organizationId, email } = data;

      // Add to suppression list
      const existing = await storage.getEmailSuppression(organizationId, email);
      if (!existing) {
        await storage.createEmailSuppression({
          organizationId,
          email: email.toLowerCase(),
          reason: 'unsubscribe',
          source: 'user_request',
        });
        logInfo(`Email unsubscribed: ${email} from org ${organizationId}`, 'EmailTracking');
      }
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Unsubscribed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .card { background: #f8f9fa; border-radius: 8px; padding: 40px; }
            h1 { color: #28a745; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Unsubscribed Successfully</h1>
            <p>You have been unsubscribed from our emails. You will no longer receive marketing emails from us.</p>
          </div>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      logError("Error processing unsubscribe:", error);
      res.status(500).send('Error processing request');
    }
  });

  // Resend webhook handler
  app.post("/api/email/webhooks/resend", async (req, res) => {
    try {
      const svixId = req.headers['svix-id'] as string | undefined;
      const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
      const svixSignature = req.headers['svix-signature'] as string | undefined;
      
      // Verify webhook signature (Resend uses Svix for webhooks)
      const rawBody = JSON.stringify(req.body);
      const isValidSignature = verifyResendWebhookSignature(rawBody, {
        svixId,
        svixTimestamp,
        svixSignature,
      });
      
      if (!isValidSignature) {
        logWarn('Invalid webhook signature', 'EmailWebhook');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body;
      const eventType = event.type;
      const data = event.data;
      
      logInfo(`Received Resend webhook: ${eventType}`, 'EmailWebhook');

      if (!data?.email_id) {
        return res.status(200).json({ received: true });
      }

      // Find the message by Resend message ID
      const message = await storage.getEmailMessageByResendId(data.email_id);
      
      if (!message) {
        logWarn(`No message found for Resend ID: ${data.email_id}`, 'EmailWebhook');
        return res.status(200).json({ received: true });
      }

      // Handle different event types
      switch (eventType) {
        case 'email.delivered':
          await storage.updateEmailMessage(message.id, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
          await storage.createEmailEvent({
            messageId: message.id,
            organizationId: message.organizationId,
            eventType: 'delivered',
            metadata: data,
          });
          break;

        case 'email.bounced':
          await storage.updateEmailMessage(message.id, {
            status: 'bounced',
            bouncedAt: new Date(),
          });
          await storage.createEmailEvent({
            messageId: message.id,
            organizationId: message.organizationId,
            eventType: 'bounced',
            metadata: data,
          });
          // Add to suppression list for hard bounces
          if (data.bounce?.type === 'hard') {
            const existing = await storage.getEmailSuppression(message.organizationId, message.recipientEmail);
            if (!existing) {
              await storage.createEmailSuppression({
                organizationId: message.organizationId,
                email: message.recipientEmail.toLowerCase(),
                reason: 'bounce',
                source: 'resend_webhook',
              });
            }
          }
          break;

        case 'email.complained':
          await storage.updateEmailMessage(message.id, {
            status: 'complained',
          });
          await storage.createEmailEvent({
            messageId: message.id,
            organizationId: message.organizationId,
            eventType: 'complained',
            metadata: data,
          });
          // Add to suppression list for complaints
          const existingSuppression = await storage.getEmailSuppression(message.organizationId, message.recipientEmail);
          if (!existingSuppression) {
            await storage.createEmailSuppression({
              organizationId: message.organizationId,
              email: message.recipientEmail.toLowerCase(),
              reason: 'complaint',
              source: 'resend_webhook',
            });
          }
          break;

        case 'email.opened':
          await storage.incrementEmailOpenCount(message.id);
          await storage.createEmailEvent({
            messageId: message.id,
            organizationId: message.organizationId,
            eventType: 'open',
            metadata: data,
          });
          break;

        case 'email.clicked':
          await storage.incrementEmailClickCount(message.id);
          await storage.createEmailEvent({
            messageId: message.id,
            organizationId: message.organizationId,
            eventType: 'click',
            metadata: data,
          });
          break;

        default:
          logInfo(`Unhandled webhook event type: ${eventType}`, 'EmailWebhook');
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logError("Error processing Resend webhook:", error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Email analytics endpoint (authenticated)
  app.get("/api/organizations/:organizationId/email-campaigns/:campaignId/analytics", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, campaignId } = req.params;
      
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify campaign belongs to this organization
      const campaign = await storage.getEmailCampaign(organizationId, campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const analytics = await storage.getEmailAnalyticsByCampaign(organizationId, campaignId);
      const messages = await storage.getEmailMessagesByCampaign(organizationId, campaignId);
      
      res.json({
        ...analytics,
        messages: messages.map(m => ({
          id: m.id,
          recipientEmail: m.recipientEmail,
          recipientName: m.recipientName,
          status: m.status,
          sentAt: m.sentAt,
          deliveredAt: m.deliveredAt,
          openedAt: m.openedAt,
          clickedAt: m.clickedAt,
          bouncedAt: m.bouncedAt,
          openCount: m.openCount,
          clickCount: m.clickCount,
        })),
      });
    } catch (error) {
      logError("Error fetching email analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Email suppressions management (authenticated)
  app.get("/api/organizations/:organizationId/email-suppressions", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId } = req.params;
      
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      const suppressions = await storage.getEmailSuppressions(organizationId);
      res.json(suppressions);
    } catch (error) {
      logError("Error fetching email suppressions:", error);
      res.status(500).json({ message: "Failed to fetch suppressions" });
    }
  });

  app.delete("/api/organizations/:organizationId/email-suppressions/:email", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, email } = req.params;
      
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEmailSuppression(organizationId, decodeURIComponent(email));
      res.json({ success: true });
    } catch (error) {
      logError("Error deleting email suppression:", error);
      res.status(500).json({ message: "Failed to delete suppression" });
    }
  });

  // Attendee email messages endpoint
  app.get("/api/organizations/:organizationId/attendees/:attendeeId/email-messages", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, attendeeId } = req.params;
      
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify attendee belongs to an event owned by this organization
      const attendee = await storage.getAttendee(organizationId, attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }

      const messages = await storage.getEmailMessagesByAttendee(organizationId, attendeeId);
      res.json(messages.map(m => ({
        id: m.id,
        subject: m.subject,
        recipientEmail: m.recipientEmail,
        status: m.status,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        openedAt: m.openedAt,
        clickedAt: m.clickedAt,
        bouncedAt: m.bouncedAt,
        openCount: m.openCount,
        clickCount: m.clickCount,
      })));
    } catch (error) {
      logError("Error fetching attendee email messages:", error);
      res.status(500).json({ message: "Failed to fetch email messages" });
    }
  });

  // Send email to a specific attendee using a template
  app.post("/api/organizations/:organizationId/attendees/:attendeeId/send-email", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, attendeeId } = req.params;
      const { templateId } = req.body;

      if (!templateId) {
        return res.status(400).json({ message: "Template ID is required" });
      }
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the attendee and verify they belong to this organization
      const attendee = await storage.getAttendee(organizationId, attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }

      // Get the email template
      const template = await storage.getEmailTemplate(organizationId, templateId);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }

      // Get the attendee's event for merge tag context
      const event = await storage.getEvent(organizationId, attendee.eventId);
      const organization = await storage.getOrganization(organizationId);

      // Generate calendar links for merge tag
      const attendeeCalendarLinksHtml = event?.startDate ? generateCalendarLinksHtml({
        title: event.name,
        description: event.description || '',
        location: event.location || '',
        startDate: event.startDate,
        endDate: event.endDate || undefined,
      }) : '';

      // Send the email using sendCampaignEmails
      const result = await sendCampaignEmails({
        subject: template.subject,
        content: template.content,
        recipients: [{
          email: attendee.email,
          firstName: attendee.firstName,
          lastName: attendee.lastName,
          company: attendee.company || undefined,
          checkInCode: attendee.checkInCode || undefined,
          attendeeId: attendee.id,
        }],
        eventContext: {
          name: event?.name,
          date: event?.startDate ? new Date(event.startDate).toLocaleDateString() : undefined,
          location: event?.location || undefined,
          description: event?.description || undefined,
          addToCalendar: attendeeCalendarLinksHtml,
        },
        organizationContext: {
          name: organization?.name,
        },
        organizationId,
        campaignId: undefined, // No campaign - direct send
        enableTracking: true,
        styles: template.styles as any || undefined,
      });

      if (result.totalFailed > 0) {
        return res.status(500).json({ 
          message: "Failed to send email", 
          error: result.errors[0]?.error 
        });
      }

      if (result.totalSkipped > 0) {
        return res.status(400).json({ 
          message: "Email was skipped (recipient may be on suppression list)" 
        });
      }

      // If this is an invite email template, update attendee status to "invited" (only if actually sent)
      if (template.isInviteEmail && result.totalSent > 0) {
        await storage.updateAttendee(organizationId, attendeeId, {
          registrationStatus: "invited",
        });
      }

      res.json({ 
        success: true, 
        message: "Email sent successfully",
        messageId: result.messageIds[0],
      });
    } catch (error) {
      logError("Error sending email to attendee:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Spoof attendee portal - allows organization owners to preview what an attendee would see
  app.get("/api/organizations/:organizationId/attendees/:attendeeId/spoof-portal", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, attendeeId } = req.params;
      
      // Verify user has access to this organization
      const members = await storage.getUserOrganizations(userId);
      const membership = members.find(m => m.organizationId === organizationId);
      if (!membership) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Only organization owners can use spoof/preview mode
      if (membership.role !== 'owner') {
        return res.status(403).json({ message: "Access denied - owner permission required" });
      }

      // Get the attendee and verify they belong to this organization
      const attendee = await storage.getAttendee(organizationId, attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }

      // Get event info for context
      const event = await storage.getEvent(organizationId, attendee.eventId);
      
      // Get package info if attendee has one
      let packageInfo = null;
      if (attendee.packageId) {
        packageInfo = await storage.getPackage(organizationId, attendee.packageId);
      }
      
      // Return attendee data (without password hash)
      const { passwordHash, ...safeAttendee } = attendee;
      res.json({ 
        attendee: safeAttendee, 
        event: event ? { id: event.id, name: event.name, publicSlug: event.publicSlug } : null,
        package: packageInfo ? { id: packageInfo.id, name: packageInfo.name, features: packageInfo.features } : null,
        isSpoof: true
      });
    } catch (error) {
      logError("Error fetching spoof portal data:", error);
      res.status(500).json({ message: "Failed to fetch spoof portal data" });
    }
  });

  // ============================================
  // Document Workspace Routes
  // ============================================

  // List documents
  app.get("/api/documents", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      const folderId = req.query.folderId as string | undefined;
      
      const docs = await storage.getDocuments(organizationId, eventId, folderId);
      res.json(docs);
    } catch (error) {
      logError("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get presigned upload URL for documents
  app.post("/api/documents/upload", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadUrl });
    } catch (error) {
      logError("Error getting document upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Create document record after upload
  app.post("/api/documents", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const { name, description, fileName, mimeType, byteSize, uploadUrl, eventId, folderId, accessLevel } = req.body;
      
      if (!name || !fileName || !mimeType || !uploadUrl) {
        return res.status(400).json({ message: "Missing required fields: name, fileName, mimeType, uploadUrl" });
      }
      
      // Validate file size (max 50MB)
      const maxSizeBytes = 50 * 1024 * 1024;
      if (byteSize && byteSize > maxSizeBytes) {
        return res.status(400).json({ message: "File size exceeds maximum allowed (50MB)" });
      }
      
      // Validate MIME type - allow common document types
      const allowedMimeTypes = [
        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "text/html",
        "text/markdown",
        // Images
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        // Archives
        "application/zip",
        "application/x-zip-compressed",
      ];
      
      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({ 
          message: "File type not allowed. Supported types: PDF, Word, Excel, PowerPoint, images, text files, and ZIP archives" 
        });
      }
      
      // Sanitize filename - remove path traversal and special characters
      const sanitizedFileName = fileName
        .replace(/\.\./g, "")
        .replace(/[\/\\:*?"<>|]/g, "_")
        .substring(0, 255);
      
      // Normalize the upload URL to an object path and set ACL
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadUrl, {
        owner: userId,
        visibility: accessLevel === "organization" ? "public" : "private",
      });
      
      const data = insertDocumentSchema.parse({
        organizationId,
        eventId: eventId || null,
        folderId: folderId || null,
        name,
        description: description || null,
        fileName: sanitizedFileName,
        mimeType,
        byteSize: byteSize || 0,
        objectPath,
        accessLevel: accessLevel || "private",
        uploadedBy: userId,
      });
      
      const document = await storage.createDocument(data);
      
      // Log activity with actor email
      const user = await storage.getUser(userId);
      await storage.createDocumentActivity({
        documentId: document.id,
        organizationId,
        actorType: "user",
        actorId: userId,
        actorEmail: user?.email || undefined,
        action: "upload",
        details: { fileName: sanitizedFileName, mimeType, byteSize },
        ipAddress: req.ip,
      });
      
      res.status(201).json(document);
    } catch (error: any) {
      logError("Error creating document:", error);
      res.status(400).json({ message: error.message || "Failed to create document" });
    }
  });

  // Get document folders
  app.get("/api/documents/folders", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const eventId = req.query.eventId as string | undefined;
      
      const folders = await storage.getDocumentFolders(organizationId, eventId);
      res.json(folders);
    } catch (error) {
      logError("Error fetching document folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  // Create document folder
  app.post("/api/documents/folders", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const { name, description, eventId, parentId } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }
      
      const data = insertDocumentFolderSchema.parse({
        organizationId,
        eventId: eventId || null,
        name,
        description: description || null,
        parentId: parentId || null,
        createdBy: userId,
      });
      
      const folder = await storage.createDocumentFolder(data);
      res.status(201).json(folder);
    } catch (error: any) {
      logError("Error creating folder:", error);
      res.status(400).json({ message: error.message || "Failed to create folder" });
    }
  });

  // Update document folder
  app.patch("/api/documents/folders/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const folderId = req.params.id;
      
      const folder = await storage.getDocumentFolder(organizationId, folderId);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      const updated = await storage.updateDocumentFolder(folderId, organizationId, req.body);
      res.json(updated);
    } catch (error: any) {
      logError("Error updating folder:", error);
      res.status(400).json({ message: error.message || "Failed to update folder" });
    }
  });

  // Delete document folder
  app.delete("/api/documents/folders/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const folderId = req.params.id;
      
      const folder = await storage.getDocumentFolder(organizationId, folderId);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      await storage.deleteDocumentFolder(folderId, organizationId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log view activity
      await storage.createDocumentActivity({
        documentId: document.id,
        organizationId,
        actorType: "user",
        actorId: userId,
        action: "view",
        ipAddress: req.ip,
      });
      
      res.json(document);
    } catch (error) {
      logError("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Update document
  app.patch("/api/documents/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const { name, description, folderId, accessLevel } = req.body;
      const updated = await storage.updateDocument(req.params.id, organizationId, {
        name,
        description,
        folderId,
        accessLevel,
      });
      
      // Log activity
      await storage.createDocumentActivity({
        documentId: document.id,
        organizationId,
        actorType: "user",
        actorId: userId,
        action: "edit",
        details: { changes: req.body },
        ipAddress: req.ip,
      });
      
      res.json(updated);
    } catch (error: any) {
      logError("Error updating document:", error);
      res.status(400).json({ message: error.message || "Failed to update document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      await storage.deleteDocument(req.params.id, organizationId);
      res.status(204).send();
    } catch (error) {
      logError("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Download document file
  app.get("/api/documents/:id/download", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log download activity
      await storage.createDocumentActivity({
        documentId: document.id,
        organizationId,
        actorType: "user",
        actorId: userId,
        action: "download",
        ipAddress: req.ip,
      });
      
      // Get the file from object storage
      const objectFile = await objectStorageService.getObjectEntityFile(document.objectPath);
      res.setHeader("Content-Disposition", `attachment; filename="${document.fileName}"`);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Document file not found" });
      }
      logError("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Get document activity
  app.get("/api/documents/:id/activity", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const activity = await storage.getDocumentActivity(organizationId, req.params.id);
      res.json(activity);
    } catch (error) {
      logError("Error fetching document activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Get document shares
  app.get("/api/documents/:id/shares", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const shares = await storage.getDocumentShares(organizationId, req.params.id);
      res.json(shares);
    } catch (error) {
      logError("Error fetching document shares:", error);
      res.status(500).json({ message: "Failed to fetch shares" });
    }
  });

  // Create document share
  app.post("/api/documents/:id/shares", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const documentId = req.params.id;
      
      const document = await storage.getDocument(organizationId, documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const { shareType, shareValue, permission, expiresAt } = req.body;
      
      if (!shareType || !shareValue) {
        return res.status(400).json({ message: "shareType and shareValue are required" });
      }
      
      const data = insertDocumentShareSchema.parse({
        documentId,
        organizationId,
        shareType,
        shareValue,
        permission: permission || "view",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
      });
      
      const share = await storage.createDocumentShare(data);
      
      // Log activity
      await storage.createDocumentActivity({
        documentId,
        organizationId,
        actorType: "user",
        actorId: userId,
        action: "share",
        details: { shareType, shareValue, permission },
        ipAddress: req.ip,
      });
      
      res.status(201).json(share);
    } catch (error: any) {
      logError("Error creating document share:", error);
      res.status(400).json({ message: error.message || "Failed to create share" });
    }
  });

  // Delete document share
  app.delete("/api/documents/:id/shares/:shareId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id: documentId, shareId } = req.params;
      
      const document = await storage.getDocument(organizationId, documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      await storage.deleteDocumentShare(shareId, organizationId);
      
      // Log activity
      await storage.createDocumentActivity({
        documentId,
        organizationId,
        actorType: "user",
        actorId: userId,
        action: "unshare",
        details: { shareId },
        ipAddress: req.ip,
      });
      
      res.status(204).send();
    } catch (error) {
      logError("Error deleting document share:", error);
      res.status(500).json({ message: "Failed to delete share" });
    }
  });

  // Get document comments
  app.get("/api/documents/:id/comments", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const comments = await storage.getDocumentComments(organizationId, req.params.id);
      res.json(comments);
    } catch (error) {
      logError("Error fetching document comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Create document comment
  app.post("/api/documents/:id/comments", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const documentId = req.params.id;
      
      const document = await storage.getDocument(organizationId, documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const user = await storage.getUser(userId);
      const { content, parentId } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const data = insertDocumentCommentSchema.parse({
        documentId,
        organizationId,
        parentId: parentId || null,
        content,
        authorType: "user",
        authorId: userId,
        authorName: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.email || "Unknown",
      });
      
      const comment = await storage.createDocumentComment(data);
      res.status(201).json(comment);
    } catch (error: any) {
      logError("Error creating document comment:", error);
      res.status(400).json({ message: error.message || "Failed to create comment" });
    }
  });

  // Update/resolve document comment
  app.patch("/api/documents/:id/comments/:commentId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id: documentId, commentId } = req.params;
      
      const document = await storage.getDocument(organizationId, documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const comment = await storage.getDocumentComment(organizationId, commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      const { content, isResolved } = req.body;
      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (isResolved !== undefined) {
        updates.isResolved = isResolved;
        if (isResolved) {
          updates.resolvedBy = userId;
          updates.resolvedAt = new Date();
        } else {
          updates.resolvedBy = null;
          updates.resolvedAt = null;
        }
      }
      
      const updated = await storage.updateDocumentComment(commentId, organizationId, updates);
      res.json(updated);
    } catch (error: any) {
      logError("Error updating document comment:", error);
      res.status(400).json({ message: error.message || "Failed to update comment" });
    }
  });

  // Get document approvals
  app.get("/api/documents/:id/approvals", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      
      const document = await storage.getDocument(organizationId, req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const approvals = await storage.getDocumentApprovals(organizationId, req.params.id);
      res.json(approvals);
    } catch (error) {
      logError("Error fetching document approvals:", error);
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  // Request document approval
  app.post("/api/documents/:id/approvals", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const documentId = req.params.id;
      
      const document = await storage.getDocument(organizationId, documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const { approverType, approverId, approverName } = req.body;
      
      if (!approverType || !approverId) {
        return res.status(400).json({ message: "approverType and approverId are required" });
      }
      
      const data = insertDocumentApprovalSchema.parse({
        documentId,
        organizationId,
        requestedBy: userId,
        approverType,
        approverId,
        approverName: approverName || null,
        status: "pending",
      });
      
      const approval = await storage.createDocumentApproval(data);
      res.status(201).json(approval);
    } catch (error: any) {
      logError("Error creating document approval:", error);
      res.status(400).json({ message: error.message || "Failed to create approval request" });
    }
  });

  // Respond to document approval
  app.patch("/api/documents/:id/approvals/:approvalId", isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId, req.session);
      const { id: documentId, approvalId } = req.params;
      
      const document = await storage.getDocument(organizationId, documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const approval = await storage.getDocumentApproval(organizationId, approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Approval not found" });
      }
      
      const { status, comments } = req.body;
      
      if (!status || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "Valid status is required (approved, rejected, pending)" });
      }
      
      const updated = await storage.updateDocumentApproval(approvalId, organizationId, {
        status,
        comments: comments || null,
      });
      
      res.json(updated);
    } catch (error: any) {
      logError("Error updating document approval:", error);
      res.status(400).json({ message: error.message || "Failed to update approval" });
    }
  });

  // Demo data seed endpoint for AI GTM Summit
  app.post('/api/demo/seed-ai-gtm-summit', isAuthenticated, requireInviteRedemption, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only allow super admins to seed demo data
      if (!isSuperAdmin(user?.email)) {
        return res.status(403).json({ message: "Only super admins can seed demo data" });
      }
      
      const organizationId = await getOrganizationId(userId, req.session);
      
      // Dynamically import the seed function to avoid loading it on every request
      const { seedAIGTMSummit } = await import("./demo-seed");
      const result = await seedAIGTMSummit(organizationId, userId);
      
      res.json(result);
    } catch (error: any) {
      logError("Error seeding AI GTM Summit demo data:", error);
      res.status(500).json({ message: error.message || "Failed to seed demo data" });
    }
  });

  // Background scheduler to process scheduled email campaigns
  const processScheduledCampaigns = async () => {
    try {
      if (!process.env.RESEND_API_KEY) {
        return; // Email service not configured
      }

      // Get all organizations to check their scheduled campaigns
      const allOrganizations = await storage.getAllOrganizationsWithStats();
      const now = new Date();

      for (const org of allOrganizations) {
        const campaigns = await storage.getEmailCampaigns(org.id);
        const scheduledCampaigns = campaigns.filter(c => 
          c.status === "scheduled" && 
          c.scheduledAt && 
          new Date(c.scheduledAt) <= now
        );

        for (const campaign of scheduledCampaigns) {
          try {
            logInfo(`Processing scheduled campaign: ${campaign.id} for org: ${org.id}`);
            
            // Get event details for merge tags
            const event = await storage.getEvent(org.id, campaign.eventId);
            if (!event) {
              logError(`Event not found for campaign ${campaign.id}`);
              continue;
            }

            // Get recipients based on recipientType
            let attendees = await storage.getAttendees(org.id, campaign.eventId);
            if (campaign.recipientType && campaign.recipientType !== "all") {
              attendees = attendees.filter(a => a.attendeeType === campaign.recipientType);
            }

            if (attendees.length === 0) {
              logWarn(`No recipients found for campaign ${campaign.id}`);
              await storage.updateEmailCampaign(org.id, campaign.id, {
                status: "sent",
                sentAt: new Date(),
              });
              continue;
            }

            // Format event date for merge tags
            const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : '';

            // Generate calendar links for merge tag
            const scheduledCalendarLinksHtml = event.startDate ? generateCalendarLinksHtml({
              title: event.name,
              description: event.description || '',
              location: event.location || '',
              startDate: event.startDate,
              endDate: event.endDate || undefined,
            }) : '';

            // Send emails with merge tag replacement and tracking
            const result = await sendCampaignEmails({
              subject: campaign.subject,
              content: campaign.content,
              recipients: attendees.map(a => ({
                email: a.email,
                firstName: a.firstName || undefined,
                lastName: a.lastName || undefined,
                company: a.company || undefined,
                checkInCode: a.checkInCode || undefined,
                attendeeId: a.id,
              })),
              eventContext: {
                name: event.name,
                date: eventDate,
                location: event.location || undefined,
                description: event.description || undefined,
                addToCalendar: scheduledCalendarLinksHtml,
              },
              organizationContext: {
                name: org.name,
              },
              organizationId: org.id,
              campaignId: campaign.id,
              enableTracking: true,
              styles: campaign.styles as any || undefined,
            });

            // Update campaign status to sent
            await storage.updateEmailCampaign(org.id, campaign.id, {
              status: "sent",
              sentAt: new Date(),
            });

            // If this is an invite email campaign, update attendee statuses to "invited" (only for successful sends)
            if (campaign.isInviteEmail && result.totalSent > 0) {
              // Get set of failed emails to skip them
              const failedEmails = new Set(result.errors.map(e => e.email));
              for (const attendee of attendees) {
                // Only update status if email was successfully sent (not in failed list and not suppressed)
                if (!failedEmails.has(attendee.email)) {
                  const suppression = await storage.getEmailSuppression(org.id, attendee.email);
                  if (!suppression) {
                    await storage.updateAttendee(org.id, attendee.id, {
                      registrationStatus: "invited",
                    });
                  }
                }
              }
            }

            logInfo(`Scheduled campaign ${campaign.id} sent: ${result.totalSent} emails, ${result.totalFailed} failed`);
          } catch (campaignError) {
            logError(`Error processing scheduled campaign ${campaign.id}:`, campaignError);
          }
        }
      }
    } catch (error) {
      logError("Error in scheduled campaign processor:", error);
    }
  };

  // Run the scheduler every minute
  setInterval(processScheduledCampaigns, 60 * 1000);
  
  // Also run once at startup after a short delay
  setTimeout(processScheduledCampaigns, 5000);

  return httpServer;
}

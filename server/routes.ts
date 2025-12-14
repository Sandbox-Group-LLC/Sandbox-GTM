import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { sendNewOrganizationAlert, sendCampaignEmails } from "./email";
import { createPaymentIntent, getPaymentIntent, calculateFinalPrice } from "./stripe";
import {
  insertEventSchema,
  insertAttendeeSchema,
  insertAttendeeTypeSchema,
  insertPackageSchema,
  insertInviteCodeSchema,
  insertSpeakerSchema,
  insertSessionSchema,
  insertContentItemSchema,
  insertBudgetItemSchema,
  insertMilestoneSchema,
  insertDeliverableSchema,
  insertEmailCampaignSchema,
  insertSocialPostSchema,
  insertEmailTemplateSchema,
  insertEventPageSchema,
  insertCustomFieldSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Helper function to get user's organization (creates default if none exists)
  async function getOrganizationId(userId: string): Promise<string> {
    const memberships = await storage.getUserOrganizations(userId);
    if (memberships.length > 0) {
      return memberships[0].organizationId;
    }
    // Create default org for user if none exists
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
    const user = await storage.getUser(userId);
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
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  app.get('/api/auth/organization', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await storage.getUserOrganizations(userId);
      if (memberships.length > 0) {
        const org = await storage.getOrganization(memberships[0].organizationId);
        res.json(sanitizeOrganization(org));
      } else {
        // Create default org for user if none exists
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
        const user = await storage.getUser(userId);
        sendNewOrganizationAlert(org.name, org.slug, user?.email || undefined);
        
        res.json(sanitizeOrganization(org));
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.patch('/api/auth/organization', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      
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
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Onboarding routes
  app.get('/api/onboarding/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  app.post('/api/onboarding/complete-step', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error completing onboarding step:", error);
      res.status(500).json({ message: "Failed to complete onboarding step" });
    }
  });

  app.post('/api/onboarding/skip-step', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error skipping onboarding step:", error);
      res.status(500).json({ message: "Failed to skip onboarding step" });
    }
  });

  app.post('/api/onboarding/dismiss', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      
      const updated = await storage.updateOrganization(organizationId, {
        onboardingCompleted: true
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(sanitizeOrganization(updated));
    } catch (error) {
      console.error("Error dismissing onboarding:", error);
      res.status(500).json({ message: "Failed to dismiss onboarding" });
    }
  });

  // Super Admin routes
  app.get("/api/admin/organizations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const isSuperAdmin = user?.email?.toLowerCase().endsWith("@makemysandbox.com") ?? false;
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      const organizations = await storage.getAllOrganizationsWithStats();
      // Sanitize all organizations to mask secret keys
      res.json(organizations.map(sanitizeOrganization));
    } catch (error) {
      console.error("Error fetching all organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Event routes
  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const events = await storage.getEvents(organizationId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error creating event:", error);
      const message = error.errors ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') : "Invalid event data";
      res.status(400).json({ message });
    }
  });

  app.get("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const event = await storage.getEvent(organizationId, req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const event = await storage.updateEvent(organizationId, req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteEvent(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      
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
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Attendee routes
  app.get("/api/attendees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const attendees = await storage.getAttendees(organizationId, eventId);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post("/api/attendees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
          console.error("Failed to update invite code usage count:", e);
        }
      }
      
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error creating attendee:", error);
      res.status(400).json({ message: "Invalid attendee data" });
    }
  });

  app.patch("/api/attendees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const attendee = await storage.updateAttendee(organizationId, req.params.id, req.body);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      res.json(attendee);
    } catch (error) {
      console.error("Error updating attendee:", error);
      res.status(400).json({ message: "Failed to update attendee" });
    }
  });

  app.delete("/api/attendees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteAttendee(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attendee:", error);
      res.status(500).json({ message: "Failed to delete attendee" });
    }
  });

  // Attendee Type routes
  app.get("/api/attendee-types", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const attendeeTypes = await storage.getAttendeeTypes(organizationId, eventId);
      res.json(attendeeTypes);
    } catch (error) {
      console.error("Error fetching attendee types:", error);
      res.status(500).json({ message: "Failed to fetch attendee types" });
    }
  });

  app.get("/api/attendee-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const attendeeType = await storage.getAttendeeType(organizationId, req.params.id);
      if (!attendeeType) {
        return res.status(404).json({ message: "Attendee type not found" });
      }
      res.json(attendeeType);
    } catch (error) {
      console.error("Error fetching attendee type:", error);
      res.status(500).json({ message: "Failed to fetch attendee type" });
    }
  });

  app.post("/api/attendee-types", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertAttendeeTypeSchema.parse({ ...req.body, organizationId });
      const attendeeType = await storage.createAttendeeType(data);
      res.status(201).json(attendeeType);
    } catch (error) {
      console.error("Error creating attendee type:", error);
      res.status(400).json({ message: "Invalid attendee type data" });
    }
  });

  app.patch("/api/attendee-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const attendeeType = await storage.updateAttendeeType(organizationId, req.params.id, req.body);
      if (!attendeeType) {
        return res.status(404).json({ message: "Attendee type not found" });
      }
      res.json(attendeeType);
    } catch (error) {
      console.error("Error updating attendee type:", error);
      res.status(400).json({ message: "Failed to update attendee type" });
    }
  });

  app.delete("/api/attendee-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteAttendeeType(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attendee type:", error);
      res.status(500).json({ message: "Failed to delete attendee type" });
    }
  });

  // Package routes (global to organization, not event-specific)
  app.get("/api/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const packages = await storage.getPackages(organizationId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.get("/api/packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const pkg = await storage.getPackage(organizationId, req.params.id);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      console.error("Error fetching package:", error);
      res.status(500).json({ message: "Failed to fetch package" });
    }
  });

  app.post("/api/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const body = {
        ...req.body,
        organizationId,
        price: req.body.price !== undefined ? String(req.body.price) : "0",
      };
      const data = insertPackageSchema.parse(body);
      const pkg = await storage.createPackage(data);
      res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(400).json({ message: "Invalid package data" });
    }
  });

  app.patch("/api/packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error updating package:", error);
      res.status(400).json({ message: "Failed to update package" });
    }
  });

  app.delete("/api/packages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deletePackage(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Get events assigned to a package
  app.get("/api/packages/:id/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventPackages = await storage.getEventPackagesByPackageId(organizationId, req.params.id);
      res.json(eventPackages.map(ep => ep.eventId));
    } catch (error) {
      console.error("Error fetching package events:", error);
      res.status(500).json({ message: "Failed to fetch package events" });
    }
  });

  // Event Package routes (per-event package overrides)
  app.get("/api/events/:eventId/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error fetching event packages:", error);
      res.status(500).json({ message: "Failed to fetch event packages" });
    }
  });

  app.put("/api/events/:eventId/packages/:packageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error upserting event package:", error);
      res.status(400).json({ message: "Failed to update event package" });
    }
  });

  app.delete("/api/events/:eventId/packages/:packageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const { eventId, packageId } = req.params;

      await storage.deleteEventPackage(organizationId, eventId, packageId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event package:", error);
      res.status(500).json({ message: "Failed to delete event package" });
    }
  });

  // Invite Code routes
  app.get("/api/invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const inviteCodes = await storage.getInviteCodes(organizationId, eventId);
      res.json(inviteCodes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.get("/api/invite-codes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const inviteCode = await storage.getInviteCode(organizationId, req.params.id);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invite code not found" });
      }
      res.json(inviteCode);
    } catch (error) {
      console.error("Error fetching invite code:", error);
      res.status(500).json({ message: "Failed to fetch invite code" });
    }
  });

  app.post("/api/invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertInviteCodeSchema.parse({ ...req.body, organizationId });
      const inviteCode = await storage.createInviteCode(data);
      res.status(201).json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(400).json({ message: "Invalid invite code data" });
    }
  });

  app.patch("/api/invite-codes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const inviteCode = await storage.updateInviteCode(organizationId, req.params.id, req.body);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invite code not found" });
      }
      res.json(inviteCode);
    } catch (error) {
      console.error("Error updating invite code:", error);
      res.status(400).json({ message: "Failed to update invite code" });
    }
  });

  app.delete("/api/invite-codes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteInviteCode(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invite code:", error);
      res.status(500).json({ message: "Failed to delete invite code" });
    }
  });

  // Speaker routes
  app.get("/api/speakers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const speakers = await storage.getSpeakers(organizationId, eventId);
      res.json(speakers);
    } catch (error) {
      console.error("Error fetching speakers:", error);
      res.status(500).json({ message: "Failed to fetch speakers" });
    }
  });

  app.post("/api/speakers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertSpeakerSchema.parse({ ...req.body, organizationId });
      const speaker = await storage.createSpeaker(data);
      res.status(201).json(speaker);
    } catch (error) {
      console.error("Error creating speaker:", error);
      res.status(400).json({ message: "Invalid speaker data" });
    }
  });

  app.patch("/api/speakers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const speaker = await storage.updateSpeaker(organizationId, req.params.id, req.body);
      if (!speaker) {
        return res.status(404).json({ message: "Speaker not found" });
      }
      res.json(speaker);
    } catch (error) {
      console.error("Error updating speaker:", error);
      res.status(400).json({ message: "Failed to update speaker" });
    }
  });

  app.delete("/api/speakers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteSpeaker(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting speaker:", error);
      res.status(500).json({ message: "Failed to delete speaker" });
    }
  });

  // Session routes
  app.get("/api/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const sessions = await storage.getSessions(organizationId, eventId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertSessionSchema.parse({ ...req.body, organizationId });
      const session = await storage.createSession(data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.patch("/api/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const session = await storage.updateSession(organizationId, req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(400).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteSession(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Content routes
  app.get("/api/content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const content = await storage.getContentItems(organizationId, eventId);
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertContentItemSchema.parse({ ...req.body, organizationId });
      const content = await storage.createContentItem(data);
      res.status(201).json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(400).json({ message: "Invalid content data" });
    }
  });

  app.patch("/api/content/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const content = await storage.updateContentItem(organizationId, req.params.id, req.body);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(400).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/content/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteContentItem(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Budget routes
  app.get("/api/budget", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const budget = await storage.getBudgetItems(organizationId, eventId);
      res.json(budget);
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });

  app.post("/api/budget", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertBudgetItemSchema.parse({ ...req.body, organizationId });
      const budget = await storage.createBudgetItem(data);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget item:", error);
      res.status(400).json({ message: "Invalid budget data" });
    }
  });

  app.patch("/api/budget/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const budget = await storage.updateBudgetItem(organizationId, req.params.id, req.body);
      if (!budget) {
        return res.status(404).json({ message: "Budget item not found" });
      }
      res.json(budget);
    } catch (error) {
      console.error("Error updating budget item:", error);
      res.status(400).json({ message: "Failed to update budget item" });
    }
  });

  app.delete("/api/budget/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteBudgetItem(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget item:", error);
      res.status(500).json({ message: "Failed to delete budget item" });
    }
  });

  // Milestone routes
  app.get("/api/milestones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const milestones = await storage.getMilestones(organizationId, eventId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/milestones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertMilestoneSchema.parse({ ...req.body, organizationId });
      const milestone = await storage.createMilestone(data);
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(400).json({ message: "Invalid milestone data" });
    }
  });

  app.patch("/api/milestones/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const milestone = await storage.updateMilestone(organizationId, req.params.id, req.body);
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(400).json({ message: "Failed to update milestone" });
    }
  });

  app.delete("/api/milestones/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteMilestone(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ message: "Failed to delete milestone" });
    }
  });

  // Deliverable routes
  app.get("/api/deliverables", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const deliverables = await storage.getDeliverables(organizationId, eventId);
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  app.post("/api/deliverables", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertDeliverableSchema.parse({ ...req.body, organizationId });
      const deliverable = await storage.createDeliverable(data);
      res.status(201).json(deliverable);
    } catch (error) {
      console.error("Error creating deliverable:", error);
      res.status(400).json({ message: "Invalid deliverable data" });
    }
  });

  app.patch("/api/deliverables/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const deliverable = await storage.updateDeliverable(organizationId, req.params.id, req.body);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }
      res.json(deliverable);
    } catch (error) {
      console.error("Error updating deliverable:", error);
      res.status(400).json({ message: "Failed to update deliverable" });
    }
  });

  app.delete("/api/deliverables/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteDeliverable(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      res.status(500).json({ message: "Failed to delete deliverable" });
    }
  });

  // Email campaign routes
  app.get("/api/emails", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const emails = await storage.getEmailCampaigns(organizationId, eventId);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch email campaigns" });
    }
  });

  app.post("/api/emails", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertEmailCampaignSchema.parse({ ...req.body, organizationId, createdBy: userId });
      const email = await storage.createEmailCampaign(data);
      res.status(201).json(email);
    } catch (error) {
      console.error("Error creating email campaign:", error);
      res.status(400).json({ message: "Invalid email campaign data" });
    }
  });

  app.patch("/api/emails/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const email = await storage.updateEmailCampaign(organizationId, req.params.id, req.body);
      if (!email) {
        return res.status(404).json({ message: "Email campaign not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error updating email campaign:", error);
      res.status(400).json({ message: "Failed to update email campaign" });
    }
  });

  app.delete("/api/emails/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteEmailCampaign(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email campaign:", error);
      res.status(500).json({ message: "Failed to delete email campaign" });
    }
  });

  // Send email campaign with merge tag replacement
  app.post("/api/emails/:id/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      
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

      // Send emails with merge tag replacement
      const result = await sendCampaignEmails({
        subject: campaign.subject,
        content: campaign.content,
        recipients: attendees.map(a => ({
          email: a.email,
          firstName: a.firstName || undefined,
          lastName: a.lastName || undefined,
          company: a.company || undefined,
          checkInCode: a.checkInCode || undefined,
        })),
        eventContext: {
          name: event.name,
          date: eventDate,
          location: event.location || undefined,
          description: event.description || undefined,
        },
        organizationContext: {
          name: org?.name,
        },
      });

      // Update campaign status to sent
      await storage.updateEmailCampaign(organizationId, campaign.id, {
        status: "sent",
        sentAt: new Date(),
      });

      res.json({
        message: `Campaign sent successfully`,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error("Error sending email campaign:", error);
      res.status(500).json({ message: "Failed to send email campaign" });
    }
  });

  // Social post routes
  app.get("/api/social", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const posts = await storage.getSocialPosts(organizationId, eventId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching social posts:", error);
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  app.post("/api/social", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertSocialPostSchema.parse({ ...req.body, organizationId, eventId: req.body.eventId || null, createdBy: userId });
      const post = await storage.createSocialPost(data);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating social post:", error);
      res.status(400).json({ message: "Invalid social post data" });
    }
  });

  app.patch("/api/social/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const post = await storage.updateSocialPost(organizationId, req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error updating social post:", error);
      res.status(400).json({ message: "Failed to update social post" });
    }
  });

  app.delete("/api/social/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteSocialPost(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting social post:", error);
      res.status(500).json({ message: "Failed to delete social post" });
    }
  });

  // Email template routes
  app.get("/api/email-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.query.eventId as string | undefined;
      const templates = await storage.getEmailTemplates(organizationId, eventId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertEmailTemplateSchema.parse({ ...req.body, organizationId, eventId: req.body.eventId || null, createdBy: userId });
      const template = await storage.createEmailTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(400).json({ message: "Invalid email template data" });
    }
  });

  app.patch("/api/email-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const template = await storage.updateEmailTemplate(organizationId, req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(400).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteEmailTemplate(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Check-in routes (code-based access - no organizationId verification needed for scan)
  app.post("/api/check-in/scan", isAuthenticated, async (req, res) => {
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
      console.error("Error during check-in:", error);
      res.status(500).json({ message: "Failed to process check-in" });
    }
  });

  app.get("/api/check-in/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
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
      console.error("Error fetching check-in stats:", error);
      res.status(500).json({ message: "Failed to fetch check-in stats" });
    }
  });

  // Public event registration routes (no auth required)
  app.get("/api/public/event/:slug", async (req, res) => {
    try {
      console.log(`[Public Event] Fetching event with slug: ${req.params.slug}`);
      const event = await storage.getEventBySlug(req.params.slug);
      
      if (!event) {
        console.log(`[Public Event] No event found for slug: ${req.params.slug}`);
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (!event.isPublic) {
        console.log(`[Public Event] Event ${event.id} is not public`);
        return res.status(404).json({ message: "Event not found" });
      }
      
      console.log(`[Public Event] Found event: ${event.name} (${event.id}), org: ${event.organizationId}`);
      
      const sessions = await storage.getSessions(event.organizationId, event.id);
      const speakers = await storage.getSpeakers(event.organizationId, event.id);
      
      // Also fetch the landing page configuration if published
      const pages = await storage.getEventPages(event.organizationId, event.id);
      const landingPage = pages.find(p => p.pageType === "landing" && p.isPublished);
      
      console.log(`[Public Event] Sessions: ${sessions.length}, Speakers: ${speakers.length}, Pages: ${pages.length}, Landing published: ${!!landingPage}`);
      
      res.json({ event, sessions, speakers, landingPage: landingPage || null });
    } catch (error) {
      console.error("[Public Event] Error fetching public event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.get("/api/public/event/:slug/registration", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
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
      console.error("Error fetching registration page:", error);
      res.status(500).json({ message: "Failed to fetch registration page" });
    }
  });

  app.get("/api/public/event/:slug/portal", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
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
      console.error("Error fetching portal page:", error);
      res.status(500).json({ message: "Failed to fetch portal page" });
    }
  });

  // Get public packages for an event (public ones + any unlocked by invite code)
  app.get("/api/public/event/:slug/packages", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
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
      console.error("Error fetching public packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Validate invite code and return unlocked package if any
  app.post("/api/public/validate-invite-code/:slug", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
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
      
      // Return invite code info with discount details
      res.json({
        valid: true,
        inviteCode: {
          id: inviteCode.id,
          code: inviteCode.code,
          discountType: inviteCode.discountType,
          discountValue: inviteCode.discountValue,
          packageId: inviteCode.packageId,
          attendeeTypeId: inviteCode.attendeeTypeId,
        },
        unlockedPackage,
      });
    } catch (error) {
      console.error("Error validating invite code:", error);
      res.status(500).json({ message: "Failed to validate invite code" });
    }
  });

  app.post("/api/public/register/:slug", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic || !event.registrationOpen) {
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
        customData: registrationData.customData || null
      });
      
      const attendee = await storage.createAttendee(data);
      
      // Increment the used count AFTER successful attendee creation
      if (foundInviteCode) {
        try {
          await storage.updateInviteCode(event.organizationId, foundInviteCode.id, {
            usedCount: (foundInviteCode.usedCount || 0) + 1
          });
        } catch (e) {
          console.error("Failed to update invite code usage count:", e);
        }
      }
      
      res.status(201).json({ message: "Registration successful", attendee });
    } catch (error) {
      console.error("Error during public registration:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/overview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      
      const [attendees, sessions, speakers, budgetItems, deliverables, milestones, emailCampaigns, socialPosts] = await Promise.all([
        storage.getAttendees(organizationId),
        storage.getSessions(organizationId),
        storage.getSpeakers(organizationId),
        storage.getBudgetItems(organizationId),
        storage.getDeliverables(organizationId),
        storage.getMilestones(organizationId),
        storage.getEmailCampaigns(organizationId),
        storage.getSocialPosts(organizationId),
      ]);

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

      // Budget metrics
      const totalPlanned = budgetItems.reduce((sum, item) => sum + parseFloat(item.plannedAmount || "0"), 0);
      const totalSpent = budgetItems.reduce((sum, item) => sum + parseFloat(item.actualAmount || "0"), 0);
      const budgetRemaining = totalPlanned - totalSpent;

      // Project progress
      const completedDeliverables = deliverables.filter(d => d.status === "done").length;
      const completedMilestones = milestones.filter(m => m.status === "completed").length;
      const projectProgress = deliverables.length > 0 ? Math.round((completedDeliverables / deliverables.length) * 100) : 0;

      // Marketing metrics
      const sentEmails = emailCampaigns.filter(e => e.status === "sent").length;
      const scheduledEmails = emailCampaigns.filter(e => e.status === "scheduled").length;
      const publishedPosts = socialPosts.filter(p => p.status === "published").length;
      const scheduledPosts = socialPosts.filter(p => p.status === "scheduled").length;

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
          budgetRemaining,
          utilizationRate: totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0,
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
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Social connections routes (user-scoped - no organizationId needed)
  app.get("/api/social-connections", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await storage.getSocialConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching social connections:", error);
      res.status(500).json({ message: "Failed to fetch social connections" });
    }
  });

  app.post("/api/social-connections", isAuthenticated, async (req: any, res) => {
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
      console.error("Error creating social connection:", error);
      res.status(400).json({ message: "Failed to create social connection" });
    }
  });

  app.delete("/api/social-connections/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSocialConnection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting social connection:", error);
      res.status(500).json({ message: "Failed to delete social connection" });
    }
  });

  // Event Pages routes (site builder)
  app.get("/api/events/:eventId/pages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.params.eventId;
      const pages = await storage.getEventPages(organizationId, eventId);
      res.json(pages);
    } catch (error) {
      console.error("Error fetching event pages:", error);
      res.status(500).json({ message: "Failed to fetch event pages" });
    }
  });

  app.get("/api/events/:eventId/pages/:pageType", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const { eventId, pageType } = req.params;
      const page = await storage.getEventPageByType(organizationId, eventId, pageType);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error fetching event page:", error);
      res.status(500).json({ message: "Failed to fetch event page" });
    }
  });

  app.post("/api/events/:eventId/pages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.params.eventId;
      const { theme, ...rest } = req.body;
      const data = insertEventPageSchema.parse({ ...rest, organizationId, eventId });
      const page = await storage.upsertEventPage({ ...data, theme });
      res.status(201).json(page);
    } catch (error) {
      console.error("Error creating/updating event page:", error);
      res.status(400).json({ message: "Invalid event page data" });
    }
  });

  app.patch("/api/events/:eventId/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const page = await storage.updateEventPage(organizationId, req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("Error updating event page:", error);
      res.status(400).json({ message: "Failed to update event page" });
    }
  });

  app.delete("/api/events/:eventId/pages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteEventPage(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event page:", error);
      res.status(500).json({ message: "Failed to delete event page" });
    }
  });

  // Registration config routes
  app.get("/api/events/:eventId/registration-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const config = await storage.getRegistrationConfig(organizationId, req.params.eventId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching registration config:", error);
      res.status(500).json({ message: "Failed to fetch registration config" });
    }
  });

  app.post("/api/events/:eventId/registration-config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const eventId = req.params.eventId;
      const data = {
        ...req.body,
        organizationId,
        eventId,
      };
      const config = await storage.upsertRegistrationConfig(data);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error saving registration config:", error);
      res.status(400).json({ message: "Failed to save registration config" });
    }
  });

  // Custom Fields routes
  app.get("/api/custom-fields", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const fields = await storage.getCustomFields(organizationId);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.post("/api/custom-fields", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const data = insertCustomFieldSchema.parse({ ...req.body, organizationId });
      const field = await storage.createCustomField(data);
      res.status(201).json(field);
    } catch (error) {
      console.error("Error creating custom field:", error);
      res.status(400).json({ message: "Invalid custom field data" });
    }
  });

  app.patch("/api/custom-fields/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      const field = await storage.updateCustomField(organizationId, req.params.id, req.body);
      if (!field) {
        return res.status(404).json({ message: "Custom field not found" });
      }
      res.json(field);
    } catch (error) {
      console.error("Error updating custom field:", error);
      res.status(400).json({ message: "Failed to update custom field" });
    }
  });

  app.delete("/api/custom-fields/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = await getOrganizationId(userId);
      await storage.deleteCustomField(organizationId, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom field:", error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  // Public custom fields endpoint (no auth required)
  app.get("/api/public/custom-fields/:slug", async (req, res) => {
    try {
      const fields = await storage.getActiveCustomFieldsByEventSlug(req.params.slug);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching public custom fields:", error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  // Payment endpoints for public registration
  app.get("/api/public/event/:slug/payment-config", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
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
      console.error("Error fetching payment config:", error);
      res.status(500).json({ message: "Failed to fetch payment configuration" });
    }
  });

  app.post("/api/public/event/:slug/create-payment-intent", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic || !event.registrationOpen) {
        return res.status(404).json({ message: "Registration not available" });
      }
      
      const { packageId, inviteCodeId } = req.body;
      
      if (!packageId) {
        return res.status(400).json({ message: "Package is required for payment" });
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
        "usd",
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
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post("/api/public/event/:slug/verify-payment", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
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
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  return httpServer;
}

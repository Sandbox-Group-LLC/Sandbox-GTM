import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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

  app.get('/api/auth/organization', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberships = await storage.getUserOrganizations(userId);
      if (memberships.length > 0) {
        const org = await storage.getOrganization(memberships[0].organizationId);
        res.json(org);
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
        res.json(org);
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
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
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const sessions = await storage.getSessions(event.organizationId, event.id);
      const speakers = await storage.getSpeakers(event.organizationId, event.id);
      
      // Also fetch the landing page configuration if published
      const pages = await storage.getEventPages(event.organizationId, event.id);
      const landingPage = pages.find(p => p.pageType === "landing" && p.isPublished);
      
      res.json({ event, sessions, speakers, landingPage: landingPage || null });
    } catch (error) {
      console.error("Error fetching public event:", error);
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
      
      res.json({ event, registrationPage: registrationPage || null });
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
      
      res.json({ event, sessions, speakers, portalPage: portalPage || null });
    } catch (error) {
      console.error("Error fetching portal page:", error);
      res.status(500).json({ message: "Failed to fetch portal page" });
    }
  });

  app.post("/api/public/register/:slug", async (req, res) => {
    try {
      const event = await storage.getEventBySlug(req.params.slug);
      if (!event || !event.isPublic || !event.registrationOpen) {
        return res.status(404).json({ message: "Registration not available" });
      }
      
      // Generate a unique check-in code
      const checkInCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const data = insertAttendeeSchema.parse({
        ...req.body,
        organizationId: event.organizationId,
        eventId: event.id,
        checkInCode,
        registrationStatus: "confirmed",
      });
      
      const attendee = await storage.createAttendee(data);
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
      const data = insertEventPageSchema.parse({ ...req.body, organizationId, eventId });
      const page = await storage.upsertEventPage(data);
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

  return httpServer;
}

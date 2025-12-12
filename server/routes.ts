import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertAttendeeSchema,
  insertSpeakerSchema,
  insertSessionSchema,
  insertContentItemSchema,
  insertBudgetItemSchema,
  insertMilestoneSchema,
  insertDeliverableSchema,
  insertEmailCampaignSchema,
  insertSocialPostSchema,
} from "@shared/schema";

// Default event ID for MVP (single event mode)
const DEFAULT_EVENT_ID = "default-event";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const [attendees, sessions, speakers, budgetItems, deliverablesList, milestonesList] = await Promise.all([
        storage.getAttendees(),
        storage.getSessions(),
        storage.getSpeakers(),
        storage.getBudgetItems(),
        storage.getDeliverables(),
        storage.getMilestones(),
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
  app.get("/api/attendees", isAuthenticated, async (req, res) => {
    try {
      const attendees = await storage.getAttendees();
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post("/api/attendees", isAuthenticated, async (req, res) => {
    try {
      const data = insertAttendeeSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID });
      const attendee = await storage.createAttendee(data);
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error creating attendee:", error);
      res.status(400).json({ message: "Invalid attendee data" });
    }
  });

  app.patch("/api/attendees/:id", isAuthenticated, async (req, res) => {
    try {
      const attendee = await storage.updateAttendee(req.params.id, req.body);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      res.json(attendee);
    } catch (error) {
      console.error("Error updating attendee:", error);
      res.status(400).json({ message: "Failed to update attendee" });
    }
  });

  app.delete("/api/attendees/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAttendee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attendee:", error);
      res.status(500).json({ message: "Failed to delete attendee" });
    }
  });

  // Speaker routes
  app.get("/api/speakers", isAuthenticated, async (req, res) => {
    try {
      const speakers = await storage.getSpeakers();
      res.json(speakers);
    } catch (error) {
      console.error("Error fetching speakers:", error);
      res.status(500).json({ message: "Failed to fetch speakers" });
    }
  });

  app.post("/api/speakers", isAuthenticated, async (req, res) => {
    try {
      const data = insertSpeakerSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID });
      const speaker = await storage.createSpeaker(data);
      res.status(201).json(speaker);
    } catch (error) {
      console.error("Error creating speaker:", error);
      res.status(400).json({ message: "Invalid speaker data" });
    }
  });

  app.patch("/api/speakers/:id", isAuthenticated, async (req, res) => {
    try {
      const speaker = await storage.updateSpeaker(req.params.id, req.body);
      if (!speaker) {
        return res.status(404).json({ message: "Speaker not found" });
      }
      res.json(speaker);
    } catch (error) {
      console.error("Error updating speaker:", error);
      res.status(400).json({ message: "Failed to update speaker" });
    }
  });

  app.delete("/api/speakers/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSpeaker(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting speaker:", error);
      res.status(500).json({ message: "Failed to delete speaker" });
    }
  });

  // Session routes
  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const data = insertSessionSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID });
      const session = await storage.createSession(data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.patch("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.updateSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(400).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Content routes
  app.get("/api/content", isAuthenticated, async (req, res) => {
    try {
      const content = await storage.getContentItems();
      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", isAuthenticated, async (req, res) => {
    try {
      const data = insertContentItemSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID });
      const content = await storage.createContentItem(data);
      res.status(201).json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(400).json({ message: "Invalid content data" });
    }
  });

  app.patch("/api/content/:id", isAuthenticated, async (req, res) => {
    try {
      const content = await storage.updateContentItem(req.params.id, req.body);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(400).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/content/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContentItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Budget routes
  app.get("/api/budget", isAuthenticated, async (req, res) => {
    try {
      const budget = await storage.getBudgetItems();
      res.json(budget);
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });

  app.post("/api/budget", isAuthenticated, async (req, res) => {
    try {
      const data = insertBudgetItemSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID });
      const budget = await storage.createBudgetItem(data);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget item:", error);
      res.status(400).json({ message: "Invalid budget data" });
    }
  });

  app.patch("/api/budget/:id", isAuthenticated, async (req, res) => {
    try {
      const budget = await storage.updateBudgetItem(req.params.id, req.body);
      if (!budget) {
        return res.status(404).json({ message: "Budget item not found" });
      }
      res.json(budget);
    } catch (error) {
      console.error("Error updating budget item:", error);
      res.status(400).json({ message: "Failed to update budget item" });
    }
  });

  app.delete("/api/budget/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBudgetItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget item:", error);
      res.status(500).json({ message: "Failed to delete budget item" });
    }
  });

  // Deliverable routes
  app.get("/api/deliverables", isAuthenticated, async (req, res) => {
    try {
      const deliverables = await storage.getDeliverables();
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  app.post("/api/deliverables", isAuthenticated, async (req, res) => {
    try {
      const data = insertDeliverableSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID });
      const deliverable = await storage.createDeliverable(data);
      res.status(201).json(deliverable);
    } catch (error) {
      console.error("Error creating deliverable:", error);
      res.status(400).json({ message: "Invalid deliverable data" });
    }
  });

  app.patch("/api/deliverables/:id", isAuthenticated, async (req, res) => {
    try {
      const deliverable = await storage.updateDeliverable(req.params.id, req.body);
      if (!deliverable) {
        return res.status(404).json({ message: "Deliverable not found" });
      }
      res.json(deliverable);
    } catch (error) {
      console.error("Error updating deliverable:", error);
      res.status(400).json({ message: "Failed to update deliverable" });
    }
  });

  app.delete("/api/deliverables/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDeliverable(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      res.status(500).json({ message: "Failed to delete deliverable" });
    }
  });

  // Email campaign routes
  app.get("/api/emails", isAuthenticated, async (req, res) => {
    try {
      const emails = await storage.getEmailCampaigns();
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch email campaigns" });
    }
  });

  app.post("/api/emails", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertEmailCampaignSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID, createdBy: userId });
      const email = await storage.createEmailCampaign(data);
      res.status(201).json(email);
    } catch (error) {
      console.error("Error creating email campaign:", error);
      res.status(400).json({ message: "Invalid email campaign data" });
    }
  });

  app.patch("/api/emails/:id", isAuthenticated, async (req, res) => {
    try {
      const email = await storage.updateEmailCampaign(req.params.id, req.body);
      if (!email) {
        return res.status(404).json({ message: "Email campaign not found" });
      }
      res.json(email);
    } catch (error) {
      console.error("Error updating email campaign:", error);
      res.status(400).json({ message: "Failed to update email campaign" });
    }
  });

  app.delete("/api/emails/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmailCampaign(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email campaign:", error);
      res.status(500).json({ message: "Failed to delete email campaign" });
    }
  });

  // Social post routes
  app.get("/api/social", isAuthenticated, async (req, res) => {
    try {
      const posts = await storage.getSocialPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching social posts:", error);
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  app.post("/api/social", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertSocialPostSchema.parse({ ...req.body, eventId: DEFAULT_EVENT_ID, createdBy: userId });
      const post = await storage.createSocialPost(data);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating social post:", error);
      res.status(400).json({ message: "Invalid social post data" });
    }
  });

  app.patch("/api/social/:id", isAuthenticated, async (req, res) => {
    try {
      const post = await storage.updateSocialPost(req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ message: "Social post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error updating social post:", error);
      res.status(400).json({ message: "Failed to update social post" });
    }
  });

  app.delete("/api/social/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSocialPost(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting social post:", error);
      res.status(500).json({ message: "Failed to delete social post" });
    }
  });

  return httpServer;
}

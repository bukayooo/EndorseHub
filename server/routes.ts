import type { Express, Request } from "express";
import { setupAuth } from "./auth";

import { and } from "drizzle-orm";
// Extend Express Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    password: string;
    isPremium: boolean | null;
    stripeCustomerId: string | null;
    createdAt: Date | null;
    marketingEmails: boolean | null;
    keepMeLoggedIn: boolean | null;
    username: string | null;
  };
}
import { db } from "../db";
import { testimonials, users, widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function registerRoutes(app: Express) {
  // Setup authentication routes and middleware
  setupAuth(app);
  // Testimonials
  app.get("/api/testimonials", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.log('Unauthorized testimonial access attempt');
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(`Fetching testimonials for user ID: ${userId}`);
      const results = await db.query.testimonials.findMany({
        where: eq(testimonials.userId, userId),
        orderBy: (testimonials, { desc }) => [desc(testimonials.createdAt)],
        limit: 10,
      });
      console.log(`Found ${results.length} testimonials for user ${userId}`);
      res.json(results);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  });
  app.delete("/api/testimonials/:id", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const testimonialId = parseInt(req.params.id);
      
      // Only allow deletion if the testimonial belongs to the user
      const [testimonial] = await db
        .select()
        .from(testimonials)
        .where(and(
          eq(testimonials.id, testimonialId),
          eq(testimonials.userId, req.user.id)
        ))
        .limit(1);

      if (!testimonial) {
        return res.status(404).json({ error: "Testimonial not found" });
      }

      await db.delete(testimonials)
        .where(and(
          eq(testimonials.id, testimonialId),
          eq(testimonials.userId, req.user.id)
        ));

      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      res.status(500).json({ error: "Failed to delete testimonial" });
    }
  });

  app.delete("/api/testimonials/all", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      await db.delete(testimonials);
      
      res.json({ message: "All testimonials deleted successfully" });
    } catch (error) {
      console.error('Error deleting testimonials:', error);
      res.status(500).json({ error: "Failed to delete testimonials" });
    }
  });


  app.post("/api/testimonials", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { authorName, content, rating } = req.body;
      
      // Validate required fields
      if (!authorName?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "Author name and content are required" });
      }

      const testimonial = await db.insert(testimonials).values({
        authorName: authorName.trim(),
        content: content.trim(),
        rating: Math.min(Math.max(parseInt(rating) || 5, 1), 5), // Ensure rating is between 1 and 5
        userId: req.user.id, // Always use the authenticated user's ID
        status: 'pending',
        source: 'direct',
        createdAt: new Date(),
      }).returning();

      res.json(testimonial[0]);
    } catch (error) {
      console.error('Error creating testimonial:', error);
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  });

  // Widgets
  app.get("/api/widgets", async (req: AuthenticatedRequest, res) => {
    try {
      const results = await db.query.widgets.findMany({
        where: eq(widgets.userId, req.user?.id || 1), // TODO: Proper auth
      });
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  app.post("/api/widgets", async (req: AuthenticatedRequest, res) => {
    try {
      const widget = await db.insert(widgets).values({
        ...req.body,
        userId: req.user?.id || 1, // TODO: Proper auth
      }).returning();
      res.json(widget[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create widget" });
    }
  });

  // Analytics
  app.get("/api/stats", async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const [testimonialCount, widgetCount] = await Promise.all([
        db.query.testimonials.findMany({
          where: eq(testimonials.userId, req.user.id)
        }).then(r => r.length),
        db.query.widgets.findMany({
          where: eq(widgets.userId, req.user.id)
        }).then(r => r.length),
      ]);

      res.json({
        testimonialCount,
        widgetCount,
        viewCount: 0, // TODO: Implement real analytics
        conversionRate: "0%",
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Widget Embed
  app.get("/embed/:widgetId", async (req, res) => {
    try {
      const widget = await db.query.widgets.findFirst({
        where: eq(widgets.id, parseInt(req.params.widgetId)),
      });

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Update analytics
      await db.insert(analytics).values({
        widgetId: widget.id,
        views: 1,
      });

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* Minimal styles for the embedded widget */
            body { margin: 0; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          <div id="testimonial-widget" data-widget-id="${widget.id}">
            <!-- Widget content will be dynamically loaded -->
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({ error: "Failed to serve widget" });
    }
  });
}

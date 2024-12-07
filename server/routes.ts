import type { Express } from "express";
import { db } from "../db";
import { testimonials, users, widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function registerRoutes(app: Express) {
  // Testimonials
  app.get("/api/testimonials", async (req, res) => {
    try {
      const results = await db.query.testimonials.findMany({
        orderBy: (testimonials, { desc }) => [desc(testimonials.createdAt)],
        limit: 10,
      });
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  });

  app.post("/api/testimonials", async (req, res) => {
    try {
      const testimonial = await db.insert(testimonials).values({
        ...req.body,
        userId: req.user?.id || 1, // TODO: Proper auth
      }).returning();
      res.json(testimonial[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  });

  // Widgets
  app.get("/api/widgets", async (req, res) => {
    try {
      const results = await db.query.widgets.findMany({
        where: eq(widgets.userId, req.user?.id || 1), // TODO: Proper auth
      });
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  app.post("/api/widgets", async (req, res) => {
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
  app.get("/api/stats", async (req, res) => {
    try {
      const [testimonialCount, widgetCount] = await Promise.all([
        db.query.testimonials.findMany().then(r => r.length),
        db.query.widgets.findMany().then(r => r.length),
      ]);

      res.json({
        testimonialCount,
        widgetCount,
        viewCount: 0, // TODO: Implement real analytics
        conversionRate: "0%",
      });
    } catch (error) {
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

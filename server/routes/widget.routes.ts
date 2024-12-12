import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";

const router = Router();

export function setupWidgetRoutes(app: Router) {
  // Get all widgets
  const getAllWidgets: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const result = await db
        .select()
        .from(widgets)
        .where(eq(widgets.userId, req.user.id))
        .orderBy(widgets.createdAt);
      res.json(result);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  };

  // Get single widget
  const getWidget: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      if (isNaN(widgetId)) {
        return res.status(400).json({ error: "Invalid widget ID" });
      }

      const [widget] = await db
        .select()
        .from(widgets)
        .where(eq(widgets.id, widgetId))
        .limit(1);

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      res.json(widget);
    } catch (error) {
      console.error('Error fetching widget:', error);
      res.status(500).json({ error: "Failed to fetch widget" });
    }
  };

  // Create widget
  const createWidget: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.user?.isPremium) {
        return res.status(403).json({ 
          error: "Premium subscription required",
          code: "PREMIUM_REQUIRED"
        });
      }

      const { name, customization = {}, testimonialIds = [] } = req.body;
      const validatedTestimonialIds = testimonialIds
        .map((id: any) => Number(id))
        .filter((id: number) => !isNaN(id));

      const [result] = await db.insert(widgets).values({
        name,
        userId: req.user.id,
        template: 'default',
        customization,
        createdAt: new Date(),
        testimonialIds: validatedTestimonialIds
      }).returning();

      res.json(result);
    } catch (error) {
      console.error('Error creating widget:', error);
      res.status(500).json({ error: "Failed to create widget" });
    }
  };

  // Public embed route
  router.get("/embed/:widgetId", async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      if (isNaN(widgetId)) {
        return res.status(400).json({ error: "Invalid widget ID" });
      }

      const [widget] = await db
        .select()
        .from(widgets)
        .where(eq(widgets.id, widgetId))
        .limit(1);

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Track analytics
      await db.insert(analytics).values({
        widgetId: widget.id,
        views: 1,
        date: new Date()
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('X-Frame-Options', 'ALLOWALL');

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script>
              window.WIDGET_DATA = ${JSON.stringify({
                widget,
                customization: widget.customization || {
                  theme: 'default',
                  showRatings: true,
                  showImages: true
                }
              })};
            </script>
            <script src="/widget.js" defer></script>
          </head>
          <body>
            <div id="testimonial-widget" data-widget-id="${widget.id}"></div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error serving widget:', error);
      res.status(500).json({ error: "Failed to serve widget" });
    }
  });

  // Register routes
  router.get("/", requireAuth, getAllWidgets);
  router.get("/:id", getWidget);
  router.post("/", requireAuth, createWidget);

  // Mount routes
  app.use("/widgets", router);
  return router;
}

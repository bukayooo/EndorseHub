import { Router } from "express";
import { db } from "../../db";
import { widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";
import { type RouteHandler, requireAuth, getUserId, isAuthenticated } from "../types/routes";

const router = Router();

export function setupWidgetRoutes(app: Router) {
  // Get all widgets
  const getAllWidgets: RouteHandler = async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const results = await db.query.widgets.findMany({
        where: eq(widgets.userId, userId),
        orderBy: (widgets, { desc }) => [desc(widgets.createdAt)]
      });
      
      res.json(results);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  };

  // Get single widget
  const getWidget: RouteHandler = async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const widgetId = parseInt(req.params.id);
      const widget = await db.query.widgets.findFirst({
        where: eq(widgets.id, widgetId)
      });

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      if (widget.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(widget);
    } catch (error) {
      console.error('Error fetching widget:', error);
      res.status(500).json({ error: "Failed to fetch widget" });
    }
  };

  // Create widget
  const createWidget: RouteHandler = async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!req.user?.isPremium) {
        return res.status(403).json({ 
          error: "Premium subscription required",
          code: "PREMIUM_REQUIRED"
        });
      }

      const { testimonialIds, ...widgetData } = req.body;
      
      const validatedTestimonialIds = Array.isArray(testimonialIds) 
        ? testimonialIds.map(id => Number(id)).filter(id => !isNaN(id))
        : [];

      const [widget] = await db.insert(widgets).values({
        ...widgetData,
        testimonialIds: validatedTestimonialIds,
        userId,
        createdAt: new Date()
      }).returning();

      res.json(widget);
    } catch (error) {
      console.error('Error creating widget:', error);
      res.status(500).json({ error: "Failed to create widget" });
    }
  };

  // Register routes
  router.get("/", requireAuth, getAllWidgets);
  router.get("/:id", requireAuth, getWidget);
  router.post("/", requireAuth, createWidget);

  // Embed widget
  router.get("/embed/:widgetId", async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      if (isNaN(widgetId)) {
        return res.status(400).json({ error: "Invalid widget ID" });
      }

      const widget = await db.query.widgets.findFirst({
        where: eq(widgets.id, widgetId)
      });

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Update analytics
      await db.insert(analytics).values({
        widgetId: widget.id,
        views: 1,
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

  // Mount routes
  app.use("/widgets", router);
  return router;
}

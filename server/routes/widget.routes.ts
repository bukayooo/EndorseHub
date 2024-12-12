import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth, getUserId } from "../types/routes";

const router = Router();

export function setupWidgetRoutes(app: Router) {
  // Get all widgets
  const getAllWidgets: RouteHandler = async (req, res) => {
    try {
      const userId = getUserId(req);
      const query = `
        SELECT * FROM widgets 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await db.execute(query, [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  };

  // Get single widget
  const getWidget: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      const query = `
        SELECT * FROM widgets 
        WHERE id = $1
      `;
      const result = await db.execute(query, [widgetId]);
      const widget = result.rows[0];

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
      const userId = getUserId(req);
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

      const query = `
        INSERT INTO widgets 
        (testimonial_ids, user_id, created_at, customization, name, description)
        VALUES ($1, $2, NOW(), $3, $4, $5)
        RETURNING *
      `;
      const result = await db.execute(query, [
        validatedTestimonialIds,
        userId,
        widgetData.customization || {},
        widgetData.name,
        widgetData.description
      ]);

      res.json(result.rows[0]);
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

      const query = `SELECT * FROM widgets WHERE id = $1`;
      const result = await db.execute(query, [widgetId]);
      const widget = result.rows[0];

      if (!widget) {
        return res.status(404).json({ error: "Widget not found" });
      }

      // Update analytics
      await db.execute(
        `INSERT INTO analytics (widget_id, views, date) VALUES ($1, 1, NOW())`,
        [widget.id]
      );

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

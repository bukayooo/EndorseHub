import { Router } from "express";
import { db } from "../../db";
import { type RouteHandler, requireAuth } from "../types/routes";
import { widgets, analytics } from "@db/schema";
import { eq } from "drizzle-orm";
import { sql } from 'drizzle-orm';

const router = Router();

export function setupWidgetRoutes(app: Router) {
  // Debug middleware
  router.use((req, res, next) => {
    console.log('[Widget Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id
    });
    next();
  });

  // Get all widgets
  const getAllWidgets: RouteHandler = async (req, res) => {
    try {
      console.log('[Widget] Get all request:', {
        sessionID: req.sessionID,
        isAuth: req.isAuthenticated(),
        userId: req.user?.id
      });

      if (!req.isAuthenticated() || !req.user?.id) {
        return res.status(401).json({ 
          success: false, 
          error: "Authentication required" 
        });
      }

      console.log('[Widget] User authenticated:', req.user.id);

      console.log('[WidgetRoutes] Fetching widgets for user:', req.user.id);
      const result = await db
        .select({
          id: widgets.id,
          name: widgets.name,
          template: widgets.template,
          customization: widgets.customization,
          testimonial_ids: widgets.testimonial_ids,
          created_at: widgets.created_at
        })
        .from(widgets)
        .where(eq(widgets.user_id, req.user.id))
        .orderBy(sql`${widgets.created_at} DESC`);
      console.log('[WidgetRoutes] Found widgets:', result?.length || 0);

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching widgets:', error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch widgets" 
      });
    }
  };

  // Create widget
  const createWidget: RouteHandler = async (req, res) => {
    try {
      const { name, template, customization, testimonial_ids } = req.body;
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const [widget] = await db
        .insert(widgets)
        .values({
          name,
          user_id,
          template,
          customization,
          testimonial_ids,
          created_at: new Date()
        })
        .returning();

      return res.json({
        success: true,
        data: widget
      });
    } catch (error) {
      console.error('[WidgetRoutes] Error creating widget:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create widget'
      });
    }
  };

  // Get widget by ID
  const getWidgetById: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      if (isNaN(widgetId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid widget ID"
        });
      }

      console.log(`[Widget] Fetching widget ${widgetId}`);
      const result = await db
        .select()
        .from(widgets)
        .where(sql`${widgets.id} = ${widgetId}`)
        .limit(1);

      if (!result.length) {
        return res.status(404).json({
          success: false,
          error: "Widget not found"
        });
      }

      return res.json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error('Error fetching widget:', error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch widget"
      });
    }
  };

  // Get widget by ID (public endpoint)
  const getPublicWidget: RouteHandler = async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      if (isNaN(widgetId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid widget ID"
        });
      }

      console.log(`[Widget] Fetching public widget ${widgetId}`);
      const result = await db
        .select({
          id: widgets.id,
          template: widgets.template,
          customization: widgets.customization,
          testimonial_ids: widgets.testimonial_ids
        })
        .from(widgets)
        .where(sql`${widgets.id} = ${widgetId}`)
        .limit(1);

      if (!result.length) {
        return res.status(404).json({
          success: false,
          error: "Widget not found"
        });
      }

      // Get testimonials for this widget
      const testimonials = await db
        .select()
        .from(testimonials)
        .where(sql`${testimonials.id} = ANY(${result[0].testimonial_ids})`);

      return res.json({
        success: true,
        data: {
          ...result[0],
          testimonials
        }
      });
    } catch (error) {
      console.error('Error fetching widget:', error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch widget"
      });
    }
  };

  // Serve widget script
  const serveWidgetScript: RouteHandler = async (req, res) => {
    const script = `
      (function() {
        const container = document.getElementById('testimonial-widget');
        if (!container) return;
        
        const widgetId = container.getAttribute('data-widget-id');
        if (!widgetId) return;

        async function loadWidget() {
          try {
            const response = await fetch(\`${req.protocol}://${req.get('host')}/api/widgets/\${widgetId}\`);
            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.error || 'Failed to load widget');
            }

            const widget = data.data;
            
            // Create widget HTML
            const html = \`
              <div class="testimonial-widget">
                \${widget.testimonials.map(t => \`
                  <div class="testimonial">
                    <p class="content">\${t.content}</p>
                    <p class="author">- \${t.author_name}</p>
                    \${widget.customization.showRatings && t.rating ? \`
                      <div class="rating">\${t.rating} stars</div>
                    \` : ''}
                  </div>
                \`).join('')}
              </div>
            \`;

            // Add styles
            const styles = \`
              <style>
                .testimonial-widget {
                  font-family: system-ui, -apple-system, sans-serif;
                  max-width: 800px;
                  margin: 0 auto;
                }
                .testimonial {
                  background: \${widget.customization.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
                  color: \${widget.customization.theme === 'dark' ? '#ffffff' : '#000000'};
                  padding: 1.5rem;
                  margin: 1rem 0;
                  border-radius: 0.5rem;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .testimonial .content {
                  font-size: 1rem;
                  line-height: 1.5;
                  margin: 0 0 1rem 0;
                }
                .testimonial .author {
                  font-weight: 500;
                  margin: 0;
                }
                .testimonial .rating {
                  color: #fbbf24;
                  margin-top: 0.5rem;
                }
              </style>
            \`;

            container.innerHTML = styles + html;
          } catch (error) {
            console.error('Error loading testimonial widget:', error);
            container.innerHTML = '<p style="color: #ef4444;">Error loading testimonials</p>';
          }
        }

        loadWidget();
      })();
    `;

    res.setHeader('Content-Type', 'application/javascript');
    res.send(script);
  };

  // Register routes
  router.get("/", requireAuth, getAllWidgets);
  router.get("/widget.js", serveWidgetScript);
  router.get("/:id", getPublicWidget);
  router.post("/", requireAuth, createWidget);

  // Mount routes at /widgets
  app.use("/widgets", router);
  console.log('[Widget] Routes mounted at /widgets');
  return router;
}
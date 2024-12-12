import { type Express } from "express";
import { setupAuthRoutes } from "./auth.routes";
import { setupTestimonialRoutes } from "./testimonial.routes";
import { setupWidgetRoutes } from "./widget.routes";
import { setupAnalyticsRoutes } from "./analytics.routes";

export async function setupRoutes(app: Express) {
  // Register all route modules
  setupAuthRoutes(app);
  setupTestimonialRoutes(app);
  setupWidgetRoutes(app);
  setupAnalyticsRoutes(app);
  
  // Add more route modules here as needed
  
  // 404 handler for unmatched routes
  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });
}

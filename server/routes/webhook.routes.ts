import { Router } from "express";

export function setupWebhookRoutes(app: Router) {
  const router = Router();
  
  // Note: Stripe webhook is now handled in server/index.ts
  
  app.use('/webhooks', router);
  return router;
} 
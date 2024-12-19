
import { Router } from "express";
import { isAuthenticated } from '../middleware/auth';
import { createCheckoutSession } from '../stripe';

export function setupBillingRoutes(app: Router) {
  const router = Router();

  // Debug middleware for billing routes
  router.use((req, res, next) => {
    console.log('[Billing Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id,
      isAuthenticated: req.isAuthenticated()
    });
    next();
  });

  // Create checkout session
  router.post('/create-checkout-session', isAuthenticated, createCheckoutSession);

  app.use('/billing', router);
  return router;
}

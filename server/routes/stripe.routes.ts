import { Router } from "express";
import type { Request } from "express";
import { createCheckoutSession, handleWebhook } from '../stripe';
import express from 'express';

import { type AuthenticatedRequest } from '../types/routes';

const router = Router();

export function setupStripeRoutes(app: Router) {
  // Stripe webhook needs raw body
  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
  );
  
  // Create checkout session
  const createCheckoutHandler: RouteHandler = async (req, res) => {
    try {
      try {
        assertAuthenticated(req);
      } catch {
        return res.status(401).json({ error: "Authentication required" });
      }
      return createCheckoutSession(req, res);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  };

  router.post('/create-checkout-session', createCheckoutHandler);

  // Mount routes
  app.use("/billing", router);
  return router;
}

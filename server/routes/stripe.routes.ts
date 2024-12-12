import { Router } from "express";
import type { Request } from "express";
import { createCheckoutSession, handleWebhook } from '../stripe';
import express from 'express';

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

const router = Router();

export function setupStripeRoutes(app: Router) {
  // Stripe webhook needs raw body
  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
  );
  
  // Create checkout session
  router.post('/create-checkout-session', async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      return createCheckoutSession(req, res);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Mount routes
  app.use("/billing", router);
  return router;
}

import { Router } from "express";
import express from 'express';
import { createCheckoutSession, handleWebhook } from '../stripe.js';
import { requireAuth } from "../middleware/auth.js";

const router = Router();

export function setupStripeRoutes(app: Router) {
  console.log('[Stripe] Setting up routes...');
  const router = Router();

  // Single middleware for handling both webhook and regular requests
  router.use((req, res, next) => {
    if (req.originalUrl.includes('/webhook')) {
      express.raw({ type: 'application/json' })(req, res, next);
    } else {
      express.json()(req, res, next);
    }
  });

  router.use((req, res, next) => {
    console.log('[Stripe Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.originalUrl.includes('/webhook') ? '[Raw Body]' : req.body,
      user: req.user?.id,
      session: req.sessionID
    });
    next();
  });

  // Stripe webhook needs raw body
  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
  );
  
  // Create checkout session
  router.post('/create-checkout-session', requireAuth, async (req, res) => {
    try {
      console.log('[Stripe] Creating checkout session:', {
        body: req.body,
        user: req.user?.id,
        path: req.path
      });

      if (!req.user?.id || !req.user?.email) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const { planType } = req.body;
      if (!planType || !['monthly', 'yearly'].includes(planType)) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid plan type" 
        });
      }

      const session = await createCheckoutSession(req.user.id, req.user.email, planType);
      console.log('[Stripe] Checkout session created:', session);
      return res.json(session);
    } catch (error) {
      console.error('[Stripe] Error creating checkout session:', error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout session" 
      });
    }
  });

  // Mount routes under /api/billing
  app.use("/api/billing", router);
  console.log('[Stripe] Routes mounted at /api/billing');
  return router;
}
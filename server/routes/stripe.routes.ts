import { Router } from "express";
import express from 'express';
import { createCheckoutSession, handleWebhook } from '../stripe';
import { type RouteHandler, requireAuth } from "../types/routes";

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
      const { url } = await createCheckoutSession(req, res);
      return res.json({ url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  };

  router.post('/create-checkout-session', requireAuth, createCheckoutHandler);

  // Mount routes
  app.use("/billing", router);
  return router;
}

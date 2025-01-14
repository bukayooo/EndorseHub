import { Router } from "express";
import { createCheckoutSession } from '../stripe';
import { type RouteHandler, requireAuth } from "../types/routes";
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { stripe } from '../stripe';
import { isAuthenticated } from '../middleware/auth';
import { users } from "../../db/schema";

const router = Router();

export function setupStripeRoutes(app: Router) {
  // Debug middleware for routes
  router.use((req, res, next) => {
    console.log('[Stripe Route] Request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      user: req.user?.id,
      session: req.session?.id
    });
    next();
  });
  
  // Get subscription status
  const getSubscriptionStatus: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user?.stripeSubscriptionId) {
        return res.json({
          success: true,
          data: {
            isActive: false
          }
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      return res.json({
        success: true,
        data: {
          isActive: subscription.status === 'active',
          plan: subscription.items.data[0]?.price.nickname || 'premium',
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      });
    } catch (error) {
      console.error('[Stripe] Error fetching subscription status:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch subscription status"
      });
    }
  };

  // Create checkout session
  const createCheckoutHandler: RouteHandler = async (req, res) => {
    try {
      console.log('[Stripe] Creating checkout session:', {
        body: req.body,
        user: req.user?.id,
        path: req.path
      });

      if (!req.user?.id) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required" 
        });
      }

      const { priceType } = req.body;
      if (!priceType || !['monthly', 'yearly'].includes(priceType)) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid price type" 
        });
      }

      const session = await createCheckoutSession(req.user.id, priceType);
      console.log('[Stripe] Checkout session created:', session);
      return res.json({ 
        success: true, 
        data: { url: session.url } 
      });
    } catch (error) {
      console.error('[Stripe] Error creating checkout session:', error);
      return res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout session" 
      });
    }
  };

  // Cancel subscription
  const cancelSubscription: RouteHandler = async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required"
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({
          success: false,
          error: "No active subscription found"
        });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      return res.json({
        success: true,
        data: {
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        }
      });
    } catch (error) {
      console.error('[Stripe] Error cancelling subscription:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel subscription"
      });
    }
  };

  // Register routes
  router.get('/subscription-status', isAuthenticated, getSubscriptionStatus);
  router.post('/create-checkout-session', isAuthenticated, createCheckoutHandler);
  router.post('/cancel-subscription', isAuthenticated, cancelSubscription);

  // Mount routes under /billing
  app.use("/billing", router);
  console.log('[Stripe] Routes mounted at /billing');
  return router;
}

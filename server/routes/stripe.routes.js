import { Router } from "express";
import express from 'express';
import { createCheckoutSession, handleWebhook } from '../stripe';
import { requireAuth } from "../types/routes";
const router = Router();
export function setupStripeRoutes(app) {
    // Debug middleware
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
    // Stripe webhook needs raw body
    router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);
    // Create checkout session
    const createCheckoutHandler = async (req, res) => {
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
        }
        catch (error) {
            console.error('[Stripe] Error creating checkout session:', error);
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Failed to create checkout session"
            });
        }
    };
    router.post('/create-checkout-session', requireAuth, createCheckoutHandler);
    // Mount routes under /billing
    app.use("/billing", router);
    console.log('[Stripe] Routes mounted at /billing');
    return router;
}

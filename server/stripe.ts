import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { db, where, schema } from '../db';
import { eq } from 'drizzle-orm';

const { users } = schema;

// Initialize Stripe with proper typing and fallback for development
const config = {
  apiVersion: '2023-08-16'
} as const;

// Get Stripe key with fallback for development
const stripeKey = process.env.STRIPE_SECRET_KEY || (
  process.env.NODE_ENV === 'production' 
    ? null  // No fallback in production
    : 'sk_test_fallback'  // Fallback only in development
);

// Log detailed environment state
console.log('[Stripe] Detailed environment check:', {
  // Stripe-specific variables
  stripeKey: {
    exists: !!stripeKey,
    length: stripeKey?.length,
    prefix: stripeKey?.substring(0, 4),
    isValid: stripeKey?.startsWith('sk_')
  },
  webhookSecret: {
    exists: !!process.env.STRIPE_WEBHOOK_SECRET,
    length: process.env.STRIPE_WEBHOOK_SECRET?.length,
    prefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 6),
    isValid: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')
  },
  // Environment info
  environment: process.env.NODE_ENV,
  replitEnv: process.env.REPLIT_ENVIRONMENT,
  deploymentId: process.env.REPLIT_DEPLOYMENT_ID,
  // Available variables
  stripeKeys: Object.keys(process.env).filter(key => key.includes('STRIPE')),
  secretKeys: Object.keys(process.env).filter(key => key.includes('SECRET') || key.includes('KEY')).length,
  // Process info
  pid: process.pid,
  uptime: process.uptime()
});

// Initialize Stripe instance with fallback for development
let stripe: Stripe;
try {
  if (!stripeKey && process.env.NODE_ENV === 'production') {
    console.error('[Stripe] Critical Error: Missing STRIPE_SECRET_KEY in production environment');
    process.exit(1);
  }
  
  stripe = new Stripe(stripeKey || 'sk_test_fallback', config);
  
  // Log initialization status (without exposing sensitive data)
  console.log('[Stripe] Initialized successfully:', {
    apiVersion: '2023-08-16',
    secretKeyPrefix: stripeKey?.substring(0, 4) + '...',
    webhookConfigured: process.env.STRIPE_WEBHOOK_SECRET ? '✓' : '✗',
    environment: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production'
  });
} catch (error) {
  console.error('[Stripe] Failed to initialize:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

// Price IDs for your products
const PRICES = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
  YEARLY: process.env.STRIPE_PRICE_YEARLY,
} as const;

// Validate price IDs
if (!PRICES.MONTHLY || !PRICES.YEARLY) {
  console.warn('Stripe price IDs not configured, checkout will not work:', {
    monthly: PRICES.MONTHLY ? 'configured' : 'missing',
    yearly: PRICES.YEARLY ? 'configured' : 'missing'
  });
}

interface CreateCheckoutSessionBody {
  priceType: 'monthly' | 'yearly';
}

export async function createCheckoutSession(userId: number, priceType: 'monthly' | 'yearly' = 'monthly') {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(where(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const priceId = priceType === 'yearly' ? PRICES.YEARLY : PRICES.MONTHLY;

    console.log('Price IDs configuration:', {
      monthly: PRICES.MONTHLY || 'missing',
      yearly: PRICES.YEARLY || 'missing',
      requested: priceType,
      selectedPriceId: priceId
    });

    // Validate price ID
    if (!priceId) {
      throw new Error(`Price ID not found for ${priceType} subscription`);
    }

    // Get client URL from environment or use appropriate default
    const clientUrl = process.env.CLIENT_URL || 
      (process.env.REPL_ID  // Check if running on Replit
        ? 'https://endorsehub.com'  // Use replit URL on Replit
        : 'http://localhost:5173');        // Use localhost otherwise

    // Create a checkout session
    console.log('Creating Stripe checkout session with config:', {
      priceId,
      userEmail: user.email,
      userId: user.id,
      successUrl: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${clientUrl}/dashboard?payment=cancelled`
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/dashboard?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        userId: user.id.toString(),
        priceType,
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      currency: 'usd',
    });

    console.log('Checkout session created:', { 
      sessionId: session.id,
      url: session.url 
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export { stripe };
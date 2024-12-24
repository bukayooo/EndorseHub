import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

// Price IDs for your products
const PRICES = {
  MONTHLY: process.env.STRIPE_TEST_PRICE_MONTHLY,
  YEARLY: process.env.STRIPE_TEST_PRICE_YEARLY,
} as const;

// Validate price IDs
if (!PRICES.MONTHLY || !PRICES.YEARLY) {
  console.warn('Stripe price IDs not configured, checkout will not work:', {
    monthly: PRICES.MONTHLY ? 'configured' : 'missing',
    yearly: PRICES.YEARLY ? 'configured' : 'missing'
  });
}

// Define Stripe configuration
const STRIPE_CONFIG = {
  apiVersion: '2022-11-15' as const, // Use the version that matches @types/stripe
  typescript: true as const, // Explicitly type as const true to match StripeConfig
  timeout: 20000
};

// Initialize Stripe with proper typing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);

// Log initialization status (without exposing sensitive data)
console.log('Stripe initialized successfully:', {
  apiVersion: STRIPE_CONFIG.apiVersion,
  secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
  monthlyPriceId: PRICES.MONTHLY ? '✓' : '✗',
  yearlyPriceId: PRICES.YEARLY ? '✓' : '✗',
  webhookConfigured: process.env.STRIPE_WEBHOOK_SECRET ? '✓' : '✗'
});

interface CreateCheckoutSessionBody {
  priceType: 'monthly' | 'yearly';
}

export async function createCheckoutSession(userId: number, priceType: 'monthly' | 'yearly' = 'monthly') {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

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
        ? 'https://endorsehub.replit.app'  // Use replit URL on Replit
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

export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '');
        
        if (userId) {
          await db.update(users)
            .set({ 
              isPremium: true,
              stripeCustomerId: session.customer as string 
            })
            .where(eq(users.id, userId));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;
        
        await db.update(users)
          .set({ isPremium: false })
          .where(eq(users.stripeCustomerId, customer));
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
}

export { stripe };
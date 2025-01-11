import { Stripe } from 'stripe';
import type { Request, Response } from 'express';
import { db, where, schema } from '../db';

const { users } = schema;

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

// Initialize Stripe with proper typing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true
});

// Log initialization status (without exposing sensitive data)
console.log('Stripe initialized successfully:', {
  apiVersion: '2023-10-16',
  secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
  webhookConfigured: process.env.STRIPE_WEBHOOK_SECRET ? '✓' : '✗'
});

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

export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  console.log('[Stripe Webhook] Processing request:', {
    hasSignature: !!sig,
    hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    bodyType: typeof req.body,
    isBuffer: Buffer.isBuffer(req.body),
    contentType: req.headers['content-type']
  });

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] Missing signature or webhook secret');
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('[Stripe Webhook] Received event:', {
      type: event.type,
      id: event.id,
      object: event.data.object
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '');

        console.log('[Stripe Webhook] Processing checkout completion:', {
          userId,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        if (!userId) {
          console.error('[Stripe Webhook] Missing userId in metadata');
          return res.status(400).json({ error: 'Missing userId in metadata' });
        }

        // Update user's premium status using snake_case column names
        await db.update(users)
          .set({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            premium_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          })
          .where(where(users.id, userId));

        console.log('[Stripe Webhook] Updated user premium status:', { userId });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;

        console.log('[Stripe Webhook] Processing subscription deletion:', {
          customer,
          subscription: subscription.id
        });

        // Remove premium status using snake_case column names
        await db.update(users)
          .set({ 
            is_premium: false,
            premium_expires_at: null,
            stripe_subscription_id: null
          })
          .where(where(users.stripe_customer_id, customer));

        console.log('[Stripe Webhook] Updated user premium status to false');
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    const message = error instanceof Error ? error.message : 'Webhook error';
    res.status(400).json({ error: message });
  }
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
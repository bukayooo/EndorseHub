import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@db/schema';

// Initialize Stripe with proper typing
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true
});

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

export async function createCheckoutSession(userId: number, priceType: 'monthly' | 'yearly' = 'monthly') {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
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

    if (!priceId) {
      throw new Error(`Price ID not found for ${priceType} subscription`);
    }

    // Get client URL from environment or use appropriate default
    const clientUrl = process.env.CLIENT_URL || 
      (process.env.REPL_ID  // Check if running on Replit
        ? 'https://endorsehub.com'  // Use replit URL on Replit
        : 'http://localhost:5173');  // Use localhost otherwise

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[Stripe Webhook] Missing signature or webhook secret');
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    console.log('[Stripe Webhook] Processing event:', {
      type: event.type,
      id: event.id
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '');

        if (!userId) {
          console.error('[Stripe Webhook] Missing userId in session metadata', session.metadata);
          return res.status(400).json({ error: 'Missing userId in session metadata' });
        }

        console.log('[Stripe Webhook] Processing completed checkout:', {
          userId,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        if (typeof session.subscription !== 'string') {
          throw new Error('Invalid subscription ID');
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await db.update(users)
          .set({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id
          })
          .where(eq(users.id, userId));

        console.log('[Stripe Webhook] User premium status updated successfully');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;

        console.log('[Stripe Webhook] Processing subscription deletion:', {
          customer,
          subscriptionId: subscription.id
        });

        await db.update(users)
          .set({
            is_premium: false,
            stripe_subscription_id: null
          })
          .where(eq(users.stripe_customer_id, customer));

        console.log('[Stripe Webhook] User premium status revoked successfully');
        break;
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return res.status(400).json({
      error: 'Webhook error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export { stripe };
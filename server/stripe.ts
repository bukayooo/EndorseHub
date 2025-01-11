import { Stripe } from 'stripe';
import type { Request, Response } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '@db/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  typescript: true
});

const PRICES = {
  MONTHLY: process.env.STRIPE_TEST_PRICE_MONTHLY,
  YEARLY: process.env.STRIPE_TEST_PRICE_YEARLY,
} as const;

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

    if (!priceId) {
      throw new Error(`Price ID not found for ${priceType} subscription`);
    }

    const clientUrl = process.env.CLIENT_URL ||
      (process.env.REPL_ID
        ? 'https://endorsehub.com'
        : 'http://localhost:5173');

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

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function handleWebhook(req: Request, res: Response) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] Missing webhook secret');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    console.error('[Stripe Webhook] No stripe signature in header');
    return res.status(400).json({ error: 'No signature in headers' });
  }

  let event: Stripe.Event;

  try {
    // Construct and verify the event
    event = stripe.webhooks.constructEvent(
      req.body, // Raw buffer from express.raw()
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('[Stripe Webhook] Event verified:', {
      type: event.type,
      id: event.id
    });

    // Handle the verified event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '');

        if (!userId) {
          throw new Error('Missing userId in session metadata');
        }

        if (typeof session.subscription !== 'string') {
          throw new Error('Invalid subscription ID');
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await db.update(users)
          .set({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripeSubscriptionId: subscription.id
          })
          .where(eq(users.id, userId));

        console.log('[Stripe Webhook] Updated user premium status:', { userId });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;

        await db.update(users)
          .set({
            is_premium: false,
            stripeSubscriptionId: null
          })
          .where(eq(users.stripe_customer_id, customer));

        console.log('[Stripe Webhook] Revoked user premium status');
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
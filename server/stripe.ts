import Stripe from 'stripe';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

const { users } = schema;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  typescript: true
});

const PRICES = {
  MONTHLY: process.env.STRIPE_TEST_PRICE_MONTHLY,
  YEARLY: process.env.STRIPE_TEST_PRICE_YEARLY,
} as const;

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
    const clientUrl = process.env.CLIENT_URL || 
      (process.env.REPL_ID ? 'https://endorsehub.com' : 'http://localhost:5173');

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

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '');

        if (!userId) {
          throw new Error('Missing userId in session metadata');
        }

        if (typeof session.subscription !== 'string') {
          throw new Error('Missing subscription ID in session');
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await db.update(users)
          .set({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id
          })
          .where(eq(users.id, userId));

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await db.update(users)
          .set({
            is_premium: false,
            stripe_subscription_id: null
          })
          .where(eq(users.stripe_customer_id, customerId));

        break;
      }
    }
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    throw error;
  }
}
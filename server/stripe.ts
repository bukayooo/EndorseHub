import Stripe from 'stripe';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import config from './config.js';

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}

// Ensure Stripe is properly configured
console.log('[Stripe] Initializing with configuration:', {
  apiVersion: '2023-10-16',
  environment: process.env.NODE_ENV,
  pricesConfigured: !!(process.env.STRIPE_TEST_PRICE_MONTHLY && process.env.STRIPE_TEST_PRICE_YEARLY)
});

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

// Initialize Stripe with proper typing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Log initialization status (without exposing sensitive data)
console.log('Stripe initialized successfully:', {
  apiVersion: '2023-10-16',
  secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
  monthlyPriceId: PRICES.MONTHLY ? '✓' : '✗',
  yearlyPriceId: PRICES.YEARLY ? '✓' : '✗',
  webhookConfigured: process.env.STRIPE_WEBHOOK_SECRET ? '✓' : '✗'
});

export async function createCheckoutSession(
  userId: number,
  userEmail: string,
  planType: 'monthly' | 'yearly'
): Promise<{ sessionId: string; url: string }> {
  try {
    const priceId = planType === 'yearly' ? PRICES.YEARLY : PRICES.MONTHLY;

    if (!priceId) {
      throw new Error(`Price ID not found for ${planType} subscription`);
    }

    // Get client URL from environment or use default for development
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Create a checkout session
    console.log('Creating Stripe checkout session with config:', {
      priceId,
      userEmail,
      userId,
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
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        planType,
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      currency: 'usd',
    });

    console.log('Checkout session created:', { 
      sessionId: session.id,
      url: session.url 
    });

    return { 
      sessionId: session.id, 
      url: session.url || '' 
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function handleWebhook(req: any, res: any) {
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

    console.log('Webhook event received:', event.type);

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
          console.log('User upgraded to premium:', userId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;
        
        await db.update(users)
          .set({ isPremium: false })
          .where(eq(users.stripeCustomerId, customer));
        console.log('User subscription cancelled:', customer);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
}

export default stripe;
export { createCheckoutSession, handleWebhook };
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

// Initialize Stripe with configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

// Validate the key format
if (!stripeSecretKey.startsWith('sk_test_')) {
  console.error('Invalid key format detected. Please use test mode keys in development.');
  throw new Error(
    'Development environment requires test mode Stripe keys.\n' +
    'Please use a key that starts with sk_test_ for development.\n' +
    'You can find your test mode keys at: https://dashboard.stripe.com/test/apikeys'
  );
}

console.log('✓ Stripe test mode configuration validated');
// Initialize Stripe with test mode configuration
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  telemetry: false,
  maxNetworkRetries: 2, // Add retries for better reliability in test mode
  timeout: 10000, // 10 second timeout
});

// Verify Stripe connection
stripe.paymentMethods.list({ limit: 1 })
  .then(() => console.log('✓ Stripe API connection verified'))
  .catch(error => {
    console.error('Failed to verify Stripe connection:', error.message);
    throw error;
  });

// Set up default test mode price IDs if not provided
const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID || 'price_test_monthly';
const STRIPE_YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID || 'price_test_yearly';

// Validate price IDs format
if (!STRIPE_MONTHLY_PRICE_ID.startsWith('price_') || !STRIPE_YEARLY_PRICE_ID.startsWith('price_')) {
  console.error('Invalid Stripe price IDs format:', {
    monthly: STRIPE_MONTHLY_PRICE_ID.substring(0, 10) + '...',
    yearly: STRIPE_YEARLY_PRICE_ID.substring(0, 10) + '...'
  });
  throw new Error(
    'Invalid Stripe price IDs configuration.\n' +
    'Price IDs must start with "price_".\n' +
    'For test mode, you can find your price IDs at: https://dashboard.stripe.com/test/products'
  );
}

const PRICES = {
  MONTHLY: STRIPE_MONTHLY_PRICE_ID,
  YEARLY: STRIPE_YEARLY_PRICE_ID
};

console.log('✓ Stripe test mode prices configured:', {
  monthly: PRICES.MONTHLY.substring(0, 10) + '...',
  yearly: PRICES.YEARLY.substring(0, 10) + '...'
});

interface CreateCheckoutSessionBody {
  priceType: 'monthly' | 'yearly';
}

export async function createCheckoutSession(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { priceType = 'monthly' } = req.body as CreateCheckoutSessionBody;
    const priceId = priceType === 'yearly' ? PRICES.YEARLY : PRICES.MONTHLY;

    // Validate price IDs
    if (!PRICES.MONTHLY || !PRICES.YEARLY) {
      console.error('Missing Stripe price IDs:', { monthly: PRICES.MONTHLY, yearly: PRICES.YEARLY });
      return res.status(500).json({ 
        error: 'Configuration error',
        details: 'Stripe price IDs not configured'
      });
    }

    if (!priceId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: `Invalid price type: ${priceType}`
      });
    }

    // Get client URL from environment or construct it based on request
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
    const clientUrl = process.env.CLIENT_URL || `${protocol}://${host}`;

    console.log('Creating checkout session with:', { 
      priceType, 
      priceId,
      userId: req.user.id,
      email: req.user.email,
      clientUrl
    });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
          adjustable_quantity: {
            enabled: false,
          },
        },
      ],
      mode: 'subscription',
      success_url: `${clientUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}?payment=cancelled`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id.toString(),
        priceType,
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      currency: 'usd',
      client_reference_id: req.user.id.toString(),
      subscription_data: {
        metadata: {
          userId: req.user.id.toString(),
        },
      },
    });

    // Validate session creation
    if (!session?.url) {
      console.error('Invalid session response:', session);
      return res.status(500).json({ 
        error: 'Checkout creation failed',
        details: 'Invalid session response from Stripe'
      });
    }

    // Log successful session creation
    console.log('Checkout session created:', {
      sessionId: session.id,
      customerId: session.customer,
      userId: req.user.id,
      priceId,
      priceType,
      url: session.url
    });

    res.json({ 
      sessionId: session.id, 
      url: session.url,
      priceType,
      amount: priceType === 'yearly' ? 960 : 130
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({
        error: 'Payment processing error',
        details: error.message,
        code: error.code
      });
    }

    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
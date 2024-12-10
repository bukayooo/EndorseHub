import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

// Validate and initialize Stripe configuration
const initializeStripeConfig = () => {
  // Use the provided test mode secret key
  const stripeSecretKey = 'sk_test_51O4YMRLtNDD5vVOTHgZSwd7UeVBdARATpIJq5OPlE4U6LmwfpMQ4HSQQUr6zIHMD8Ru1Ni7v6oDlwhRBQCNwVrrz00xzn72431';
  
  // Safe key format logging without exposing sensitive data
  const keyFormat = {
    exists: Boolean(stripeSecretKey),
    length: stripeSecretKey.length,
    prefix: stripeSecretKey.substring(0, 7),
    isTestKey: stripeSecretKey.startsWith('sk_test_')
  };

  // Development environment validation
  if (process.env.NODE_ENV !== 'production' && !keyFormat.isTestKey) {
    throw new Error(
      'Development environment requires test mode Stripe keys.\n' +
      'Please use a key that starts with sk_test_ for development.\n' +
      'You can find your test mode keys at: https://dashboard.stripe.com/test/apikeys'
    );
  }

  // Log configuration status
  console.log('Stripe Configuration:', {
    environment: process.env.NODE_ENV || 'development',
    keyExists: keyFormat.exists,
    keyLength: keyFormat.length,
    isTestMode: keyFormat.isTestKey
  });

  return stripeSecretKey;
};

// Initialize Stripe with validated configuration
const stripeSecretKey = initializeStripeConfig();

// Initialize Stripe client
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Latest stable version
  typescript: true,
  telemetry: false,
  maxNetworkRetries: 2,
  timeout: 10000,
});

// Verify Stripe configuration and connection
console.log('✓ Stripe client initialized successfully');

// Verify Stripe connection
stripe.paymentMethods.list({ limit: 1 })
  .then(() => console.log('✓ Stripe API connection verified'))
  .catch(error => {
    console.error('Failed to verify Stripe connection:', error.message);
    throw error;
  });

// Set up test mode price IDs
const TEST_PRICE_IDS = {
  MONTHLY: 'price_1QUNxqLtNDD5vVOT34f2UG2t',
  YEARLY: 'price_1QUNxqLtNDD5vVOTz7aStiUJ'
};

// Validate price IDs
Object.entries(TEST_PRICE_IDS).forEach(([type, priceId]) => {
  if (!priceId.startsWith('price_')) {
    throw new Error(
      `Invalid ${type} price ID format. Must start with "price_".\n` +
      'You can find your test mode price IDs at: https://dashboard.stripe.com/test/products'
    );
  }
});

// Log price configuration (safely)
console.log('Test Mode Price Configuration:', {
  monthly: TEST_PRICE_IDS.MONTHLY.slice(0, 8) + '...',
  yearly: TEST_PRICE_IDS.YEARLY.slice(0, 8) + '...',
  environment: process.env.NODE_ENV || 'development'
});

const PRICES = TEST_PRICE_IDS;

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
  
  // Enhanced webhook secret validation
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    return res.status(500).json({ 
      error: 'Webhook configuration error',
      details: 'Missing webhook secret'
    });
  }

  if (!sig) {
    console.error('Missing Stripe signature in webhook request');
    return res.status(400).json({ 
      error: 'Invalid webhook request',
      details: 'Missing Stripe signature'
    });
  }

  try {
    console.log('Processing webhook event...');
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Received webhook event:', {
      type: event.type,
      id: event.id,
      created: new Date(event.created * 1000).toISOString()
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '');
        
        if (!userId) {
          console.error('Missing userId in session metadata:', session.id);
          break;
        }

        console.log('Processing successful checkout:', {
          sessionId: session.id,
          userId,
          customerId: session.customer
        });
        
        await db.update(users)
          .set({ 
            isPremium: true,
            stripeCustomerId: session.customer as string 
          })
          .where(eq(users.id, userId));
        
        console.log('Successfully updated user premium status');
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = subscription.customer as string;
        
        if (!customer) {
          console.error('Missing customer ID in subscription:', subscription.id);
          break;
        }

        console.log('Processing subscription cancellation:', {
          subscriptionId: subscription.id,
          customerId: customer
        });
        
        await db.update(users)
          .set({ isPremium: false })
          .where(eq(users.stripeCustomerId, customer));
        
        console.log('Successfully updated user subscription status');
        break;
      }
      default: {
        console.log('Unhandled webhook event type:', event.type);
      }
    }

    res.json({ 
      received: true,
      type: event.type,
      id: event.id
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
    res.status(400).json({ 
      error: 'Webhook processing failed',
      details: errorMessage,
      type: error instanceof Stripe.errors.StripeError ? error.type : 'unknown'
    });
  }
}
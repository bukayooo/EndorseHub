import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users, type User } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Extend Express Request type
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Validate and initialize Stripe configuration
const initializeStripeConfig = () => {
  try {
    // Use the environment variable for the secret key
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return null;
    }
    
    // Safe key format logging without exposing sensitive data
    const keyFormat = {
      exists: Boolean(stripeSecretKey),
      length: stripeSecretKey.length,
      prefix: stripeSecretKey.substring(0, 7),
      isTestKey: stripeSecretKey.startsWith('sk_test_')
    };

    // Development environment validation
    if (process.env.NODE_ENV !== 'production' && !keyFormat.isTestKey) {
      console.error(
        'Development environment requires test mode Stripe keys.\n' +
        'Please use a key that starts with sk_test_ for development.\n' +
        'You can find your test mode keys at: https://dashboard.stripe.com/test/apikeys'
      );
      return null;
    }

    console.log('✓ Stripe Configuration:', {
      environment: process.env.NODE_ENV || 'development',
      keyExists: keyFormat.exists,
      keyLength: keyFormat.length,
      isTestMode: keyFormat.isTestKey
    });

    return stripeSecretKey;
  } catch (error) {
    console.error('Error initializing Stripe config:', error);
    return null;
  }
};

// Initialize Stripe with validated configuration
const stripeSecretKey = initializeStripeConfig();
if (!stripeSecretKey) {
  console.error('Failed to initialize Stripe with valid configuration');
}

// Initialize Stripe client with latest API version and test mode validation
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia', //Updated API version
      typescript: true,
      telemetry: false,
      maxNetworkRetries: 2,
      timeout: 10000,
    })
  : null;

// Set up test mode price IDs from environment variables
const TEST_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_TEST_PRICE_MONTHLY,
  YEARLY: process.env.STRIPE_TEST_PRICE_YEARLY
};

// Validate test mode configuration
const validateTestMode = () => {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    const secretKeyIsTest = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
    const publishableKeyIsTest = process.env.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');
    const monthlyPriceIsValid = process.env.STRIPE_TEST_PRICE_MONTHLY?.startsWith('price_');
    const yearlyPriceIsValid = process.env.STRIPE_TEST_PRICE_YEARLY?.startsWith('price_');
    
    if (!secretKeyIsTest || !publishableKeyIsTest) {
      throw new Error('Development environment requires test mode Stripe keys');
    }

    if (!monthlyPriceIsValid || !yearlyPriceIsValid) {
      throw new Error('Invalid or missing Stripe test price IDs');
    }

    console.log('✓ Test mode price IDs validated:', {
      monthly: monthlyPriceIsValid,
      yearly: yearlyPriceIsValid
    });
  }
};

try {
  validateTestMode();
  console.log('✓ Stripe test mode configuration validated');
} catch (error) {
  console.error('Stripe test mode validation failed:', error);
  throw error;
}

console.log('Stripe client initialized:', {
  isInitialized: Boolean(stripe),
  environment: process.env.NODE_ENV || 'development',
  usingTestMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
});

if (!TEST_PRICE_IDS.MONTHLY || !TEST_PRICE_IDS.YEARLY) {
  console.error('Missing Stripe price IDs:', { 
    monthly: TEST_PRICE_IDS.MONTHLY?.slice(0, 8) + '...',
    yearly: TEST_PRICE_IDS.YEARLY?.slice(0, 8) + '...'
  });
  throw new Error('Missing required Stripe price IDs');
}

// Log price configuration (safely)
console.log('Test Mode Price Configuration:', {
  monthly: TEST_PRICE_IDS.MONTHLY?.slice(0, 8) + '...',
  yearly: TEST_PRICE_IDS.YEARLY?.slice(0, 8) + '...',
  environment: process.env.NODE_ENV || 'development'
});

// Log Stripe initialization status
console.log('Stripe Configuration:', {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'test',
  keyPrefix: stripeSecretKey?.substring(0, 7) || 'not_set',
  isTestMode: stripeSecretKey?.startsWith('sk_test_') || false,
  hasPublishableKey: Boolean(process.env.VITE_STRIPE_PUBLISHABLE_KEY),
  hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
  hasTestPrices: Boolean(TEST_PRICE_IDS.MONTHLY && TEST_PRICE_IDS.YEARLY)
});

// Verify all required Stripe configuration is present
if (!process.env.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
  console.error('Invalid or missing test mode publishable key');
}
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('Invalid or missing test mode secret key');
}

// Verify Stripe configuration and connection
(async () => {
  try {
    if (!stripe) {
      console.error('Stripe client not initialized');
      return;
    }
    await stripe.paymentMethods.list({ limit: 1 });
    console.log('✓ Stripe API connection verified');
  } catch (error) {
    console.error('Failed to verify Stripe connection:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stripe initialization error:', error);
  }
})();

interface CreateCheckoutSessionBody {
  priceType: 'monthly' | 'yearly';
}

export async function createCheckoutSession(req: AuthenticatedRequest, res: Response) {
  console.log('Starting checkout session creation:', {
    userId: req.user?.id,
    userEmail: req.user?.email,
    body: req.body
  });

  if (!req.user?.id) {
    console.error('Unauthorized checkout attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!stripe) {
    console.error('Stripe not properly initialized');
    return res.status(503).json({ 
      error: 'Service unavailable',
      details: 'Payment service not configured'
    });
  }

  try {
    const { priceType = 'monthly' } = req.body as CreateCheckoutSessionBody;
    
    // Validate price type
    if (priceType !== 'monthly' && priceType !== 'yearly') {
      console.error('Invalid price type:', priceType);
      return res.status(400).json({
        error: 'Invalid price type',
        details: 'Price type must be either monthly or yearly'
      });
    }
    
    console.log('Starting checkout session creation:', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      priceType
    });
    
    const priceId = priceType === 'yearly' ? TEST_PRICE_IDS.YEARLY : TEST_PRICE_IDS.MONTHLY;
    
    // Validate selected price ID
    if (!priceId || !priceId.startsWith('price_')) {
      console.error('Invalid price ID:', {
        priceType,
        priceId: priceId?.slice(0, 8),
        monthly: TEST_PRICE_IDS.MONTHLY?.slice(0, 8),
        yearly: TEST_PRICE_IDS.YEARLY?.slice(0, 8)
      });
      return res.status(503).json({
        error: 'Service configuration error',
        details: 'Invalid price configuration'
      });
    }
    
    console.log('Using Stripe test price:', {
      type: priceType,
      id: priceId.slice(0, 8) + '...',
      isTestPrice: priceId.startsWith('price_'),
      environment: process.env.NODE_ENV || 'development'
    });

    // Validate price IDs
    if (!TEST_PRICE_IDS.MONTHLY || !TEST_PRICE_IDS.YEARLY) {
      console.error('Missing Stripe price IDs:', { 
        monthly: TEST_PRICE_IDS.MONTHLY?.slice(0, 8) + '...',
        yearly: TEST_PRICE_IDS.YEARLY?.slice(0, 8) + '...'
      });
      return res.status(503).json({ 
        error: 'Service unavailable',
        details: 'Payment service not fully configured'
      });
    }

    if (!priceId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: `Invalid price type: ${priceType}`
      });
    }

    // Construct the client URL using Replit environment variables
    const replSlug = process.env.REPL_SLUG;
    const replOwner = process.env.REPL_OWNER;
    const clientUrl = replSlug && replOwner 
      ? `https://${replSlug}.${replOwner}.repl.co`
      : 'http://localhost:5173';

    console.log('Creating checkout session with:', { 
      priceType, 
      priceId: priceId.slice(0, 8) + '...',
      userId: req.user.id,
      email: req.user.email,
      clientUrl,
      isReplit: Boolean(replSlug && replOwner)
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
      success_url: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/dashboard?payment=cancelled`,
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
      priceId: priceId.slice(0, 8) + '...',
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
    if (!stripe) {
      console.error('Stripe not properly initialized');
      return res.status(503).json({ 
        error: 'Service unavailable',
        details: 'Payment service not configured'
      });
    }

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
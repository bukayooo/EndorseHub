import { Router } from 'express';
import Stripe from 'stripe';
import { db, eq } from '../db';
import { users } from '../db/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Create a Stripe checkout session
router.post('/create-checkout-session', isAuthenticated, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Premium Subscription',
              description: 'Access to premium features',
            },
            unit_amount: 999, // $9.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard`,
    });

    res.json({ data: { sessionId: session.id } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Handle Stripe webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe webhook secret not configured' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer_email) {
          await db
            .update(users)
            .set({
              is_premium: true,
              stripe_customer_id: session.customer as string,
            })
            .where(eq(users.email, session.customer_email));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await db
          .update(users)
          .set({ is_premium: false })
          .where(eq(users.stripe_customer_id, subscription.customer as string));
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get subscription status
router.get('/subscription', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    if (!user.stripe_customer_id) {
      return res.json({ data: { active: false } });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
    });

    res.json({
      data: {
        active: subscriptions.data.length > 0,
        subscription: subscriptions.data[0] || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 
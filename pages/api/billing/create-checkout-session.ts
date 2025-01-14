import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use the latest API version
});

// Define your price IDs from Stripe Dashboard
const PRICE_IDS = {
  monthly: process.env.STRIPE_TEST_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_TEST_PRICE_YEARLY!,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the plan type from the request body
    const { planType } = req.body;

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    // Get the price ID based on the plan type
    const priceId = PRICE_IDS[planType as keyof typeof PRICE_IDS];

    if (!priceId) {
      return res.status(400).json({ message: 'Invalid price ID' });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        planType,
      },
    });

    // Return the session ID
    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
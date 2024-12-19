const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define your price IDs
const PRICE_IDS = {
  monthly: process.env.STRIPE_TEST_PRICE_MONTHLY,
  yearly: process.env.STRIPE_TEST_PRICE_YEARLY,
};

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planType } = req.body;

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    const priceId = PRICE_IDS[planType];
    if (!priceId) {
      return res.status(400).json({ message: 'Invalid price ID' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata: {
        planType,
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      message: 'Error creating checkout session',
      error: error.message 
    });
  }
});

module.exports = router; 
import React, { useState } from 'react';
import { loadStripe } from 'stripe';
import { createCheckoutSession } from '../api/billing/create-checkout-session';

const PricingDialog: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Starting checkout session creation for: ${planType}`);
      const session = await createCheckoutSession(planType);
      
      if (!session?.sessionId) {
        throw new Error('Invalid checkout session response');
      }

      const stripe = await loadStripe(process.env.STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Unable to start checkout. Please try again or contact support if the issue persists.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Render your pricing dialog components here */}
    </div>
  );
};

export default PricingDialog; 
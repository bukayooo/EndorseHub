import React, { useState } from 'react';
import { createCheckoutSession } from '../lib/stripe';

const PricingDialog: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Starting checkout for ${planType} plan`);
      await createCheckoutSession(planType);
      
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Unable to start checkout. Please try again or contact support if the issue persists.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pricing-dialog">
      <div className="pricing-options">
        <div className="pricing-option">
          <h3>Monthly Plan</h3>
          <p className="price">$130/month</p>
          <button 
            onClick={() => handleSubscribe('monthly')}
            disabled={isLoading}
            className="subscribe-button"
          >
            {isLoading ? 'Processing...' : 'Subscribe Monthly'}
          </button>
        </div>

        <div className="pricing-option">
          <h3>Yearly Plan</h3>
          <p className="price">$80/month</p>
          <p className="savings">Save 38%</p>
          <button 
            onClick={() => handleSubscribe('yearly')}
            disabled={isLoading}
            className="subscribe-button"
          >
            {isLoading ? 'Processing...' : 'Subscribe Yearly'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default PricingDialog;

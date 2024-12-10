import { loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<any> | null = null;

export const initializeStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Missing Stripe publishable key');
      throw new Error(
        'Stripe publishable key is not configured.\n' +
        'Please check your environment variables and ensure VITE_STRIPE_PUBLISHABLE_KEY is set.'
      );
    }

    // Validate test mode key
    const keyFormat = {
      exists: true,
      length: key.length,
      prefix: key.substring(0, 7),
      isTestKey: key.startsWith('pk_test_')
    };

    console.log('Stripe publishable key format:', keyFormat);

    if (!keyFormat.isTestKey) {
      console.error('Development environment requires test mode Stripe keys');
      throw new Error(
        'Please use a publishable key that starts with pk_test_ for development.\n' +
        'You can find your test mode keys at: https://dashboard.stripe.com/test/apikeys'
      );
    }

    try {
      console.log('✓ Stripe test mode publishable key validated successfully');
      stripePromise = loadStripe(key);
      if (!stripePromise) {
        throw new Error('Failed to initialize Stripe client');
      }
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw new Error(
        'Failed to initialize Stripe payment system. Please try again later or contact support.'
      );
    }
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceType: 'monthly' | 'yearly' = 'monthly') => {
  try {
    console.log('Starting checkout session creation for:', priceType);
    
    // Verify Stripe is initialized
    const stripe = await initializeStripe();
    if (!stripe) {
      throw new Error(
        'Payment system is not properly configured.\n' +
        'Please ensure all Stripe keys are set up correctly.'
      );
    }
    
    console.log('Creating checkout session for:', priceType);
    const response = await fetch("/api/billing/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({ priceType }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to create checkout session";
      try {
        const errorData = await response.json();
        errorMessage = errorData.details || errorData.error || errorMessage;
        
        // Enhanced error logging
        console.error('Checkout session error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Please log in to continue with the checkout process.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this feature.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later or contact support.');
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        throw new Error('An unexpected error occurred. Please try again later.');
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Checkout session created:', {
      sessionId: data.sessionId,
      priceType,
      amount: data.amount
    });

    const { url, sessionId } = data;
    if (!url) {
      console.error('Missing checkout URL in response:', data);
      throw new Error(
        "Failed to create checkout session.\n" +
        "Please try again or contact support if the issue persists."
      );
    }

    // Store checkout session data
    if (sessionId) {
      localStorage.setItem('checkoutSessionId', sessionId);
      localStorage.setItem('checkoutPriceType', priceType);
      localStorage.setItem('checkoutStartTime', new Date().toISOString());
    }

    console.log('Redirecting to Stripe checkout:', url);
    window.location.href = url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    // Re-throw error with user-friendly message
    throw new Error(
      error instanceof Error ? error.message : 
      'Failed to start checkout process. Please try again later.'
    );
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const response = await fetch("/api/billing/subscription-status");
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    throw error;
  }
};

export const cancelSubscription = async () => {
  try {
    const response = await fetch("/api/billing/cancel-subscription", {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Failed to cancel subscription");
    }
    return response.json();
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
};

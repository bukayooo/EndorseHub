import { loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<any> | null = null;

export const initializeStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!key) {
      console.error('Missing Stripe publishable key');
      return null;
    }

    // Log key format (safely)
    const keyPrefix = key.substring(0, 7);
    console.log('Stripe publishable key status:', {
      exists: true,
      length: key.length,
      prefix: keyPrefix,
      isTestKey: keyPrefix === 'pk_test',
      isLiveKey: keyPrefix === 'pk_live'
    });

    if (!key.startsWith('pk_test_')) {
      console.error(
        'Development environment requires test mode Stripe keys.\n' +
        'Please use a publishable key that starts with pk_test_ for development.\n' +
        'You can find your test mode keys at: https://dashboard.stripe.com/test/apikeys'
      );
      return null;
    }

    console.log('✓ Stripe test mode publishable key validated successfully');
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceType: 'monthly' | 'yearly' = 'monthly') => {
  try {
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
      const errorData = await response.json().catch(() => ({
        error: "Failed to create checkout session",
        details: "Unknown error occurred"
      }));
      console.error('Checkout session error:', errorData);
      throw new Error(errorData.details || errorData.error || "Failed to create checkout session");
    }

    const data = await response.json();
    console.log('Checkout session response:', data);

    const { url, sessionId } = data;
    if (!url) {
      console.error('Missing checkout URL in response:', data);
      throw new Error("No checkout URL received from server");
    }

    // Store the sessionId in localStorage for post-payment verification
    if (sessionId) {
      localStorage.setItem('checkoutSessionId', sessionId);
    }

    console.log('Redirecting to checkout URL:', url);
    window.location.href = url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
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

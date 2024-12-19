import { loadStripe } from "@stripe/stripe-js";
import { api } from './api';

let stripePromise: Promise<any> | null = null;

export const initializeStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Missing Stripe publishable key');
      return null;
    }
    console.log('Initializing Stripe with publishable key prefix:', key.substring(0, 8));
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceType: 'monthly' | 'yearly' = 'monthly') => {
  try {
    console.log('[Stripe] Creating checkout session for:', priceType);
    
    const response = await api.post('/billing/create-checkout-session', { priceType });
    console.log('[Stripe] Checkout session response:', response);

    if (!response?.url) {
      console.error('[Stripe] Missing checkout URL in response:', response);
      throw new Error(response?.error || "No checkout URL received");
    }

    console.log('[Stripe] Redirecting to checkout:', {
      sessionId: response.sessionId,
      url: response.url.substring(0, 100) + '...' // Log truncated URL for privacy
    });
    window.location.href = response.url;
  } catch (error) {
    console.error("[Stripe] Error creating checkout session:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : typeof error
    });
    throw error;
  }
};

export const getSubscriptionStatus = async () => {
  try {
    const response = await api.get('/billing/subscription-status');
    if (!response) {
      throw new Error("Failed to fetch subscription status");
    }
    return response;
  } catch (error) {
    console.error("[Stripe] Error fetching subscription status:", error);
    throw error;
  }
};

export const cancelSubscription = async () => {
  try {
    const response = await api.post('/billing/cancel-subscription');
    if (!response) {
      throw new Error("Failed to cancel subscription");
    }
    return response;
  } catch (error) {
    console.error("[Stripe] Error canceling subscription:", error);
    throw error;
  }
};

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

export const createCheckoutSession = async (planType: 'monthly' | 'yearly' = 'monthly') => {
  try {
    console.log('[Stripe] Creating checkout session for:', planType);
    
    const response = await api.post('/api/billing/create-checkout-session', { planType });
    const { sessionId } = response.data;
    console.log('[Stripe] Checkout session created:', { sessionId });

    if (!sessionId) {
      throw new Error('No session ID received from server');
    }

    const stripe = await initializeStripe();
    if (!stripe) {
      throw new Error('Failed to initialize Stripe');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) {
      throw error;
    }

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

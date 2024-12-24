import { loadStripe } from "@stripe/stripe-js";
import { type ApiResponse } from '@/types/api';

let stripePromise: Promise<any> | null = null;

interface CheckoutSession {
  url: string;
}

interface SubscriptionStatus {
  isActive: boolean;
  plan?: string;
  currentPeriodEnd?: string;
}

const STRIPE_KEY = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY;

export const initializeStripe = () => {
  if (!stripePromise) {
    if (!STRIPE_KEY) {
      console.error('Missing Stripe publishable key');
      return null;
    }
    console.log('Initializing Stripe with publishable key prefix:', STRIPE_KEY.substring(0, 8));
    stripePromise = loadStripe(STRIPE_KEY);
  }
  return stripePromise;
};

export async function createCheckoutSession(priceType: 'monthly' | 'yearly' = 'monthly') {
  try {
    console.log('[Stripe] Creating checkout session for:', priceType);
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceType }),
      credentials: 'include'
    });

    const data = await response.json() as ApiResponse<CheckoutSession>;
    console.log('[Stripe] Checkout session response:', data);

    if (!data.success || !data.data?.url) {
      throw new Error('Invalid checkout session response');
    }

    window.location.href = data.data.url;
  } catch (error) {
    console.error('[Stripe] Checkout session error:', error);
    throw error instanceof Error ? error : new Error('Failed to create checkout session');
  }
}

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  try {
    const response = await fetch('/api/billing/subscription-status', {
      credentials: 'include'
    });
    const data = await response.json() as ApiResponse<SubscriptionStatus>;

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch subscription status');
    }

    return data.data;
  } catch (error) {
    console.error("[Stripe] Error fetching subscription status:", error);
    throw error instanceof Error ? error : new Error('Failed to fetch subscription status');
  }
};

export const cancelSubscription = async (): Promise<{ success: boolean }> => {
  try {
    const response = await fetch('/api/billing/cancel-subscription', {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json() as ApiResponse<{ success: boolean }>;

    if (!data.success) {
      throw new Error(data.error || 'Failed to cancel subscription');
    }

    return data.data;
  } catch (error) {
    console.error("[Stripe] Error canceling subscription:", error);
    throw error instanceof Error ? error : new Error('Failed to cancel subscription');
  }
};
import { loadStripe } from "@stripe/stripe-js";
import { api, type ApiResponse } from './api';

let stripePromise: Promise<any> | null = null;

interface CheckoutSession {
  url: string;
}

interface SubscriptionStatus {
  isActive: boolean;
  plan?: string;
  currentPeriodEnd?: string;
}

export const initializeStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Missing Stripe publishable key');
      return null;
    }
    console.log('Initializing Stripe with publishable key prefix:', key.substring(0, 8));
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export async function createCheckoutSession(priceType: 'monthly' | 'yearly' = 'monthly') {
  try {
    console.log('[Stripe] Creating checkout session for:', priceType);
    const { data: response } = await api.post<ApiResponse<CheckoutSession>>('/billing/create-checkout-session', { priceType });
    console.log('[Stripe] Checkout session response:', response);
    
    if (!response.data?.url) {
      throw new Error('Invalid checkout session response');
    }
    
    window.location.href = response.data.url;
  } catch (error) {
    console.error('[Stripe] Checkout session error:', error);
    throw error;
  }
}

export const getSubscriptionStatus = async () => {
  try {
    const { data: response } = await api.get<ApiResponse<SubscriptionStatus>>('/billing/subscription-status');
    return response.data;
  } catch (error) {
    console.error("[Stripe] Error fetching subscription status:", error);
    throw error;
  }
};

export const cancelSubscription = async () => {
  try {
    const { data: response } = await api.post<ApiResponse<{ success: boolean }>>('/billing/cancel-subscription');
    return response.data;
  } catch (error) {
    console.error("[Stripe] Error canceling subscription:", error);
    throw error;
  }
};

import { loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<any> | null = null;

export const initializeStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Missing Stripe publishable key');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceType: 'monthly' | 'yearly' = 'monthly') => {
  try {
    const response = await fetch("/api/billing/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceType }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create checkout session");
    }

    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    } else {
      throw new Error("Invalid checkout session response");
    }
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

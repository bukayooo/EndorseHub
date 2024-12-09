import { loadStripe } from "@stripe/stripe-js";

let stripePromise: Promise<any> | null = null;

export const initializeStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY || "");
  }
  return stripePromise;
};

export const createSubscription = async (priceId: string) => {
  try {
    const response = await fetch("/api/billing/create-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId }),
    });

    if (!response.ok) {
      throw new Error("Failed to create subscription");
    }

    const { clientSecret } = await response.json();
    return clientSecret;
  } catch (error) {
    console.error("Error creating subscription:", error);
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

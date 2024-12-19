// Import any necessary dependencies
import { API_BASE_URL } from '../config'; // Adjust import path as needed

export async function createCheckoutSession(planType: string) {
  try {
    console.log(`Creating checkout session for: ${planType}`);
    // Make sure we're using the full URL
    const response = await fetch(`${API_BASE_URL}/api/billing/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies if using session auth
      body: JSON.stringify({
        planType, // 'monthly' or 'yearly'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }

    const session = await response.json();
    console.log('Checkout session response:', session);
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
} 
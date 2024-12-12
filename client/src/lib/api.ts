import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// API response types
interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
  timestamp: string;
}

interface ApiErrorResponse {
  status: 'error';
  error: string;
  message?: string;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Timeout after 10 seconds
  timeout: 10000,
  withCredentials: true,
  // Retry failed requests
  validateStatus: (status) => status < 500,
});

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => {
    // If the response has data.data (our wrapped API response), return just the data
    return response.data?.data || response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle authentication errors
      window.location.href = '/';
      return Promise.reject(new Error('Authentication required'));
    }

    // Extract error message from our API format or fallback to axios error
    const message = error.response?.data?.error 
      || error.response?.data?.message 
      || error.message 
      || 'An unexpected error occurred';

    return Promise.reject(new Error(message));
  }
);

// Add request interceptor for handling request cancellation
const controller = new AbortController();
api.interceptors.request.use((config) => {
  config.signal = controller.signal;
  return config;
});

// API endpoints
interface Widget {
  id: number;
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
  userId: number;
  createdAt: string;
}

export async function createWidget(widget: {
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}): Promise<Widget> {
  try {
    const response = await api.post<Widget>('/widgets', widget);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403 && error.response.data?.code === "PREMIUM_REQUIRED") {
      throw new Error("PREMIUM_REQUIRED");
    }
    throw error;
  }
}

interface CheckoutResponse {
  url: string;
}

export async function upgradeToPreview(priceType: 'monthly' | 'yearly' = 'monthly') {
  const response = await api.post<CheckoutResponse>('/billing/create-checkout-session', { priceType });
  const data = response.data;
  if (!data.url) {
    throw new Error("Invalid checkout session response");
  }
  window.location.href = data.url;
}

export async function importExternalReviews(source: string) {
  return api.post('/testimonials/import', { source });
}

export async function getAnalytics(widgetId: number) {
  return api.get(`/analytics/${widgetId}`);
}

export async function deleteWidget(widgetId: number) {
  return api.delete(`/widgets/${widgetId}`);
}

// Cleanup function to cancel pending requests
export function cancelPendingRequests() {
  controller.abort();
}

// Export the api instance for direct use
export { api };

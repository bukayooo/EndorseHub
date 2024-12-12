import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// Use absolute URL in development
const baseURL = process.env.NODE_ENV === 'development' 
  ? `http://${window.location.hostname}:3000/api`
  : '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 second timeout
  maxRedirects: 5,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  response => {
    const data = response.data;
    
    // Log all responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        data: data
      });
    }

    if (!data) {
      console.error('Empty response from:', response.config.url);
      throw new Error('Empty response');
    }

    // If wrapped response, handle accordingly
    if (typeof data === 'object' && 'success' in data) {
      if (data.success === true) {
        return data.data;
      }
      if (data.success === false) {
        throw new Error(data.error || 'API request failed');
      }
    }

    // For backwards compatibility, return raw response
    return data;
  },
  error => {
    // Log detailed error information
    console.error('API Error details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle authentication errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Only redirect if not already on auth page
      if (!currentPath.startsWith('/auth')) {
        window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
        return Promise.reject(new Error('Authentication required'));
      }
    }

    // Extract error message from response
    const message = error.response?.data?.error 
      || error.response?.data?.message 
      || error.message 
      || 'Unknown error';

    // Throw error with detailed message
    throw new Error(message);
  }
);

// API endpoints
export async function createWidget(widget: {
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}): Promise<any> {
  const { data } = await api.post('/widgets', widget);
  return data;
}

export async function upgradeToPreview(priceType: 'monthly' | 'yearly' = 'monthly') {
  const response = await api.post('/billing/create-checkout-session', { priceType });
  const url = response.data?.url;
  if (!url) throw new Error("Invalid checkout session response");
  window.location.href = url;
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

export { api };
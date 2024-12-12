import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// Always use relative path since we're using Vite's proxy
const baseURL = '/api';

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
        data: data
      });
    }

    if (!data) {
      console.error('Empty response from:', response.config.url);
      throw new Error('Empty response');
    }

    // If the response is already an error, throw it
    if (data.error) {
      console.error('API Error from:', response.config.url, data.error);
      throw new Error(data.error);
    }

    // Handle wrapped success responses
    if (data.success === true) {
      return data.data;
    }

    // Handle error responses
    if (data.success === false || data.error) {
      throw new Error(data.error || 'API request failed');
    }

    // For backwards compatibility, return raw response if not using new format
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

    if (error.response?.status === 401) {
      window.location.href = '/';
      return;
    }

    const message = error.response?.data?.error || error.message || 'Unknown error';
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
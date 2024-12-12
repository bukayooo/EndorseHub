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
  },
  withCredentials: true,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/';
      return Promise.reject(new Error('Authentication required'));
    }
    return Promise.reject(new Error(error.response?.data?.error || error.message));
  }
);

// API endpoints
export async function createWidget(widget: {
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}): Promise<any> {
  return api.post('/widgets', widget);
}

export async function upgradeToPreview(priceType: 'monthly' | 'yearly' = 'monthly') {
  const { url } = await api.post('/billing/create-checkout-session', { priceType });
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
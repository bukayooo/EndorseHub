import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import { type Testimonial, type Widget, type ApiResponse, type StatsData, type AnalyticsData } from "@/types/api";
import axios from 'axios';

// API response types
//export interface ApiResponse<T> {
//  success: boolean;
//  data: T;
//  error?: string;
//}

// Get the base URL based on the environment
const getBaseUrl = () => {
  if (window.location.hostname.includes('replit')) {
    // In production on Replit
    return window.location.origin;
  }
  // In development
  return 'http://0.0.0.0:3001';
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 10000,
  maxRedirects: 5
});

// Request interceptor for logging
api.interceptors.request.use(
  config => {
    // Ensure all requests go through /api
    if (!config.url?.startsWith('/api/')) {
      config.url = `/api${config.url}`;
    }

    console.log('[API] Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials
    });
    return config;
  },
  error => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  response => {
    console.log('[API] Response:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    // Check if response is HTML (indicating a routing issue)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      throw new Error('Invalid API response received');
    }

    if (!response.data) {
      throw new Error('No response data');
    }

    // Return the entire response, let the caller handle unwrapping
    return response;
  },
  error => {
    // Log error details for debugging
    console.error('[API] Error details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      console.error('[API] Authentication required');
      // Optionally redirect to login or handle auth error
    }

    if (error.response?.status === 403) {
      console.error('[API] Permission denied');
      // Handle forbidden error
    }

    // Throw a consistent error format
    throw error.response?.data?.error || error.message || 'An unexpected error occurred';
  }
);

// API endpoints
export async function getTestimonials() {
  const { data: response } = await api.get<ApiResponse<Testimonial[]>>('/testimonials');
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch testimonials');
  }
  return response.data;
}

export async function getStats() {
  const { data: response } = await api.get<ApiResponse<StatsData>>('/stats');
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch stats');
  }
  return response.data;
}

export async function getWidgets() {
  const { data: response } = await api.get<ApiResponse<Widget[]>>('/widgets');
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch widgets');
  }
  return response.data;
}

export async function createWidget(widget: {
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}): Promise<Widget> {
  const { data: response } = await api.post<ApiResponse<Widget>>('/widgets', widget);
  if (!response.success) {
    throw new Error(response.error || 'Failed to create widget');
  }
  return response.data;
}

export async function deleteWidget(widgetId: number): Promise<void> {
  const { data: response } = await api.delete<ApiResponse<void>>(`/widgets/${widgetId}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete widget');
  }
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
  const { data: response } = await api.get<ApiResponse<AnalyticsData>>(`/analytics/${widgetId}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch analytics');
  }
  return response.data;
}

export async function createTestimonial(data: {
  authorName: string;
  content: string;
  rating?: number;
}): Promise<Testimonial> {
  const { data: response } = await api.post<ApiResponse<Testimonial>>('/testimonials', data);
  if (!response.success) {
    throw new Error(response.error || 'Failed to create testimonial');
  }
  return response.data;
}

export async function deleteTestimonial(id: number): Promise<void> {
  const { data: response } = await api.delete<ApiResponse<void>>(`/testimonials/${id}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete testimonial');
  }
}

export async function searchTestimonials(query: string): Promise<Testimonial[]> {
  const { data: response } = await api.post<ApiResponse<Testimonial[]>>('/testimonials/search', { query });
  if (!response.success) {
    throw new Error(response.error || 'Failed to search testimonials');
  }
  return response.data;
}

export { api };
import type { Testimonial, Widget } from "@db/schema";
import type { ApiResponse, StatsData, AnalyticsData } from "@/types/api";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// Get the base URL based on the environment
const getBaseUrl = () => {
  if (window.location.hostname.includes('replit')) {
    // In production on Replit
    return window.location.origin;
  }
  // In development
  return 'http://localhost:3000';
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
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'An unexpected error occurred'
    );
  }
);

// API endpoints with better error handling
export async function getTestimonials() {
  try {
    const { data: response } = await api.get<ApiResponse<Testimonial[]>>('/testimonials');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch testimonials');
    }
    return response.data;
  } catch (error) {
    console.error('[API] Failed to fetch testimonials:', error);
    throw error;
  }
}

export async function getStats() {
  try {
    const { data: response } = await api.get<ApiResponse<StatsData>>('/stats');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch stats');
    }
    return response.data;
  } catch (error) {
    console.error('[API] Failed to fetch stats:', error);
    throw error;
  }
}

// Widget endpoints
export async function getWidget(widgetId: number) {
  try {
    console.log('[API] Fetching widget:', widgetId);
    const { data: response } = await api.get<ApiResponse<Widget>>(`/widgets/${widgetId}`);
    console.log('[API] Widget response:', response);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch widget');
    }
    
    return response.data;
  } catch (error) {
    console.error('[API] Failed to fetch widget:', error);
    throw error;
  }
}

export async function getWidgets() {
  try {
    console.log('[API] Fetching widgets');
    const { data: response } = await api.get<ApiResponse<Widget[]>>('/widgets');
    console.log('[API] Widgets response:', response);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch widgets');
    }
    
    return response.data;
  } catch (error) {
    console.error('[API] Failed to fetch widgets:', error);
    throw error;
  }
}

export async function createWidget(widget: {
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}): Promise<Widget> {
  try {
    console.log('[API] Creating widget:', widget);
    const { data: response } = await api.post<ApiResponse<Widget>>('/widgets', widget);
    console.log('[API] Create widget response:', response);
    
    if (!response.success) {
      if (response.error === 'Premium subscription required') {
        throw new Error('PREMIUM_REQUIRED');
      }
      throw new Error(response.error || 'Failed to create widget');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('[API] Failed to create widget:', error);
    // If the error is already formatted correctly, rethrow it
    if (error?.message === 'PREMIUM_REQUIRED') {
      throw error;
    }
    // Check for premium required in the response
    if (error?.response?.data?.code === 'PREMIUM_REQUIRED' || 
        error?.response?.data?.error === 'Premium subscription required') {
      throw new Error('PREMIUM_REQUIRED');
    }
    throw error;
  }
}

export async function deleteWidget(widgetId: number): Promise<void> {
  try {
    console.log('[API] Deleting widget:', widgetId);
    const { data: response } = await api.delete<ApiResponse<void>>(`/widgets/${widgetId}`);
    console.log('[API] Delete widget response:', response);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete widget');
    }
  } catch (error) {
    console.error('[API] Failed to delete widget:', error);
    throw error;
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
  try {
    const { data: response } = await api.get<ApiResponse<AnalyticsData>>(`/analytics/${widgetId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch analytics');
    }
    return response.data;
  } catch (error) {
    console.error('[API] Failed to fetch analytics:', error);
    throw error;
  }
}

export async function createTestimonial(data: {
  authorName: string;
  content: string;
  rating?: number;
}): Promise<Testimonial> {
  try {
    const { data: response } = await api.post<ApiResponse<Testimonial>>('/testimonials', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create testimonial');
    }
    return response.data;
  } catch (error) {
    console.error('[API] Failed to create testimonial:', error);
    throw error;
  }
}

export async function deleteTestimonial(id: number): Promise<void> {
  try {
    const { data: response } = await api.delete<ApiResponse<void>>(`/testimonials/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete testimonial');
    }
  } catch (error) {
    console.error('[API] Failed to delete testimonial:', error);
    throw error;
  }
}

export async function searchTestimonials(query: string): Promise<Testimonial[]> {
  try {
    const { data: response } = await api.post<ApiResponse<Testimonial[]>>('/testimonials/search', { query });
    if (!response.success) {
      throw new Error(response.error || 'Failed to search testimonials');
    }
    return response.data;
  } catch (error) {
    console.error('[API] Failed to search testimonials:', error);
    throw error;
  }
}

export { api };
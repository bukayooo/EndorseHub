import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// Get the base URL based on the environment
const getBaseUrl = () => {
  const isReplit = window.location.hostname.includes('replit');
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isReplit) {
    // In production on Replit
    const origin = window.location.origin;
    console.log('[API] Production base URL:', origin);
    return origin;
  }
  
  // In development
  const devUrl = 'http://localhost:3000';
  console.log('[API] Development base URL:', devUrl);
  return devUrl;
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

// Add request interceptor to prepend /api to all requests
api.interceptors.request.use(
  config => {
    // Prepend /api to the URL if it doesn't already have it and we're not already making a request to the full URL
    if (!config.url?.startsWith('/api') && !config.url?.startsWith('http')) {
      config.url = `/api${config.url}`;
    }

    // Log request details
    console.log('[API] Request:', {
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
      data: config.data,
      headers: {
        ...config.headers,
        Cookie: document.cookie // Include cookies in debug log
      },
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
    // Log response details
    console.log('[API] Response:', {
      url: response.config.url,
      fullUrl: `${response.config.baseURL}${response.config.url}`,
      method: response.config.method,
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    // If the response is already wrapped with success/data, return it as is
    if (response.data?.success !== undefined) {
      return response.data;
    }
    
    // Otherwise, wrap the response
    return {
      success: true,
      data: response.data
    };
  },
  error => {
    // Log detailed error information
    console.error('[API] Error details:', {
      url: error.config?.url,
      fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : undefined,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      headers: error.response?.headers,
      cookies: document.cookie // Include cookies in error log
    });

    // Handle HTML responses (indicates routing issue)
    if (error.response?.headers['content-type']?.includes('text/html')) {
      throw new Error('Invalid API response received');
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Only redirect if not already on auth page and not trying to get user info
      if (!currentPath.startsWith('/auth') && !error.config?.url?.includes('/api/user')) {
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

// API endpoints with better error handling
export async function getTestimonials() {
  try {
    console.log('[API] Fetching testimonials');
    const response = await api.get('/testimonials');
    if (!response.data?.success) {
      throw new Error('Failed to fetch testimonials');
    }
    return response.data;
  } catch (error: any) {
    console.error('[API] Failed to fetch testimonials:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch testimonials');
  }
}

export async function getStats() {
  try {
    console.log('[API] Fetching stats');
    const response = await api.get('/stats');
    if (!response.data?.success) {
      throw new Error('Failed to fetch stats');
    }
    return response.data;
  } catch (error: any) {
    console.error('[API] Failed to fetch stats:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch stats');
  }
}

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
  const response = await api.post('/api/billing/create-checkout-session', { priceType });
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

export async function createTestimonial(data: {
  authorName: string;
  content: string;
  rating?: number;
}) {
  return api.post('/testimonials', data);
}

export async function deleteTestimonial(id: number) {
  return api.delete(`/testimonials/${id}`);
}

export async function searchTestimonials(query: string) {
  return api.post('/testimonials/search', { query });
}

export { api };
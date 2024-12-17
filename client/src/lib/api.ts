import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// Get the base URL based on the environment
const getBaseUrl = () => {
  // Use same origin API URL for both dev and prod
  const baseURL = '/api';
    
  console.log('[API] Configuration:', {
    baseURL,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    origin: window.location.origin,
    env: process.env.NODE_ENV
  });
  
  return baseURL;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  withCredentials: true,
  timeout: 30000,
  maxRedirects: 5,
  validateStatus: status => status >= 200 && status < 500 // Only accept 2xx-4xx responses
});

// Request interceptor for logging
api.interceptors.request.use(
  config => {
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

    if (!response.data) {
      throw new Error('No response data');
    }
    
    // Handle wrapped responses
    if (response.data.success === false) {
      throw new Error(response.data.error || 'Request failed');
    }
    
    // Return unwrapped data if it's a success response
    if (response.data.success === true) {
      return response.data.data;
    }
    
    // Return raw data if it's not using the wrapper format
    return response.data;
  },
  error => {
    // Log detailed error information
    console.error('[API] Error details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      headers: error.response?.headers
    });

    // Handle HTML responses (indicates routing issue)
    if (error.response?.headers['content-type']?.includes('text/html')) {
      throw new Error('Invalid API response received');
    }

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

// API endpoints with better error handling
export async function getTestimonials() {
  try {
    console.log('[API] Initiating testimonials fetch');
    const response = await api.get('/testimonials');
    console.log('[API] Raw testimonials response:', response);

    // The response is already unwrapped by the axios interceptor
    // If it's an array, return it directly
    if (Array.isArray(response)) {
      return response;
    }

    // If it's wrapped in a data property, return that
    if (response?.data && Array.isArray(response.data)) {
      return response.data;
    }

    console.error('[API] Invalid testimonials response format:', response);
    return [];
  } catch (error: any) {
    // Handle authentication errors
    if (error?.response?.status === 401) {
      console.error('[API] Authentication required for testimonials');
      return [];
    }

    console.error('[API] Failed to fetch testimonials:', {
      message: error.message,
      status: error?.response?.status,
      data: error?.response?.data
    });
    return [];
  }
}

export async function getStats() {
  try {
    console.log('[API] Fetching stats');
    const response = await api.get('/stats');
    console.log('[API] Stats response:', response);
    return response;
  } catch (error) {
    console.error('[API] Failed to fetch stats:', error);
    throw error;
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
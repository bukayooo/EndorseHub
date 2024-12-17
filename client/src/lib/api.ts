import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";
import axios from 'axios';

// Create axios instance with consistent config across environments
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
  maxRedirects: 5,
  validateStatus: (status) => {
    return status >= 200 && status < 500; // Handle all responses, including 401s
  }
});

// Add request interceptor to ensure headers are set
api.interceptors.request.use(config => {
  // Ensure credentials are always included
  config.withCredentials = true;
  
  // Add cache control headers to prevent caching
  config.headers['Cache-Control'] = 'no-cache';
  config.headers['Pragma'] = 'no-cache';
  
  return config;
});

// Enhance error handling for authentication issues
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.error('[API] Authentication error:', error.response?.data);
      // Redirect to login page if not authenticated
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

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
    console.log('[API] Fetching testimonials');
    const response = await api.get('/testimonials', {
      withCredentials: true,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log('[API] Testimonials response:', response);
    return response;
  } catch (error) {
    console.error('[API] Failed to fetch testimonials:', error);
    throw error;
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
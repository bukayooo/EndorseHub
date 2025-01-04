import type { User, Testimonial, Widget, AnalyticsData, ApiResponse, StatsData } from '@/types/db';

const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? import.meta.env.VITE_API_URL : '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'An error occurred');
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<User> {
    const { data } = await request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data!;
  },

  async post<T>(endpoint: string, body: any): Promise<T> {
    const { data } = await request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data!;
  },

  async register(userData: {
    email: string;
    password: string;
    username: string;
  }): Promise<User> {
    const { data } = await request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data!;
  },

  async logout(): Promise<void> {
    await request('/auth/logout', {
      method: 'POST',
    });
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await request<User>('/auth/me');
      return data || null;
    } catch (error) {
      return null;
    }
  },

  // Testimonials
  async getTestimonials(): Promise<Testimonial[]> {
    const { data } = await request<Testimonial[]>('/testimonials');
    return data || [];
  },

  async createTestimonial(testimonialData: Omit<Testimonial, 'id' | 'user_id' | 'created_at'>): Promise<Testimonial> {
    const { data } = await request<Testimonial>('/testimonials', {
      method: 'POST',
      body: JSON.stringify(testimonialData),
    });
    return data!;
  },

  async updateTestimonial(
    id: number,
    testimonialData: Partial<Testimonial>
  ): Promise<Testimonial> {
    const { data } = await request<Testimonial>(`/testimonials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(testimonialData),
    });
    return data!;
  },

  async deleteTestimonial(id: number): Promise<void> {
    await request(`/testimonials/${id}`, {
      method: 'DELETE',
    });
  },

  async searchTestimonials(query: string): Promise<Testimonial[]> {
    const { data } = await request<Testimonial[]>('/testimonials/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return data || [];
  },

  // Widgets
  async getWidgets(): Promise<Widget[]> {
    const { data } = await request<Widget[]>('/widgets');
    return data || [];
  },

  async getWidget(id: number): Promise<Widget> {
    const { data } = await request<Widget>(`/widgets/${id}`);
    return data!;
  },

  async createWidget(widgetData: Omit<Widget, 'id' | 'user_id' | 'created_at'>): Promise<Widget> {
    const { data } = await request<Widget>('/widgets', {
      method: 'POST',
      body: JSON.stringify(widgetData),
    });
    return data!;
  },

  async deleteWidget(id: number): Promise<void> {
    await request(`/widgets/${id}`, {
      method: 'DELETE',
    });
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const { data } = await request<AnalyticsData>('/analytics');
    return data!;
  },

  async importTestimonials(source: string): Promise<Testimonial[]> {
    const { data } = await request<Testimonial[]>('/testimonials/import', {
      method: 'POST',
      body: JSON.stringify({ source }),
    });
    return data || [];
  },

  async getStats(): Promise<StatsData> {
    const { data } = await request<StatsData>('/stats');
    return data!;
  },
};
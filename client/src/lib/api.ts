import type { ApiResponse, Testimonial, Widget, StatsData, AnalyticsData } from "@/types/api";

export const api = {
  get: async <T>(url: string) => {
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API request failed");
    }

    return response.json() as Promise<T>;
  },

  post: async <T>(url: string, data?: any) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API request failed");
    }

    return response.json() as Promise<T>;
  },

  delete: async <T>(url: string) => {
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "API request failed");
    }

    return response.json() as Promise<T>;
  },
};

export async function getTestimonials(): Promise<Testimonial[]> {
  const { data: response } = await api.get<ApiResponse<Testimonial[]>>("/api/testimonials");
  return response;
}

export async function getStats(): Promise<StatsData> {
  const { data: response } = await api.get<ApiResponse<StatsData>>("/api/stats");
  return response;
}

export async function getWidget(widgetId: string): Promise<Widget> {
  const { data: response } = await api.get<ApiResponse<Widget>>(`/api/widgets/${widgetId}`);
  return response;
}

export async function getWidgets(): Promise<Widget[]> {
  const { data: response } = await api.get<ApiResponse<Widget[]>>("/api/widgets");
  return response;
}

export async function createWidget(widget: {
  name: string;
  template: string;
  customization: {
    theme: string;
    showRatings: boolean;
    brandColor: string;
  };
  testimonialIds: string[];
}): Promise<Widget> {
  const { data: response } = await api.post<ApiResponse<Widget>>("/api/widgets", widget);
  return response;
}

export async function deleteWidget(widgetId: string): Promise<void> {
  const { data: response } = await api.delete<ApiResponse<void>>(`/api/widgets/${widgetId}`);
  return response;
}

export async function getAnalytics(widgetId: string): Promise<AnalyticsData> {
  const { data: response } = await api.get<ApiResponse<AnalyticsData>>(`/api/analytics/${widgetId}`);
  return response;
}

export async function createTestimonial(data: {
  author_name: string;
  content: string;
  rating: number;
}): Promise<Testimonial> {
  const { data: response } = await api.post<ApiResponse<Testimonial>>("/api/testimonials", data);
  return response;
}

export async function searchTestimonials(query: string): Promise<Testimonial[]> {
  const { data: response } = await api.post<ApiResponse<Testimonial[]>>("/api/testimonials/search", { query });
  return response;
}
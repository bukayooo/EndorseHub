import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, InsertUser } from "@db/schema";

type RequestResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return { ok: false, message: data.message || data.error || 'Request failed' };
      } else {
        const text = await response.text();
        return { ok: false, message: text || 'Request failed' };
      }
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return { ok: true };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // For 401, return null without throwing
    if (response.status === 401) {
      sessionStorage.removeItem('user');
      return null;
    }

    // Attempt to parse response as JSON
    let data;
    try {
      // Get the response text first
      const text = await response.text();
      
      // Only try to parse if we have content
      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse response:', text);
          throw parseError;
        }
      } else {
        console.warn('Empty response received');
        return null;
      }
    } catch (error) {
      console.error('Error handling response:', error);
      return null;
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || response.statusText;
      throw new Error(errorMessage);
    }

    // Store valid user data in sessionStorage
    if (data) {
      sessionStorage.setItem('user', JSON.stringify(data));
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    
    // On error, try to recover from session storage
    const cachedUser = sessionStorage.getItem('user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch {
        sessionStorage.removeItem('user');
      }
    }
    return null;
  }
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    initialData: () => {
      const cachedUser = sessionStorage.getItem('user');
      return cachedUser ? JSON.parse(cachedUser) : null;
    }
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}

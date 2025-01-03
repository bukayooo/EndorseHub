import { 
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import type { User } from "@/types/db";

export interface NewUser {
  email: string;
  password: string;
  username?: string;
}

interface UseUserReturn {
  user: User | null | undefined;
  isLoading: boolean;
  error: Error | null;
  login: (data: NewUser) => Promise<RequestResult<User>>;
  logout: () => Promise<RequestResult<void>>;
  register: (data: NewUser) => Promise<RequestResult<User>>;
}

type RequestResult<T = any> = {
  ok: true;
  data?: T;
} | {
  ok: false;
  message: string;
};

async function handleRequest<T = any>(
  url: string,
  method: string,
  body?: NewUser
): Promise<RequestResult<T>> {
  try {
    console.log(`Making ${method} request to ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    // Get response text first
    const text = await response.text();
    
    // Try to parse as JSON if we have content
    let data;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse response as JSON:', text);
        return { 
          ok: false, 
          message: 'Invalid server response format' 
        };
      }
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || response.statusText || 'Request failed';
      console.error(`Request failed (${response.status}):`, errorMessage);
      return { ok: false, message: errorMessage };
    }

    return { ok: true, data: data?.data || data };
  } catch (e: any) {
    console.error('Request error:', e);
    return { 
      ok: false, 
      message: e.message || 'Network request failed' 
    };
  }
}

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    // For 401, return null without throwing
    if (response.status === 401) {
      sessionStorage.removeItem('user');
      return null;
    }

    const text = await response.text();
    if (!text.trim()) {
      console.warn('Empty response received from /api/auth/me');
      return null;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse user response:', text);
      throw new Error('Invalid server response');
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || response.statusText);
    }

    const userData = data?.data || data;
    if (userData) {
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
    
    return userData as User;
  } catch (error: any) {
    console.error('Error fetching user:', error);
    
    // On error, try to recover from session storage
    const cachedUser = sessionStorage.getItem('user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser) as User;
      } catch {
        sessionStorage.removeItem('user');
      }
    }
    return null;
  }
}

export function useUser(): UseUserReturn {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (userData: NewUser) => handleRequest<User>('/api/auth/login', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => handleRequest<void>('/api/auth/logout', 'POST'),
    onSuccess: () => {
      sessionStorage.removeItem('user');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: NewUser) => handleRequest<User>('/api/auth/register', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading,
    error: error as Error | null,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}

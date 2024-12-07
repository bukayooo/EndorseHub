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
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      return { ok: false, message };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<User | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }

    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false,
    retryOnMount: false
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      try {
        await queryClient.fetchQuery({ 
          queryKey: ['user'],
          queryFn: fetchUser
        });
      } catch (error) {
        console.error('Failed to fetch user after login:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      throw error;
    }
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      try {
        await queryClient.fetchQuery({ 
          queryKey: ['user'],
          queryFn: fetchUser
        });
      } catch (error) {
        console.error('Failed to fetch user after logout:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      throw error;
    }
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      try {
        await queryClient.fetchQuery({ 
          queryKey: ['user'],
          queryFn: fetchUser
        });
      } catch (error) {
        console.error('Failed to fetch user after registration:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Registration failed:', error);
      throw error;
    }
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

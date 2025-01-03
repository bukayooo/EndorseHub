declare module '@tanstack/react-query' {
  export interface QueryClient {
    defaultOptions?: {
      queries?: {
        staleTime?: number;
        retry?: number;
        refetchOnMount?: boolean;
        refetchOnWindowFocus?: boolean;
        refetchOnReconnect?: boolean;
        refetchInterval?: number;
      };
    };
    invalidateQueries(options: { queryKey: unknown[] }): Promise<void>;
  }

  export const QueryClient: {
    new(config?: any): QueryClient;
  };

  export const QueryClientProvider: React.FC<{
    client: QueryClient;
    children: React.ReactNode;
  }>;

  export interface UseQueryOptions<T> {
    queryKey: unknown[];
    queryFn: () => Promise<T>;
    enabled?: boolean;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    refetchInterval?: number;
  }

  export interface UseMutationOptions<TData, TError, TVariables> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData) => void;
    onError?: (error: TError) => void;
  }

  export interface UseQueryResult<T> {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
  }

  export interface UseMutationResult<TData, TError, TVariables> {
    mutate: (variables: TVariables) => void;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    isLoading: boolean;
    isPending: boolean;
    error: TError | null;
  }

  export function useQuery<T>(options: UseQueryOptions<T>): UseQueryResult<T>;
  export function useMutation<TData, TError = Error, TVariables = void>(
    options: UseMutationOptions<TData, TError, TVariables>
  ): UseMutationResult<TData, TError, TVariables>;
  export function useQueryClient(): QueryClient;
} 
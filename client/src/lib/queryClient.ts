
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
          }
          throw new Error(await res.text());
        }

        return res.json();
      },
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
      staleTime: 5000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    }
  },
});

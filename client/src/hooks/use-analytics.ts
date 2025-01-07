import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsData } from "@/types/api";

export function useAnalytics(widgetId?: string) {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics", widgetId],
    queryFn: () => getAnalytics(widgetId!),
    enabled: !!widgetId,
  });
} 
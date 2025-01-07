import { useQuery } from "@tanstack/react-query";
import { getWidget } from "@/lib/api";
import type { Widget } from "@/types/api";

export function useWidget(widgetId?: string) {
  const { data: widget, isLoading, error } = useQuery<Widget>({
    queryKey: ["widget", widgetId],
    queryFn: () => getWidget(widgetId!),
    enabled: !!widgetId,
  });

  return { widget, isLoading, error };
} 
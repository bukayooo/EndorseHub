import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import EmbedCode from "@/components/widgets/EmbedCode";
import type { Widget } from "@/types/db";

export default function WidgetEmbed() {
  const { id } = useParams<{ id: string }>();
  const widgetId = parseInt(id);

  const { data: widget, isLoading } = useQuery<Widget>({
    queryKey: ['widget', widgetId],
    queryFn: () => api.get(`/widgets/${widgetId}`).then(res => res.data),
    enabled: !isNaN(widgetId),
  });

  if (isNaN(widgetId)) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Invalid widget ID</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </Card>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Widget not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Embed {widget.name}</h1>
      <EmbedCode widgetId={widgetId} />
    </div>
  );
} 
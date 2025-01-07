import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWidget } from "@/hooks/use-widget";

export default function WidgetPage() {
  const { id } = useParams<{ id: string }>();
  const { widget, isLoading, error } = useWidget(id);

  useEffect(() => {
    // Track widget view
    if (widget) {
      // TODO: Implement view tracking
    }
  }, [widget]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !widget) {
    return <div>Error loading widget</div>;
  }

  return (
    <div>
      {/* TODO: Implement widget display */}
      <h1>{widget.name}</h1>
    </div>
  );
} 
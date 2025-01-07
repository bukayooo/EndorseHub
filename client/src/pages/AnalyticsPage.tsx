import { useParams } from "react-router-dom";
import { useAnalytics } from "@/hooks/use-analytics";

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: analytics, isLoading, error } = useAnalytics(id);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !analytics) {
    return <div>Error loading analytics</div>;
  }

  return (
    <div>
      {/* TODO: Implement analytics display */}
      <h1>Analytics</h1>
      <div>
        <p>Views: {analytics.views}</p>
        <p>Clicks: {analytics.clicks}</p>
        <p>Conversions: {analytics.conversions}</p>
      </div>
    </div>
  );
} 
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { StatsData } from "@/types/api";

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: () => api.get("/analytics/stats").then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: "Total Testimonials",
      value: stats.testimonialCount,
    },
    {
      title: "Active Widgets",
      value: stats.widgetCount,
    },
    {
      title: "Total Views",
      value: stats.viewCount,
    },
    {
      title: "Conversion Rate",
      value: stats.conversionRate,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 
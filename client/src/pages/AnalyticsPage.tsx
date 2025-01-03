import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart } from "@tremor/react";
import type { AnalyticsData } from "@/types/api";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => api.get('/api/analytics').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={data.views}
              index="date"
              yAxisWidth={40}
              categories={["count"]}
              colors={["blue"]}
              valueFormatter={(value: number) => value.toLocaleString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clicks Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={data.clicks}
              index="date"
              yAxisWidth={40}
              categories={["count"]}
              colors={["green"]}
              valueFormatter={(value: number) => value.toLocaleString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={data.conversions}
              index="date"
              yAxisWidth={40}
              categories={["count"]}
              colors={["purple"]}
              valueFormatter={(value: number) => value.toLocaleString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={[
                { metric: "Views", value: data.views.reduce((sum, d) => sum + d.count, 0) },
                { metric: "Clicks", value: data.clicks.reduce((sum, d) => sum + d.count, 0) },
                { metric: "Conversions", value: data.conversions.reduce((sum, d) => sum + d.count, 0) },
              ]}
              index="metric"
              categories={["value"]}
              colors={["indigo"]}
              valueFormatter={(value: number) => value.toLocaleString()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
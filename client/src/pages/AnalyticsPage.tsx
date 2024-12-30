import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, LineChart } from '@/components/ui/chart';

interface AnalyticsData {
  views: { date: string; count: number }[];
  clicks: { date: string; count: number }[];
  conversions: { date: string; count: number }[];
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', id],
    queryFn: () => api.get(`/widgets/${id}/analytics`).then(res => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load analytics'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {data && (
            <LineChart
              data={data.views}
              categories={['count']}
              index="date"
              colors={['blue']}
              valueFormatter={(value: number) => `${value} views`}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {data && (
            <BarChart
              data={[
                {
                  name: 'Clicks',
                  value: data.clicks.reduce((sum, item) => sum + item.count, 0),
                },
                {
                  name: 'Conversions',
                  value: data.conversions.reduce((sum, item) => sum + item.count, 0),
                },
              ]}
              index="name"
              categories={['value']}
              colors={['blue']}
              valueFormatter={(value: number) => value.toString()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
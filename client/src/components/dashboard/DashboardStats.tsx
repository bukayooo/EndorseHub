import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  testimonials: number;
  widgets: number;
  views: number;
  clicks: number;
}

interface DashboardStatsProps {
  stats?: Stats;
  isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      title: 'Total Testimonials',
      value: stats?.testimonials ?? 0,
    },
    {
      title: 'Total Widgets',
      value: stats?.widgets ?? 0,
    },
    {
      title: 'Total Views',
      value: stats?.views ?? 0,
    },
    {
      title: 'Total Clicks',
      value: stats?.clicks ?? 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 
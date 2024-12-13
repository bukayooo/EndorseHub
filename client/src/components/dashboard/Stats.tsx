import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Eye, TrendingUp, Star } from "lucide-react";

interface StatsData {
  testimonialCount: number;
  widgetCount: number;
  viewCount: number;
  clickCount: number;
  conversionRate: string;
}

interface StatsProps {
  stats?: {
    success: boolean;
    data: StatsData;
  };
}

export default function Stats({ stats }: StatsProps) {
  const data = stats?.data ?? {
    testimonialCount: 0,
    widgetCount: 0,
    viewCount: 0,
    clickCount: 0,
    conversionRate: '0%'
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Testimonials</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.testimonialCount}</div>
          <p className="text-xs text-muted-foreground">
            Active customer reviews
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Widgets</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.widgetCount}</div>
          <p className="text-xs text-muted-foreground">
            Deployed testimonial widgets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.viewCount}</div>
          <p className="text-xs text-muted-foreground">
            Widget impressions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.conversionRate}</div>
          <p className="text-xs text-muted-foreground">
            Average engagement
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

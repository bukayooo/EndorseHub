import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalyticsData, Widget } from '@/types/db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function AnalyticsDashboard() {
  const { data: widgets } = useQuery<Widget[]>({
    queryKey: ['widgets'],
    queryFn: () => api.getWidgets()
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => api.getAnalytics(),
    enabled: !!widgets?.length
  });

  if (!widgets?.length) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No Widgets Found</h3>
        <p className="mt-2 text-sm text-gray-500">Create a widget to start tracking analytics.</p>
      </div>
    );
  }

  if (!analytics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500">Total Views</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{analytics.views.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500">Total Clicks</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{analytics.clicks.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-sm font-medium text-gray-500">Click-Through Rate</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {(analytics.clickThroughRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Views & Clicks Over Time</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[...analytics.recentViews].reverse()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="created_at"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [value.toLocaleString(), 'Count']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                name="Views"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#10b981"
                name="Clicks"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Views</h3>
          <div className="space-y-4">
            {analytics.recentViews.map((view) => (
              <div key={view.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {widgets.find((w) => w.id === view.widget_id)?.name || 'Unknown Widget'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(view.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {view.views} views
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Clicks</h3>
          <div className="space-y-4">
            {analytics.recentClicks.map((click) => (
              <div key={click.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {widgets.find((w) => w.id === click.widget_id)?.name || 'Unknown Widget'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(click.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {click.clicks} clicks
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 
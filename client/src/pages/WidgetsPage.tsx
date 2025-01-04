import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/use-user';
import type { Widget } from '@/types/db';

export default function WidgetsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isUserLoading && !user) {
      navigate('/login');
    }
  }, [user, isUserLoading, navigate]);

  const { data: widgets, isLoading: isWidgetsLoading } = useQuery<Widget[]>({
    queryKey: ['widgets'],
    queryFn: () => api.getWidgets(),
    enabled: !!user,
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: (widgetId: number) => api.deleteWidget(widgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    },
  });

  if (isUserLoading || !user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Widgets</h1>
        <button
          onClick={() => navigate('/widgets/new')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Widget
        </button>
      </div>

      {isWidgetsLoading ? (
        <div>Loading widgets...</div>
      ) : widgets && widgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{widget.name}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Created on {new Date(widget.created_at).toLocaleDateString()}
                </p>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => navigate(`/widgets/${widget.id}/edit`)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this widget?')) {
                        deleteWidgetMutation.mutate(widget.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No Widgets Yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first widget to start showcasing your testimonials.
          </p>
        </div>
      )}
    </div>
  );
}

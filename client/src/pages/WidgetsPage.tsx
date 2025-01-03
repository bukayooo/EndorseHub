import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";
import EmbedCode from "@/components/widgets/EmbedCode";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import type { Widget } from "@db/schema";
import { useUser } from "@/hooks/use-user";

export default function WidgetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useUser();

  const { data: widgets, isLoading: isWidgetsLoading } = useQuery({
    queryKey: ['widgets'],
    queryFn: async () => {
      const { data } = await api.get('/api/widgets');
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch widgets');
      }
      return data.data as Widget[];
    },
    enabled: !!user // Only run query when user is authenticated
  });

  const deleteMutation = useMutation({
    mutationFn: (widgetId: number) => api.delete(`/widgets/${widgetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    },
    onError: (error: Error) => {
      console.error('Failed to delete widget:', error.message);
      toast({
        title: "Error",
        description: "Failed to delete widget",
        variant: "destructive"
      });
    }
  });

  const handleDeleteWidget = (id: number) => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      deleteMutation.mutate(id);
    }
  };

  // Redirect to login if user is not authenticated
  if (!isUserLoading && !user) {
    window.location.href = "/login";
    return null;
  }

  // Show loading state while checking authentication
  if (isUserLoading || isWidgetsLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Widgets</h1>
          <Button asChild>
            <Link href="/widgets/new">Create Widget</Link>
          </Button>
        </div>

        {widgets?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No widgets created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {widgets?.map((widget) => (
              <Card key={widget.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{widget.name}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWidget(widget.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <EmbedCode widgetId={widget.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

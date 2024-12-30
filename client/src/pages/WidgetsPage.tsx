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

export default function WidgetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: widgets } = useQuery({
    queryKey: ['widgets'],
    queryFn: async () => {
      const { data } = await api.get('/api/widgets');
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch widgets');
      }
      return data.data as Widget[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/widgets/${id}`);
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete widget');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      toast({
        title: "Success",
        description: "Widget deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete widget",
        variant: "destructive",
      });
    },
  });

  const handleDeleteWidget = (id: number) => {
    if (window.confirm('Are you sure you want to delete this widget?')) {
      deleteMutation.mutate(id);
    }
  };

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

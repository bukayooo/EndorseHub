import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWidgets, deleteWidget } from "@/lib/api";
import { Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import EmbedCode from "@/components/widgets/EmbedCode";
import Sidebar from "@/components/dashboard/Sidebar";
import { useUser } from "@/hooks/use-user";
import type { Widget } from "@db/schema";

export default function WidgetsPage() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  const { data: widgets = [], isLoading } = useQuery<Widget[], Error>({
    queryKey: ["widgets", user?.id],
    queryFn: getWidgets,
    enabled: !!user?.id,
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: deleteWidget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets"] });
    },
  });

  const handleDeleteWidget = (widgetId: number) => {
    if (window.confirm("Are you sure you want to delete this widget?")) {
      deleteWidgetMutation.mutate(widgetId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">My Widgets</h1>
            <Link href="/widgets/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Widget
              </Button>
            </Link>
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
      </main>
    </div>
  );
}

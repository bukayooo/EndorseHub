import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWidgets, deleteWidget } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Widget } from "@/types/api";

export default function WidgetsPage() {
  const queryClient = useQueryClient();

  const { data: widgets, isLoading } = useQuery<Widget[]>({
    queryKey: ["widgets"],
    queryFn: getWidgets,
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: deleteWidget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets"] });
    },
  });

  const handleDelete = (widgetId: string) => {
    if (window.confirm("Are you sure you want to delete this widget?")) {
      deleteWidgetMutation.mutate(widgetId);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Widgets</h1>
        <Link href="/widgets/new">
          <Button>Create Widget</Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {!widgets?.length ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              You haven't created any widgets yet. Click "Create Widget" to get started.
            </p>
          </div>
        ) : (
          widgets.map((widget) => (
            <div
              key={widget.id}
              className="border rounded-lg p-6 flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">{widget.name}</h2>
                <p className="text-gray-500">Created: {new Date(widget.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-4">
                <Link href={`/widgets/${widget.id}`}>
                  <Button variant="outline">Edit</Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(widget.id)}
                  disabled={deleteWidgetMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

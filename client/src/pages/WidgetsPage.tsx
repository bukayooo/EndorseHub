import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import EmbedCode from "@/components/widgets/EmbedCode";

export default function WidgetsPage() {
  const { data: widgets, isLoading } = useQuery({
    queryKey: ["widgets"],
    queryFn: async () => {
      const response = await fetch("/api/widgets");
      if (!response.ok) {
        throw new Error("Failed to fetch widgets");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
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
            <p className="text-muted-foreground mb-4">No widgets created yet</p>
            <Link href="/widgets/new">
              <Button>Create Your First Widget</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {widgets?.map((widget: any) => (
            <Card key={widget.id}>
              <CardHeader>
                <h2 className="text-xl font-semibold">{widget.name}</h2>
              </CardHeader>
              <CardContent>
                <EmbedCode widgetId={widget.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

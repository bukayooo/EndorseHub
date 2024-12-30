import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WidgetPreview } from '@/components/testimonials/WidgetPreview';

export default function WidgetPage() {
  const { id } = useParams<{ id: string }>();

  const { data: widget, isLoading, error } = useQuery({
    queryKey: ['widget', id],
    queryFn: () => api.get(`/widgets/${id}`).then(res => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load widget'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        <WidgetPreview
          template={widget.template}
          customization={widget.customization}
          testimonialIds={widget.testimonial_ids || []}
        />
      </Card>
    </div>
  );
} 
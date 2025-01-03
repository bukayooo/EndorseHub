import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import TestimonialCard from "./TestimonialCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ErrorBoundary from "./ErrorBoundary";
import { useUser } from "@/hooks/use-user";
import { api, type ApiResponse } from "@/lib/api";

export type WidgetTheme = 'default' | 'light' | 'dark' | 'brand';

export interface WidgetCustomization {
  theme: WidgetTheme;
  showRatings: boolean;
  brandColor?: string;
}

interface Widget {
  id: number;
  template: string;
  customization: WidgetCustomization;
  testimonial_ids?: number[];
}

interface WidgetPreviewProps {
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}

export function EmbedPreview({ widgetId }: { widgetId: number }) {
  const { data: widget, isLoading, isError, error } = useQuery<Widget>({
    queryKey: ['widget', widgetId],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Widget>>(`/api/widgets/${widgetId}`);
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch widget');
        }
        return data.data;
      } catch (error) {
        console.error('Widget fetch error:', error);
        throw error;
      }
    },
    retry: false,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  console.log('Widget query state:', { isLoading, isError, error, widget });

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">Loading widget preview...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-4">
        <div className="text-red-500">
          <p className="font-semibold">Error loading widget</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </Card>
    );
  }

  if (!widget) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">Widget not found</p>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <WidgetPreview
        template={widget.template}
        customization={widget.customization}
        testimonialIds={widget.testimonial_ids}
      />
    </ErrorBoundary>
  );
}

export function WidgetPreview({ template, customization, testimonialIds }: WidgetPreviewProps) {
  const { user } = useUser();
  const { data: allTestimonials = [], isError, error, isLoading } = useQuery<Testimonial[]>({
    queryKey: ["testimonials", user?.id],
    queryFn: async () => {
      console.log('Fetching testimonials for user:', user?.id);
      try {
        const response = await api.get<{ success: boolean; data: Testimonial[] }>('/api/testimonials');
        if (!response?.data?.success) {
          throw new Error('Failed to fetch testimonials');
        }
        return response.data.data || [];
      } catch (err) {
        console.error('Testimonials fetch error:', err);
        throw new Error(err instanceof Error ? err.message : 'Failed to fetch testimonials');
      }
    },
    enabled: !!user?.id,
    retry: false,
    staleTime: 1000 * 60, // 1 minute,
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">Loading testimonials...</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-4">
        <div className="text-red-500">
          <p className="font-semibold">Error loading testimonials</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </Card>
    );
  }

  // Only show selected testimonials if testimonialIds is provided and not empty
  const testimonials = Array.isArray(testimonialIds) && testimonialIds.length > 0
    ? allTestimonials.filter((testimonial: { id: number }) => testimonialIds.includes(testimonial.id))
    : [];  // Return empty array if no testimonials are selected
  
  console.log('Filtering testimonials:', {
    allTestimonials: allTestimonials.length,
    selectedIds: testimonialIds,
    filtered: testimonials.length
  });

  if (!Array.isArray(testimonials) || testimonials.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">No testimonials available</p>
      </Card>
    );
  }

  return (
    <Card 
      className={`overflow-hidden transition-colors duration-200 ${
        customization.theme === 'dark' ? 'bg-gray-900 text-white border-gray-800' :
        customization.theme === 'light' ? 'bg-gray-50 text-gray-900 border-gray-200' :
        customization.theme === 'brand' ? 'bg-primary text-primary-foreground border-primary/20' :
        'bg-background text-foreground border-border'
      }`}
      style={
        customization.theme === 'brand' && customization.brandColor
          ? {
              ['--primary']: customization.brandColor,
              ['--primary-foreground']: '#ffffff',
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
            } as React.CSSProperties
          : undefined
      }
    >
      {template === 'carousel' ? (
        <Carousel className="w-full">
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index}>
                <div className="p-4">
                  <TestimonialCard
                    author={testimonial.author_name}
                    content={testimonial.content}
                    rating={testimonial.rating ?? 5}
                    showRatings={customization.showRatings}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      ) : template === 'list' ? (
        <div className="space-y-4 p-4">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              author={testimonial.author_name}
              content={testimonial.content}
              rating={testimonial.rating ?? 5}
              showRatings={customization.showRatings}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              author={testimonial.author_name}
              content={testimonial.content}
              rating={testimonial.rating ?? 5}
              showRatings={customization.showRatings}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

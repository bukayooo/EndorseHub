import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import TestimonialCard from "./TestimonialCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ErrorBoundary from "./ErrorBoundary";
import { useUser } from "@/hooks/use-user";

export type WidgetTheme = 'default' | 'light' | 'dark' | 'brand';

export interface WidgetCustomization {
  theme: WidgetTheme;
  showRatings: boolean;
  showImages: boolean;
  brandColor?: string;
}

interface Widget {
  id: number;
  template: string;
  customization: WidgetCustomization;
}

interface WidgetPreviewProps {
  template: string;
  customization: WidgetCustomization;
}

export function EmbedPreview({ widgetId }: { widgetId: number }) {
  const { data: widget, isError, error, isLoading } = useQuery<Widget>({
    queryKey: ["widget", widgetId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/widgets/${widgetId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please log in to view this widget');
          }
          if (response.status === 403) {
            throw new Error('You do not have permission to view this widget');
          }
          throw new Error('Failed to fetch widget');
        }
        
        return response.json();
      } catch (err) {
        console.error('Widget fetch error:', err);
        throw err;
      }
    },
  });

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
      />
    </ErrorBoundary>
  );
}

export default function WidgetPreview({ template, customization }: WidgetPreviewProps) {
  const { user } = useUser();
  const { data: testimonials = [], isError, error, isLoading } = useQuery({
    queryKey: ["testimonials", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/testimonials", {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch testimonials");
      }
      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
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
                    author={testimonial.authorName}
                    content={testimonial.content}
                    rating={testimonial.rating ?? 5}
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
              author={testimonial.authorName}
              content={testimonial.content}
              rating={testimonial.rating ?? 5}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              author={testimonial.authorName}
              content={testimonial.content}
              rating={testimonial.rating ?? 5}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

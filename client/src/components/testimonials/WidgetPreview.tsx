import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import TestimonialCard from "./TestimonialCard";
import type { Testimonial } from "@db/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ErrorBoundary from "./ErrorBoundary";
import { useUser } from "@/hooks/use-user";

interface WidgetPreviewProps {
  template: string;
  customization: {
    theme: string;
    showRatings: boolean;
    showImages: boolean;
  };
}

// Testimonials will be fetched from the API

export default function WidgetPreview({ template, customization }: WidgetPreviewProps) {
  return (
    <ErrorBoundary>
      <WidgetPreviewContent template={template} customization={customization} />
    </ErrorBoundary>
  );
}

function WidgetPreviewContent({ template, customization }: WidgetPreviewProps) {
  const { user } = useUser();
  const { data: testimonials = [], isError, error, isLoading } = useQuery({
    queryKey: ["testimonials", user?.id],
    queryFn: async () => {
      try {
        const response = await fetch("/api/testimonials", {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 401) {
            throw new Error('Please log in to view testimonials');
          }
          if (response.status === 403) {
            throw new Error('You do not have permission to view these testimonials');
          }
          throw new Error(errorData.error || 'Failed to fetch testimonials');
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }
        
        return data as Testimonial[];
      } catch (error) {
        console.error('Error details:', error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && 
          (error.message.includes('log in') || error.message.includes('permission'))) {
        return false;
      }
      return failureCount < 3;
    },
    enabled: !!user?.id,
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
            {error instanceof Error 
              ? error.message 
              : 'An unexpected error occurred. Please try again later.'}
          </p>
        </div>
      </Card>
    );
  }

  if (!Array.isArray(testimonials) || testimonials.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">No testimonials available.</p>
      </Card>
    );
  }

  const getSpacing = () => {
    return "gap-4 p-4";
  };

  const renderTestimonialCard = (testimonial: Testimonial) => (
    <TestimonialCard
      author={testimonial.authorName}
      content={testimonial.content}
      rating={testimonial.rating ?? 5}
    />
  );

  const renderGrid = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${getSpacing()}`}>
      {testimonials.map((testimonial: Testimonial, index: number) => (
        <div key={index} className="transition-all duration-200">
          {renderTestimonialCard(testimonial)}
        </div>
      ))}
    </div>
  );

  const renderCarousel = () => (
    <Carousel className="w-full">
      <CarouselContent>
        {testimonials.map((testimonial: Testimonial, index: number) => (
          <CarouselItem key={index}>
            <div className="p-4 transition-all duration-200">
              {renderTestimonialCard(testimonial)}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );

  const renderList = () => (
    <div className="space-y-4 p-4">
      {testimonials.map((testimonial: Testimonial, index: number) => (
        <div key={index} className="transition-all duration-200">
          {renderTestimonialCard(testimonial)}
        </div>
      ))}
    </div>
  );

  const renderTemplate = () => {
    switch (template) {
      case "carousel":
        return renderCarousel();
      case "list":
        return renderList();
      default:
        return renderGrid();
    }
  };

  return (
    <Card className={`overflow-hidden ${
      customization.theme === 'dark' ? 'bg-gray-900 text-white dark:border-gray-800' :
      customization.theme === 'light' ? 'bg-gray-50 border-gray-200' :
      customization.theme === 'brand' ? 'bg-primary text-primary-foreground' :
      'bg-background border-border'
    } transition-colors duration-200`}>
      {renderTemplate()}
    </Card>
  );
}

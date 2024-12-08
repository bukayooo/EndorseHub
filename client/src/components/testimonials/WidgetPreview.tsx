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
    animation: string;
    layout: string;
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

  const getLayoutClasses = () => {
    switch (customization.layout) {
      case "comfortable":
        return "gap-6 p-6";
      case "spacious":
        return "gap-8 p-8";
      default:
        return "gap-4 p-4";
    }
  };

  const getAnimationClasses = () => {
    switch (customization.animation) {
      case "fade":
        return "transition-opacity duration-300";
      case "slide":
        return "transition-transform duration-300";
      default:
        return "";
    }
  };

  const renderTestimonialCard = (testimonial: Testimonial) => (
    <TestimonialCard
      author={testimonial.authorName}
      content={testimonial.content}
      rating={testimonial.rating ?? 5}
    />
  );

  const renderGrid = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${getLayoutClasses()}`}>
      {testimonials.map((testimonial: Testimonial, index: number) => (
        <div key={index} className={getAnimationClasses()}>
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
            <div className={`p-4 ${getAnimationClasses()}`}>
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
    <div className={`space-y-4 ${getLayoutClasses()}`}>
      {testimonials.map((testimonial: Testimonial, index: number) => (
        <div key={index} className={getAnimationClasses()}>
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
    <Card className={`overflow-hidden bg-${customization.theme}`}>
      {renderTemplate()}
    </Card>
  );
}

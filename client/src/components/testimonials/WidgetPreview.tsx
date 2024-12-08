import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import TestimonialCard from "./TestimonialCard";
import type { Testimonial } from "@db/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

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
  const { data: testimonials = [], isError, error } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const response = await fetch("/api/testimonials", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch testimonials');
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      
      return data;
    },
    retry: false,
    enabled: true,
  });

  if (isError) {
    console.error('Failed to fetch testimonials:', error);
    return (
      <Card className="p-4">
        <p className="text-red-500">Error loading testimonials. Please try again later.</p>
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

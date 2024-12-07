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

const demoTestimonials: Omit<Testimonial, "createdAt"> & { createdAt: string }[] = [
  {
    id: 1,
    authorName: "Emily Parker",
    authorTitle: "Marketing Director",
    content: "This product has transformed our business. The results have been incredible and our customers love it!",
    rating: 5,
    userId: 1,
    status: "approved",
    source: "direct",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    authorName: "Michael Chen",
    authorTitle: "Tech Entrepreneur",
    content: "Outstanding service and support. The team goes above and beyond to ensure success.",
    rating: 5,
    userId: 1,
    status: "approved",
    source: "direct",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    authorName: "Sarah Thompson",
    authorTitle: "Business Owner",
    content: "I can't imagine running my business without this tool now. It's become indispensable.",
    rating: 4,
    userId: 1,
    status: "approved",
    source: "direct",
    createdAt: new Date().toISOString(),
  },
];

export default function WidgetPreview({ template, customization }: WidgetPreviewProps) {
  const { data: testimonials = demoTestimonials } = useQuery<typeof demoTestimonials>({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const response = await fetch("/api/testimonials");
      return response.json();
    },
    enabled: false, // Disable auto-fetching for preview
  });

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

  const renderTestimonialCard = (testimonial: typeof demoTestimonials[0]) => (
    <TestimonialCard
      author={testimonial.authorName}
      title={testimonial.authorTitle || undefined}
      content={testimonial.content}
      rating={testimonial.rating || undefined}
    />
  );

  const renderGrid = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${getLayoutClasses()}`}>
      {testimonials.map((testimonial, index) => (
        <div key={index} className={getAnimationClasses()}>
          {renderTestimonialCard(testimonial)}
        </div>
      ))}
    </div>
  );

  const renderCarousel = () => (
    <Carousel className="w-full">
      <CarouselContent>
        {testimonials.map((testimonial, index) => (
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
      {testimonials.map((testimonial, index) => (
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

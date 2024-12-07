import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import TestimonialCard from "./TestimonialCard";
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

const demoTestimonials = [
  {
    author: "Emily Parker",
    title: "Marketing Director",
    content: "This product has transformed our business. The results have been incredible and our customers love it!",
    rating: 5,
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
  },
  {
    author: "Michael Chen",
    title: "Tech Entrepreneur",
    content: "Outstanding service and support. The team goes above and beyond to ensure success.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf",
  },
  {
    author: "Sarah Thompson",
    title: "Business Owner",
    content: "I can't imagine running my business without this tool now. It's become indispensable.",
    rating: 4,
    image: "https://images.unsplash.com/photo-1524508762098-fd966ffb6ef9",
  },
];

export default function WidgetPreview({ template, customization }: WidgetPreviewProps) {
  const { data: testimonials = demoTestimonials } = useQuery({
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

  const renderGrid = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${getLayoutClasses()}`}>
      {testimonials.map((testimonial, index) => (
        <div key={index} className={getAnimationClasses()}>
          <TestimonialCard {...testimonial} />
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
              <TestimonialCard {...testimonial} />
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
          <TestimonialCard {...testimonial} />
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

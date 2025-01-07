import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import TestimonialSelection from "@/components/testimonials/TestimonialSelection";
import type { Testimonial } from "@/types/api";

export default function WidgetBuilder() {
  const [, navigate] = useLocation();
  const [selectedTestimonials, setSelectedTestimonials] = useState<Testimonial[]>([]);

  const handleTestimonialSelect = (testimonial: Testimonial) => {
    setSelectedTestimonials((prev) => {
      const exists = prev.some((t) => t.id === testimonial.id);
      if (exists) {
        return prev.filter((t) => t.id !== testimonial.id);
      }
      return [...prev, testimonial];
    });
  };

  const handleContinue = () => {
    // TODO: Create widget with selected testimonials
    navigate("/dashboard");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Create Widget</h1>
          <Button
            onClick={handleContinue}
            disabled={selectedTestimonials.length === 0}
          >
            Continue with {selectedTestimonials.length} selected
          </Button>
        </div>

        <TestimonialSelection onSelect={handleTestimonialSelect} />
      </div>
    </div>
  );
}

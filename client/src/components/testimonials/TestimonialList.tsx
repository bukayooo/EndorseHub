import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import TestimonialCard from "./TestimonialCard";
import { api } from "@/lib/api";
import type { Testimonial } from "@/types/db";

export default function TestimonialList() {
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: () => api.get('/testimonials').then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-[200px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No testimonials found. Add some testimonials first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {testimonials.map((testimonial) => (
        <TestimonialCard
          key={testimonial.id}
          testimonial={testimonial}
          showRatings={true}
        />
      ))}
    </div>
  );
} 
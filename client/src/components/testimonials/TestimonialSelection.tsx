import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import TestimonialCard from "./TestimonialCard";
import type { Testimonial, User } from "@/types/db";

interface TestimonialSelectionProps {
  initialSelectedIds?: number[];
  onComplete: (selectedIds: number[]) => void;
}

export default function TestimonialSelection({ initialSelectedIds = [], onComplete }: TestimonialSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: () => api.get<Testimonial[]>('/testimonials').then(res => res.data),
  });
  const { user } = useUser();
  const typedUser = user as User | null | undefined;

  const handleSelect = (testimonialId: number) => {
    if (!typedUser?.is_premium && selectedIds.length >= 3 && !selectedIds.includes(testimonialId)) {
      // Show premium upgrade dialog
      return;
    }

    setSelectedIds(prev =>
      prev.includes(testimonialId)
        ? prev.filter(id => id !== testimonialId)
        : [...prev, testimonialId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Select Testimonials</h2>
          <p className="text-muted-foreground">
            {typedUser?.is_premium
              ? "Select the testimonials you want to display in your widget"
              : "Select up to 3 testimonials (upgrade for more)"}
          </p>
        </div>
        <Button
          onClick={() => onComplete(selectedIds)}
          disabled={selectedIds.length === 0}
        >
          Continue
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-[200px] animate-pulse" />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No testimonials found. Add some testimonials first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial: Testimonial) => (
            <div
              key={testimonial.id}
              className={`cursor-pointer transition-all ${
                selectedIds.includes(testimonial.id)
                  ? "ring-2 ring-primary"
                  : "hover:ring-2 hover:ring-primary/50"
              }`}
              onClick={() => handleSelect(testimonial.id)}
            >
              <TestimonialCard
                testimonial={testimonial}
                showRatings={true}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

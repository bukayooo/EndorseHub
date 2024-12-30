import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import TestimonialCard from "./TestimonialCard";
import { api, type ApiResponse } from "@/lib/api";
import type { Testimonial } from "@db/schema";

interface TestimonialSelectionProps {
  initialSelectedIds?: number[];
  onComplete: (selectedIds: number[]) => void;
}

export default function TestimonialSelection({ initialSelectedIds = [], onComplete }: TestimonialSelectionProps) {
  const [selectedIds, setSelectedIds] = useState(new Set(initialSelectedIds));

  const { data: testimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Testimonial[]>>('/api/testimonials');
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch testimonials');
      }
      return data.data;
    },
  });

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!Array.isArray(testimonials) || testimonials.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No testimonials found. Add testimonials before creating a widget.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Select Testimonials</h2>
        <Button 
          onClick={() => onComplete(Array.from(selectedIds))}
          disabled={selectedIds.size === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Continue with {selectedIds.size} selected
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="relative group">
            <div className="absolute right-4 top-4 z-10">
              <input
                type="checkbox"
                checked={selectedIds.has(testimonial.id)}
                onChange={() => toggleSelection(testimonial.id)}
                className="h-5 w-5 rounded border-gray-300 cursor-pointer"
              />
            </div>
            <div onClick={() => toggleSelection(testimonial.id)} className="cursor-pointer">
              <TestimonialCard
                author={testimonial.author_name}
                content={testimonial.content}
                rating={testimonial.rating ?? undefined}
                showRatings={true}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

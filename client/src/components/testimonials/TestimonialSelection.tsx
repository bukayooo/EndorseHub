import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TestimonialCard from "./TestimonialCard";
import { useUser } from "@/hooks/use-user";
import type { Testimonial } from "@db/schema";
import { api } from "@/lib/api";

interface TestimonialSelectionProps {
  initialSelectedIds?: number[];
  onComplete: (selectedIds: number[]) => void;
}

export default function TestimonialSelection({ initialSelectedIds = [], onComplete }: TestimonialSelectionProps) {
  const { user } = useUser();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedIds));

  const { data: testimonials = [], isLoading } = useQuery<Testimonial[], Error>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      try {
        const { data: response } = await api.get<ApiResponse<Testimonial[]>>('/testimonials');
        console.log('[TestimonialSelection] Response:', response);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch testimonials');
        }
        
        return response.data;
      } catch (error) {
        console.error('[TestimonialSelection] Fetch error:', error);
        throw error;
      }
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

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Loading testimonials...</p>
      </div>
    );
  }

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
                author={testimonial.authorName}
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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Testimonial } from "@/types/api";
import { searchTestimonials } from "@/lib/api";

interface TestimonialSelectionProps {
  onSelect: (testimonial: Testimonial) => void;
}

export default function TestimonialSelection({ onSelect }: TestimonialSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["testimonials", searchQuery],
    queryFn: () => searchTestimonials(searchQuery),
    enabled: searchQuery.length >= 3,
  });

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search testimonials..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 border rounded-md"
      />

      {isLoading && <div>Loading...</div>}

      <div className="space-y-2">
        {testimonials?.map((testimonial) => (
          <div
            key={testimonial.id}
            onClick={() => onSelect(testimonial)}
            className="p-4 border rounded-md cursor-pointer hover:bg-gray-50"
          >
            <p className="font-medium">{testimonial.author_name}</p>
            <p className="text-sm text-gray-600">{testimonial.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

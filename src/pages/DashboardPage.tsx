import { AddTestimonialForm } from "@/components/testimonials/AddTestimonialForm";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { Testimonial } from "@/types/db";

export default function DashboardPage() {
  const { data: testimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ["testimonials"],
    queryFn: () => api.getTestimonials(),
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Testimonials</h2>
          <div className="space-y-4">
            {testimonials.map((testimonial: Testimonial) => (
              <div key={testimonial.id} className="p-4 bg-white rounded-lg shadow">
                <p className="text-gray-600">{testimonial.content}</p>
                <p className="text-sm text-gray-500 mt-2">- {testimonial.author_name}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Add New Testimonial</h2>
          <AddTestimonialForm />
        </div>
      </div>
    </div>
  );
} 
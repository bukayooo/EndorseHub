import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Testimonial } from "@db/schema";
import Sidebar from "../components/dashboard/Sidebar";
import Stats from "../components/dashboard/Stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TestimonialCard from "../components/testimonials/TestimonialCard";
import TestimonialForm from "../components/testimonials/TestimonialForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (testimonialId: number) => {
      const response = await fetch(`/api/testimonials/${testimonialId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete testimonial');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast({
        title: 'Success',
        description: 'Testimonial deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete testimonial',
        variant: 'destructive',
      });
    },
  });

  const { data: testimonials = [], isLoading, isError, error } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/testimonials', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required. Please log in.');
          }
          throw new Error('Failed to fetch testimonials');
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }

        return data;
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        throw err;
      }
    },
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats', {
        credentials: 'include'
      });
      return response.json();
    },
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <Dialog open={isAddingTestimonial} onOpenChange={setIsAddingTestimonial}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Testimonial
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Testimonial</DialogTitle>
                </DialogHeader>
                <TestimonialForm onSuccess={() => setIsAddingTestimonial(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Stats stats={stats} />

          <div className="grid gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Recent Testimonials</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading testimonials...</div>
                ) : isError ? (
                  <div className="text-red-500">
                    {error instanceof Error ? error.message : 'Error loading testimonials. Please try again later.'}
                  </div>
                ) : Array.isArray(testimonials) && testimonials.length === 0 ? (
                  <div className="text-gray-500">No testimonials found. Add your first testimonial!</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {Array.isArray(testimonials) && testimonials.map((testimonial) => (
                      <TestimonialCard
                        key={testimonial.id}
                        author={testimonial.authorName}
                        content={testimonial.content}
                        rating={testimonial.rating ?? undefined}
                        onDelete={() => deleteMutation.mutate(testimonial.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

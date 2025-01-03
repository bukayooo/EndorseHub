import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { api } from "@/lib/api";
import TestimonialCard from "@/components/testimonials/TestimonialCard";
import AddTestimonialForm from "@/components/testimonials/AddTestimonialForm";
import Stats from "@/components/dashboard/Stats";
import ErrorBoundary from "@/components/testimonials/ErrorBoundary";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import type { Testimonial } from "@/types/db";

export default function DashboardPage() {
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: testimonials = [], isLoading: isLoadingTestimonials } = useQuery<Testimonial[]>({
    queryKey: ['testimonials', user?.id],
    queryFn: () => api.get('/testimonials').then((res) => res.data),
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => api.get('/testimonials/stats').then((res) => res.data),
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (testimonialId: number) => api.delete(`/testimonials/${testimonialId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id] });
      toast({
        title: "Success",
        description: "Testimonial deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete testimonial",
        variant: "destructive"
      });
    }
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => setIsAddingTestimonial(true)}>
            Add Testimonial
          </Button>
        </div>

        <Dialog open={isAddingTestimonial} onOpenChange={setIsAddingTestimonial}>
          <DialogContent>
            <AddTestimonialForm onSuccess={() => setIsAddingTestimonial(false)} />
          </DialogContent>
        </Dialog>

        <div className="grid gap-6">
          <ErrorBoundary>
            <Stats stats={stats} />
          </ErrorBoundary>

          <Card>
            <CardHeader>
              <CardTitle>Testimonials</CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                {isLoadingTestimonials ? (
                  <div className="text-gray-500">
                    <p>Loading testimonials...</p>
                  </div>
                ) : testimonials.length === 0 ? (
                  <div className="text-gray-500">No testimonials found. Add your first testimonial!</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {testimonials.map((testimonial: Testimonial) => (
                      <TestimonialCard
                        key={testimonial.id}
                        testimonial={testimonial}
                        onDelete={() => deleteMutation.mutate(testimonial.id)}
                      />
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

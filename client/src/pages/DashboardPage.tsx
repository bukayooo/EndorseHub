import { useState, useEffect } from "react";
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
import type { Testimonial } from "@db/schema";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export default function DashboardPage() {
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  useEffect(() => {
    console.log('[Dashboard] User state:', { user, isAuthenticated: !!user?.id });
  }, [user]);

  const { data: testimonials = [], isLoading, isError, error } = useQuery<Testimonial[], Error>({
    queryKey: ['testimonials', user?.id],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<Testimonial[]>>('/api/testimonials');
        console.log('[Dashboard] Testimonials response:', data);
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch testimonials');
        }
        return data.data || [];
      } catch (error) {
        console.error('[Dashboard] Failed to fetch testimonials:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: false
  });

  useEffect(() => {
    console.log('[Dashboard] Testimonials state:', {
      count: testimonials?.length,
      data: testimonials,
      isLoading,
      isError,
      error
    });
  }, [testimonials, isLoading, isError, error]);

  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<any>>('/analytics/stats');
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch stats');
        }
        return data.data;
      } catch (error) {
        console.error('[Dashboard] Failed to fetch stats:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: false
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/api/testimonials/${id}`);
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete testimonial');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast({
        title: "Success",
        description: "Testimonial deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete testimonial",
        variant: "destructive",
      });
    },
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
                {isLoading ? (
                  <div className="text-gray-500">
                    <p>Loading testimonials...</p>
                  </div>
                ) : isError ? (
                  <div className="text-red-500">
                    <p>
                      {error instanceof Error
                        ? error.message
                        : "Failed to load testimonials"}
                    </p>
                  </div>
                ) : testimonials.length === 0 ? (
                  <div className="text-gray-500">No testimonials found. Add your first testimonial!</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {testimonials.map((testimonial: Testimonial) => (
                      <TestimonialCard
                        key={testimonial.id}
                        author={testimonial.author_name}
                        content={testimonial.content}
                        rating={testimonial.rating ?? undefined}
                        showRatings={true}
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

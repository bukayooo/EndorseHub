import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import type { Testimonial } from "@db/schema";
import type { StatsData } from "@/components/dashboard/Stats";
import Sidebar from "@/components/dashboard/Sidebar";
import Stats from "@/components/dashboard/Stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TestimonialCard from "@/components/testimonials/TestimonialCard";
import AddTestimonialForm from "@/components/testimonials/AddTestimonialForm";
import ErrorBoundary from "@/components/testimonials/ErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { api, type ApiResponse } from "@/lib/api";

const defaultStats: StatsData = {
  testimonialCount: 0,
  widgetCount: 0,
  viewCount: 0,
  clickCount: 0,
  conversionRate: '0%'
};

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

  const deleteMutation = useMutation({
    mutationFn: async (testimonialId: number) => {
      console.log('[Dashboard] Deleting testimonial:', testimonialId);
      const response = await api.delete(`/api/testimonials/${testimonialId}`);
      console.log('[Dashboard] Delete response:', response);
      return response.data;
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
      console.error('[Dashboard] Delete error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete testimonial',
        variant: 'destructive',
      });
    },
  });

  const { data: stats = defaultStats, isLoading: isStatsLoading, error: statsError } = useQuery<StatsData, Error>({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<StatsData>>('/api/stats');
        console.log('[Dashboard] Stats response:', data);
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch stats');
        }
        return data.data || defaultStats;
      } catch (error) {
        console.error('[Stats] Fetch error:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: false
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
                  <DialogTitle>Add Testimonial</DialogTitle>
                </DialogHeader>
                <AddTestimonialForm
                  onSuccess={() => {
                    setIsAddingTestimonial(false);
                    queryClient.invalidateQueries({ queryKey: ['testimonials'] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {isStatsLoading ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Loading stats...</CardTitle>
              </CardHeader>
            </Card>
          ) : statsError ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-red-500">Failed to load stats</CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <Stats stats={stats || defaultStats} />
          )}

          <div className="grid gap-6 mt-8">
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
                          author={testimonial.authorName}
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
      </main>
    </div>
  );
}

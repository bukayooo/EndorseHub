import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import type { Testimonial } from "@db/schema";
import Sidebar from "../components/dashboard/Sidebar";
import Stats from "../components/dashboard/Stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TestimonialCard from "../components/testimonials/TestimonialCard";
import TestimonialForm from "../components/testimonials/TestimonialForm";
import ImportReviewsForm from "../components/testimonials/ImportReviewsForm";
import ErrorBoundary from "../components/testimonials/ErrorBoundary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  useEffect(() => {
    console.log('[Dashboard] Current user:', user);
  }, [user]);

  const deleteMutation = useMutation({
    mutationFn: async (testimonialId: number) => {
      console.log('[Dashboard] Deleting testimonial:', testimonialId);
      const response = await api.delete(`/testimonials/${testimonialId}`);
      console.log('[Dashboard] Delete response:', response);
      return response;
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

  const { data: testimonials = [], isLoading, isError, error } = useQuery({
    queryKey: ['testimonials', user?.id],
    queryFn: async () => {
      try {
        console.log('[Dashboard] Fetching testimonials for user:', user?.id);
        const response = await api.get('/api/testimonials', {
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log('[Dashboard] Testimonials response:', response.data);
        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Failed to fetch testimonials');
        }
        return response.data.data || [];
      } catch (error) {
        console.error('[Dashboard] Fetch error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to fetch testimonials');
      }
    },
    enabled: !!user?.id,
    staleTime: 0,
    retry: 3,
    onError: (err) => {
      console.error('[Dashboard] Testimonial fetch error:', err);
      toast({
        title: 'Error',
        description: 'Failed to load testimonials. Please try refreshing the page.',
        variant: 'destructive'
      });
    }
  });

  useEffect(() => {
    console.log('[Dashboard] Current testimonials:', testimonials);
  }, [testimonials]);

  const { data: stats, isLoading: isStatsLoading, error: statsError } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      console.log('[Stats] Fetching stats for user:', user?.id);
      try {
        const { data } = await api.get('/api/stats');
        console.log('[Stats] Fetch success:', data);
        return data;
      } catch (error) {
        console.error('[Stats] Fetch error:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Authentication required')) {
        return false;
      }
      return failureCount < 3;
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
              <DialogContent 
                className="max-h-[90vh] overflow-y-auto" 
                aria-describedby="dialog-description"
              >
                <div id="dialog-description" className="sr-only">
                  Add a new testimonial form
                </div>
                <DialogHeader>
                  <DialogTitle>Add New Testimonial</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 p-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Manual Entry</h3>
                    <TestimonialForm onSuccess={() => setIsAddingTestimonial(false)} />
                  </div>
                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Import Reviews</h3>
                    <ImportReviewsForm onSuccess={() => setIsAddingTestimonial(false)} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isStatsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
                </Card>
              ))}
            </div>
          ) : statsError ? (
            <Card className="p-4 border-red-200 bg-red-50">
              <p className="text-red-700">
                {statsError instanceof Error ? statsError.message : 'Failed to load stats'}
              </p>
            </Card>
          ) : (
            <Stats stats={stats} />
          )}

          <div className="grid gap-6 mt-8">
            <ErrorBoundary>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Testimonials</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-gray-500">Loading testimonials...</div>
                  ) : isError ? (
                    <div className="p-4 border border-red-200 rounded-md bg-red-50">
                      <p className="text-red-700">
                        {error instanceof Error ? error.message : 'Failed to load testimonials'}
                      </p>
                    </div>
                  ) : testimonials.length === 0 ? (
                    <div className="text-gray-500">No testimonials found. Add your first testimonial!</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {testimonials.map((testimonial) => (
                        <TestimonialCard
                          key={testimonial.id}
                          author={testimonial.authorName}
                          content={testimonial.content}
                          rating={testimonial.rating || undefined}
                          onDelete={() => deleteMutation.mutate(testimonial.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

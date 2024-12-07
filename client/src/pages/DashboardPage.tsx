import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const response = await fetch('/api/testimonials', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      return response.ok ? response.json() : [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats');
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

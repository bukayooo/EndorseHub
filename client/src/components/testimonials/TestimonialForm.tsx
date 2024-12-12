
import { useForm } from "react-hook-form";
import ErrorBoundary from "./ErrorBoundary";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const testimonialSchema = z.object({
  authorName: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  rating: z.number().min(1).max(5).optional(),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

interface TestimonialFormProps {
  onSuccess?: () => void;
}

export default function TestimonialForm({ onSuccess }: TestimonialFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      authorName: "",
      content: "",
      rating: 5,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TestimonialFormData) => {
      const response = await fetch("/api/testimonials", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          authorName: data.authorName,
          content: data.content,
          rating: data.rating || 5,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please login to submit a testimonial");
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit testimonial");
      }
      
      return response.json();
    },
    onSuccess: () => {
      console.log('Mutation successful, resetting form and updating UI');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({
        title: "Success",
        description: "Testimonial submitted successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit testimonial",
        variant: "destructive",
      });
    },
  });

  return (
    <ErrorBoundary>
      <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        console.log('Form submission started with data:', data);
        return mutation.mutate(data);
      }, (errors) => {
        console.error('Form validation errors:', errors);
      })} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="authorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter your name"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    form.clearErrors('authorName');
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Testimonial</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter your testimonial"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    form.clearErrors('content');
                  }}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating (1-5)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={field.value || 5}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit Testimonial"}
        </Button>
      </form>
    </Form>
    </ErrorBoundary>
  );
}

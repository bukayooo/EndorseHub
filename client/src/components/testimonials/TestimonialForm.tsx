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
import { insertTestimonialSchema, type InsertTestimonial } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

interface TestimonialFormProps {
  onSuccess?: () => void;
}

export default function TestimonialForm({ onSuccess }: TestimonialFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertTestimonial>({
    resolver: zodResolver(insertTestimonialSchema),
    defaultValues: {
      authorName: "",
      content: "",
      rating: 5,
      status: "pending",
      source: "direct",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertTestimonial) => {
      console.log('Submitting testimonial data:', data);
      const response = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        console.error('Submission failed:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        throw new Error(errorData.error || "Failed to submit testimonial");
      }
      
      const result = await response.json();
      console.log('Submission successful:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Mutation successful, resetting form and updating UI');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
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

  // Log form state for validation debugging
  console.log('Form state:', form.formState);

  return (
    <ErrorBoundary>
      <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        console.log('Form submission started');
        console.log('Form values:', form.getValues());
        mutation.mutate(data);
      })} className="space-y-4">
        <FormField
          control={form.control}
          name="authorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input value={field.value || ""} onChange={field.onChange} />
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
                <Textarea value={field.value || ""} onChange={field.onChange} rows={4} />
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

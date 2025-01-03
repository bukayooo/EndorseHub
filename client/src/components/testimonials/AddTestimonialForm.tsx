import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import type { Testimonial } from "@/types/db";

const testimonialSchema = z.object({
  author_name: z.string().min(1, "Author name is required"),
  content: z.string().min(1, "Content is required"),
  rating: z.number().min(1).max(5).optional(),
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

interface AddTestimonialFormProps {
  onSuccess?: () => void;
}

export default function AddTestimonialForm({ onSuccess }: AddTestimonialFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
  });

  const mutation = useMutation<Testimonial, Error, TestimonialFormData>({
    mutationFn: (data: TestimonialFormData) => api.post("/testimonials", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      reset();
      setRating(null);
      toast({
        title: "Success",
        description: "Testimonial added successfully",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add testimonial",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TestimonialFormData) => {
    mutation.mutate({
      ...data,
      rating: rating || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="author_name">Author Name</Label>
        <Input
          id="author_name"
          {...register("author_name")}
          aria-invalid={errors.author_name ? "true" : "false"}
          aria-errormessage={errors.author_name?.message}
        />
        {errors.author_name && (
          <p className="text-sm text-red-500">{errors.author_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          {...register("content")}
          aria-invalid={errors.content ? "true" : "false"}
          aria-errormessage={errors.content?.message}
        />
        {errors.content && (
          <p className="text-sm text-red-500">{errors.content.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Rating (Optional)</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              type="button"
              variant={rating === value ? "default" : "outline"}
              onClick={() => setRating(value)}
              className="w-10 h-10 p-0"
            >
              {value}
            </Button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Adding..." : "Add Testimonial"}
      </Button>
    </form>
  );
} 
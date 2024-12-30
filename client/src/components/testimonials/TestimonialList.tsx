import { useState } from 'react';
import { useQuery } from '@tanstack/react-query/build/modern';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import TestimonialCard from './TestimonialCard';
import ImportReviewsForm from './ImportReviewsForm';
import type { Testimonial } from '@/types/db';

export default function TestimonialList() {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: () => api.get('/api/testimonials').then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading testimonials...</p>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No testimonials yet</p>
        <Button onClick={() => setShowImportDialog(true)}>
          Import Reviews
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Your Testimonials</h2>
          <Button onClick={() => setShowImportDialog(true)}>
            Import Reviews
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial: Testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              author={testimonial.author_name}
              content={testimonial.content}
              rating={testimonial.rating ?? undefined}
              showRatings={true}
            />
          ))}
        </div>
      </div>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <ImportReviewsForm onSuccess={() => setShowImportDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
} 
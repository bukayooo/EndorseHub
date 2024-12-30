import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import PricingDialog from "@/components/pricing/PricingDialog";
import TestimonialCard from "./TestimonialCard";

interface ImportReviewsFormProps {
  onSuccess?: () => void;
}

interface Review {
  author_name: string;
  content: string;
  rating: number;
  source: string;
  source_url?: string;
  source_metadata?: any;
}

export default function ImportReviewsForm({ onSuccess }: ImportReviewsFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  const importMutation = useMutation({
    mutationFn: async (reviews: Review[]) => {
      const { data } = await api.post<ApiResponse<any>>('/api/testimonials/import', { reviews });
      if (!data.success) {
        throw new Error(data.error || 'Failed to import reviews');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({
        title: "Success",
        description: "Reviews imported successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import reviews",
        variant: "destructive",
      });
    },
  });

  const handlePlatformSelect = async (platform: string) => {
    if (!user?.is_premium) {
      setShowPricingDialog(true);
      return;
    }

    setSelectedPlatform(platform);
    setIsLoading(true);

    try {
      const { data } = await api.get<ApiResponse<Review[]>>(`/api/testimonials/import/${platform}`);
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }
      setReviews(data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch reviews",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!reviews.length) return;
    await importMutation.mutateAsync(reviews);
  };

  const platforms = [
    {
      id: 'google',
      name: 'Google Reviews',
      description: 'Import reviews from your Google Business Profile',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
          <path d="M7 7h.01" />
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook Reviews',
      description: 'Import reviews from your Facebook Business Page',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      )
    },
    {
      id: 'yelp',
      name: 'Yelp Reviews',
      description: 'Import reviews from your Yelp Business Page',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Import Reviews</h3>
        <p className="text-sm text-muted-foreground">
          Import reviews from external platforms
        </p>
      </div>

      {!selectedPlatform ? (
        <div className="grid gap-4 md:grid-cols-3">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePlatformSelect(platform.id)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-2 bg-primary/5 rounded-full">
                    {platform.icon}
                  </div>
                  <h4 className="font-semibold">{platform.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {platform.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedPlatform(null);
                setReviews([]);
              }}
            >
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={!reviews.length || importMutation.isPending}
            >
              Import {reviews.length} Reviews
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No reviews found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map((review, index) => (
                <TestimonialCard
                  key={index}
                  author={review.author_name}
                  content={review.content}
                  rating={review.rating}
                  showRatings={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <PricingDialog
        isOpen={showPricingDialog}
        onClose={() => setShowPricingDialog(false)}
      />
    </div>
  );
}

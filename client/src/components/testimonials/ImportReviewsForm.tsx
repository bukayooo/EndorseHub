import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PricingDialog } from "@/components/PricingDialog";

const searchSchema = z.object({
  query: z.string().min(3, "Please enter at least 3 characters"),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface Review {
  authorName: string;
  content: string;
  rating: number;
  time: number;
  platform?: string;
  profileUrl?: string;
  reviewUrl?: string;
}

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  platform: string;
  reviews: Review[];
  url?: string;
}

interface ImportReviewsFormProps {
  onSuccess?: () => void;
}

export default function ImportReviewsForm({ onSuccess }: ImportReviewsFormProps) {
  const { toast } = useToast();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const queryClient = useQueryClient();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: SearchFormData) => {
      const response = await fetch("/api/testimonials/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "PREMIUM_REQUIRED") {
          throw new Error("PREMIUM_REQUIRED");
        }
        throw new Error(error.error || "Failed to search for businesses");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data);
    },
    onError: (error) => {
      if (error instanceof Error) {
        if (error.message === "PREMIUM_REQUIRED") {
          setShowPricingDialog(true);
        } else {
          toast({
            title: "Error",
            description: "Failed to search for businesses",
            variant: "destructive",
          });
        }
      }
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ placeId, review }: { placeId: string; review: Review }) => {
      const response = await fetch("/api/testimonials/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          placeId,
          review,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "PREMIUM_REQUIRED") {
          throw new Error("PREMIUM_REQUIRED");
        }
        throw new Error(error.error || "Failed to import review");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({
        title: "Success",
        description: "Review imported successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "PREMIUM_REQUIRED") {
        setShowPricingDialog(true);
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to import review",
          variant: "destructive",
        });
      }
    },
  });

  const handleSearch = async (data: SearchFormData) => {
    setIsSearching(true);
    try {
      await searchMutation.mutateAsync(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = (placeId: string, review: Review) => {
    importMutation.mutate({ placeId, review });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSearch)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search for a business</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter business name or location"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      form.clearErrors("query");
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </form>
      </Form>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          {searchResults.map((result) => (
            <Card key={result.placeId}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{result.name}</h3>
                    <p className="text-sm text-muted-foreground">{result.address}</p>
                    {result.rating && (
                      <p className="text-sm">Rating: {result.rating} ★</p>
                    )}
                    <p className="text-sm text-muted-foreground">Platform: {result.platform}</p>
                  </div>
                  <div className="space-y-2">
                    {result.reviews.map((review, index) => (
                      <div key={index} className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{review.authorName}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.time * 1000).toLocaleDateString()}
                            </p>
                            <p className="mt-2">{review.content}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {review.rating} ★
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleImport(result.placeId, review)}
                              disabled={importMutation.isPending}
                            >
                              Import
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PricingDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
      />
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

interface ImportReviewsFormProps {
  onSuccess?: () => void;
}

export default function ImportReviewsForm({ onSuccess }: ImportReviewsFormProps) {
  const [url, setUrl] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (importUrl: string) => api.post("/testimonials/import", { url: importUrl }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      setUrl("");
      toast({
        title: "Success",
        description: "Reviews imported successfully",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import reviews",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Import Reviews</Label>
        <Input
          id="url"
          type="url"
          placeholder="Enter URL to import reviews from"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Importing..." : "Import Reviews"}
      </Button>
    </form>
  );
}

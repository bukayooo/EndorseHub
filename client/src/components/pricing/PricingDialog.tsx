import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface PricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingDialog({ isOpen, onClose }: PricingDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/api/stripe/create-checkout-session');
      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      window.location.href = data.data.url;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Upgrade to Premium</h2>
            <p className="text-muted-foreground mt-2">
              Get access to all premium features
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center">
              <span className="flex-1">Unlimited testimonials</span>
              <span className="text-green-500">✓</span>
            </div>
            <div className="flex items-center">
              <span className="flex-1">Import from external platforms</span>
              <span className="text-green-500">✓</span>
            </div>
            <div className="flex items-center">
              <span className="flex-1">Advanced customization</span>
              <span className="text-green-500">✓</span>
            </div>
            <div className="flex items-center">
              <span className="flex-1">Priority support</span>
              <span className="text-green-500">✓</span>
            </div>
          </div>

          <div className="text-center">
            <div className="mb-4">
              <span className="text-3xl font-bold">$9</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Loading..." : "Upgrade Now"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
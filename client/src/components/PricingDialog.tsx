import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCheckoutSession } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingDialog({ isOpen, onClose }: PricingDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (priceType: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      toast({
        title: "Processing",
        description: "Preparing your checkout session...",
      });
      
      console.log('Starting checkout session creation for:', priceType);
      await createCheckoutSession(priceType);
    } catch (error) {
      console.error('Error upgrading:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout process";
      console.error('Checkout error:', error);
      toast({
        title: "Unable to Start Checkout",
        description: errorMessage + ". Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Premium Subscription</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Choose your preferred payment schedule for premium access
          </p>
        </DialogHeader>
        <div className="grid gap-6">
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground mb-4">
              <p className="font-medium text-base text-foreground">Premium Subscription</p>
              <p className="mt-2">Unlock all features including:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Create and save custom widgets</li>
                <li>Import reviews from external platforms</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 flex flex-col h-full">
                <div className="space-y-2 flex-grow">
                  <h3 className="font-semibold">Monthly</h3>
                  <div>
                    <p className="text-2xl font-bold">$130</p>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleUpgrade('monthly')}
                  disabled={isLoading}
                  className="w-full mt-4"
                >
                  {isLoading ? "Processing..." : "Subscribe Monthly"}
                </Button>
              </div>
              <div className="border rounded-lg p-4 flex flex-col h-full bg-primary/5">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Yearly</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Save 38%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">$80</p>
                      <p className="text-sm text-muted-foreground">/month</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Billed annually ($960/year)</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Recommended</p>
                </div>
                <Button
                  onClick={() => handleUpgrade('yearly')}
                  disabled={isLoading}
                  variant="default"
                  className="w-full mt-4"
                >
                  {isLoading ? "Processing..." : "Subscribe Yearly"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

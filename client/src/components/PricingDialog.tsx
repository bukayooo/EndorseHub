import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { upgradeToPreview } from "@/lib/api";
import { useState } from "react";

interface PricingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingDialog({ isOpen, onClose }: PricingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (priceType: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      await upgradeToPreview(priceType);
    } catch (error) {
      console.error('Error upgrading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upgrade to Premium</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Monthly</h3>
              <p className="text-2xl font-bold">$9.99</p>
              <p className="text-sm text-muted-foreground">Billed monthly</p>
              <Button
                onClick={() => handleUpgrade('monthly')}
                disabled={isLoading}
                className="w-full mt-4"
              >
                {isLoading ? "Processing..." : "Choose Monthly"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2 bg-primary/5">
              <h3 className="font-semibold">Yearly</h3>
              <p className="text-2xl font-bold">$99.99</p>
              <p className="text-sm text-muted-foreground">
                Billed yearly (Save 17%)
              </p>
              <Button
                onClick={() => handleUpgrade('yearly')}
                disabled={isLoading}
                className="w-full mt-4"
              >
                {isLoading ? "Processing..." : "Choose Yearly"}
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Premium features include:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Import reviews from external platforms</li>
              <li>Create and customize unlimited widgets</li>
              <li>Priority support</li>
              <li>Advanced analytics</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

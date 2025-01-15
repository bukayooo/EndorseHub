import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import Sidebar from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const { data: subscriptionData, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const { data } = await api.get('/billing/subscription-status');
      return data.data;
    },
    enabled: !!user?.id
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/billing/cancel-subscription');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
      setIsConfirmingCancel(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
      setIsConfirmingCancel(false);
    },
  });

  const handleCancelSubscription = async () => {
    try {
      await cancelMutation.mutateAsync();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold">Settings</h1>

          {user?.is_admin && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminPanel />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription settings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSubscription ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading subscription details...</span>
                </div>
              ) : subscriptionData?.isActive ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Status: <span className="text-green-600">Active</span></p>
                    {subscriptionData.currentPeriodEnd && (
                      <p className="text-sm text-muted-foreground">
                        Next billing date: {new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                    {subscriptionData.cancelAtPeriodEnd && (
                      <p className="text-sm text-yellow-600">
                        Your subscription will be cancelled at the end of the current billing period.
                      </p>
                    )}
                  </div>

                  {!subscriptionData.cancelAtPeriodEnd && (
                    <AlertDialog open={isConfirmingCancel} onOpenChange={setIsConfirmingCancel}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Cancel Subscription</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground">You don't have an active subscription.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 
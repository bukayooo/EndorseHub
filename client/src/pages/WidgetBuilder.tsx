import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import PricingDialog from "@/components/pricing/PricingDialog";
import { useUser } from "@/hooks/use-user";
import { WidgetPreview } from "@/components/testimonials/WidgetPreview";
import ErrorBoundary from "@/components/testimonials/ErrorBoundary";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import TestimonialSelection from "@/components/testimonials/TestimonialSelection";
import type { Testimonial } from "@db/schema";

const templates = [
  { id: 'grid', name: 'Grid' },
  { id: 'list', name: 'List' },
  { id: 'carousel', name: 'Carousel' },
];

const customizationOptions = {
  colors: ['light', 'dark', 'system'],
  sizes: ['sm', 'md', 'lg'],
};

interface WidgetCustomization {
  theme: 'light' | 'dark' | 'system';
  showRatings: boolean;
}

export default function WidgetBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<number[]>([]);
  const [customization, setCustomization] = useState<WidgetCustomization>({
    theme: 'light',
    showRatings: true,
  });
  const [showPricing, setShowPricing] = useState(false);
  const [createdWidgetId, setCreatedWidgetId] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const createWidgetMutation = useMutation({
    mutationFn: async () => {
      if (!user?.is_premium && selectedTestimonialIds.length > 3) {
        setShowPricing(true);
        throw new Error('Premium required for more than 3 testimonials');
      }

      const { data } = await api.post('/api/widgets', {
        name,
        template: selectedTemplate,
        testimonial_ids: selectedTestimonialIds,
        customization,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to create widget');
      }

      return data.data;
    },
    onSuccess: (widget) => {
      toast({
        title: "Success",
        description: "Widget created successfully",
      });
      setCreatedWidgetId(widget.id);
    },
    onError: (error) => {
      if (error.message !== 'Premium required for more than 3 testimonials') {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create widget",
          variant: "destructive",
        });
      }
    },
  });

  const handleCreateWidget = async () => {
    if (!name) {
      toast({
        title: "Error",
        description: "Please enter a name for your widget",
        variant: "destructive",
      });
      return;
    }

    if (selectedTestimonialIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one testimonial",
        variant: "destructive",
      });
      return;
    }

    createWidgetMutation.mutate();
  };

  if (step === 'select') {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10">
          <TestimonialSelection
            initialSelectedIds={selectedTestimonialIds}
            onComplete={(ids) => {
              setSelectedTestimonialIds(ids);
              setStep('configure');
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Create Widget</h1>
          <div className="space-x-4">
            <Button variant="outline" onClick={() => setStep('select')}>
              Back
            </Button>
            <Button onClick={handleCreateWidget}>
              Create Widget
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="My Testimonial Widget"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="appearance">
                <TabsList className="w-full">
                  <TabsTrigger value="appearance" className="flex-1">
                    Appearance
                  </TabsTrigger>
                  <TabsTrigger value="display" className="flex-1">
                    Display
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="appearance" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Theme</Label>
                      <Select
                        value={customization.theme}
                        onValueChange={(value: WidgetCustomization['theme']) =>
                          setCustomization({ ...customization, theme: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customizationOptions.colors.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color.charAt(0).toUpperCase() + color.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="display" className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-ratings"
                        checked={customization.showRatings}
                        onChange={(e) =>
                          setCustomization({
                            ...customization,
                            showRatings: e.target.checked,
                          })
                        }
                      />
                      <Label htmlFor="show-ratings">Show Ratings</Label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {!createdWidgetId && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <WidgetPreview
                    template={selectedTemplate}
                    customization={customization}
                    testimonialIds={selectedTestimonialIds}
                  />
                </ErrorBoundary>
              </CardContent>
            </Card>
          )}
        </div>

        {showPricing && (
          <PricingDialog
            isOpen={showPricing}
            onClose={() => setShowPricing(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import TestimonialSelection from "../components/testimonials/TestimonialSelection";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "../hooks/use-toast";
import EmbedCode from "../components/widgets/EmbedCode";
import ErrorBoundary from "../components/testimonials/ErrorBoundary";
import WidgetPreview, { type WidgetCustomization } from "../components/testimonials/WidgetPreview";
import { createWidget } from "../lib/api";

const templates = [
  { id: "grid", name: "Grid Layout" },
  { id: "carousel", name: "Carousel" },
  { id: "list", name: "Vertical List" },
];

const customizationOptions = {
  colors: ["default", "light", "dark", "brand"] as const
};

export default function WidgetBuilder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [customization, setCustomization] = useState<WidgetCustomization>({
    theme: 'default',
    showRatings: true,
    brandColor: "#000000"
  });
  const [widgetName, setWidgetName] = useState("My Widget");
  const [createdWidgetId, setCreatedWidgetId] = useState<number | null>(null);
  const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<number[]>([]);

  const createWidgetMutation = useMutation({
    mutationFn: createWidget,
    onSuccess: (data) => {
      toast({
        title: "Widget created!",
        description: "Your widget has been created successfully.",
      });
      setCreatedWidgetId(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create widget",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    createWidgetMutation.mutate({
      name: widgetName,
      template: selectedTemplate,
      customization: {
        theme: customization.theme,
        showRatings: customization.showRatings,
        brandColor: customization.brandColor
      },
      testimonialIds: selectedTestimonialIds
    });
  };

  if (step === 'select') {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/widgets">
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Create Widget</h1>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <TestimonialSelection
            onComplete={(selectedIds) => {
              setSelectedTestimonialIds(selectedIds);
              setStep('configure');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
            <X className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Widget Builder</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Widget Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="widget-name">Widget Name</Label>
              <Input
                id="widget-name"
                value={widgetName}
                onChange={(e) => setWidgetName(e.target.value)}
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
                <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
                <TabsTrigger value="display" className="flex-1">Display</TabsTrigger>
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
                  {customization.theme === 'brand' && (
                    <div>
                      <Label>Brand Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customization.brandColor}
                          onChange={(e) =>
                            setCustomization({
                              ...customization,
                              brandColor: e.target.value,
                            })
                          }
                          className="w-12 h-12 p-1 rounded border"
                        />
                        <Input
                          value={customization.brandColor}
                          onChange={(e) =>
                            setCustomization({
                              ...customization,
                              brandColor: e.target.value,
                            })
                          }
                          placeholder="#000000"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  )}
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

        <Button
          onClick={handleSave}
          className="w-full"
          disabled={createWidgetMutation.isPending}
        >
          {createWidgetMutation.isPending ? "Saving..." : "Save Widget"}
        </Button>

        {createdWidgetId && (
          <Card>
            
            <CardContent>
              <EmbedCode widgetId={createdWidgetId} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

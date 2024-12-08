import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WidgetPreview from "../components/testimonials/WidgetPreview";
import EmbedCode from "../components/widgets/EmbedCode";
import { createWidget, upgradeToPreview } from "../lib/api";
import { initializeStripe } from "../lib/stripe";

const templates = [
  { id: "grid", name: "Grid Layout" },
  { id: "carousel", name: "Carousel" },
  { id: "list", name: "Vertical List" },
];

const customizationOptions = {
  colors: ["default", "light", "dark", "brand"],
  animations: ["fade", "slide", "none"],
  layouts: ["compact", "comfortable", "spacious"],
};

export default function WidgetBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [customization, setCustomization] = useState({
    theme: "default",
    animation: "fade",
    layout: "comfortable",
    showRatings: true,
    showImages: true,
  });
  const [widgetName, setWidgetName] = useState("My Widget");
  const [createdWidgetId, setCreatedWidgetId] = useState<number | null>(null);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch("/api/user");
      return response.json();
    },
  });

  const createWidgetMutation = useMutation({
    mutationFn: createWidget,
    onSuccess: (data) => {
      toast({
        title: "Widget created!",
        description: "Your widget has been created successfully.",
      });
      setCreatedWidgetId(data.id);
    },
  });

  const handleSave = async () => {
    if (!user?.isPremium && (customization.animation !== "none" || customization.layout !== "compact")) {
      toast({
        title: "Premium Feature",
        description: "Please upgrade to access advanced customization options.",
        variant: "destructive",
      });
      return;
    }

    createWidgetMutation.mutate({
      name: widgetName,
      template: selectedTemplate,
      customization,
    });
  };

  const handleUpgrade = async () => {
    try {
      const stripe = await initializeStripe();
      const { sessionId } = await upgradeToPreview();
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate upgrade process.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Widget Builder</h1>
        {!user?.isPremium && (
          <Button onClick={handleUpgrade} variant="premium" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            Upgrade to Premium
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
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
                  <TabsTrigger value="behavior" className="flex-1">Behavior</TabsTrigger>
                </TabsList>
                <TabsContent value="appearance" className="space-y-4">
                  <div>
                    <Label>Theme</Label>
                    <Select
                      value={customization.theme}
                      onValueChange={(value) =>
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

                  <div>
                    <Label>Layout</Label>
                    <Select
                      value={customization.layout}
                      onValueChange={(value) =>
                        setCustomization({ ...customization, layout: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customizationOptions.layouts.map((layout) => (
                          <SelectItem key={layout} value={layout}>
                            {layout.charAt(0).toUpperCase() + layout.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="behavior" className="space-y-4">
                  <div>
                    <Label>Animation</Label>
                    <Select
                      value={customization.animation}
                      onValueChange={(value) =>
                        setCustomization({ ...customization, animation: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customizationOptions.animations.map((animation) => (
                          <SelectItem key={animation} value={animation}>
                            {animation.charAt(0).toUpperCase() + animation.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            className="w-full"
            disabled={createWidgetMutation.isPending}
          >
            {createWidgetMutation.isPending ? "Saving..." : "Save Widget"}
          </Button>

          {createdWidgetId && (
            <div className="mt-6">
              <EmbedCode widgetId={createdWidgetId} />
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-8">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetPreview
                template={selectedTemplate}
                customization={customization}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "wouter";
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
import type { WidgetCustomization } from "../components/testimonials/WidgetPreview";
import { createWidget } from "../lib/api";

const templates = [
  { id: "grid", name: "Grid Layout" },
  { id: "carousel", name: "Carousel" },
  { id: "list", name: "Vertical List" },
];

const customizationOptions = {
  colors: ["default", "light", "dark", "brand"]
};

export default function WidgetBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [customization, setCustomization] = useState<WidgetCustomization>({
    theme: 'default',
    showRatings: true,
    showImages: true,
    brandColor: "#000000"
  });
  const [widgetName, setWidgetName] = useState("My Widget");
  const [createdWidgetId, setCreatedWidgetId] = useState<number | null>(null);

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
    createWidgetMutation.mutate({
      name: widgetName,
      template: selectedTemplate,
      customization,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/widgets" className="text-muted-foreground hover:text-foreground">
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Widget Builder</h1>
        </div>
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
                  <TabsTrigger value="display" className="flex-1">Display</TabsTrigger>
                </TabsList>
                <TabsContent value="appearance" className="space-y-4">
                  <div className="space-y-4">
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
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-images"
                        checked={customization.showImages}
                        onChange={(e) =>
                          setCustomization({
                            ...customization,
                            showImages: e.target.checked,
                          })
                        }
                      />
                      <Label htmlFor="show-images">Show Images</Label>
                    </div>
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
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
              </CardHeader>
              <CardContent>
                <EmbedCode widgetId={createdWidgetId} />
              </CardContent>
            </Card>
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
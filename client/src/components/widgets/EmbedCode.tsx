import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Code, Eye } from "lucide-react";

interface EmbedCodeProps {
  widgetId: number;
}

export default function EmbedCode({ widgetId }: EmbedCodeProps) {
  const [copied, setCopied] = useState(false);
  
  // Get the current origin, fallback to a default for development
  const origin = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000';
  
  const embedCode = `<div id="testimonial-widget" data-widget-id="${widgetId}"></div>
<script src="${origin}/widget.js"></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Your Widget</CardTitle>
        <CardDescription>
          Add your testimonials widget to any website in two simple steps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code">
              <Code className="h-4 w-4 mr-2" />
              Embed Code
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="space-y-4">
            <div className="relative">
              <Input
                readOnly
                value={embedCode}
                className="pr-24 font-mono text-sm h-auto py-2"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute right-1 top-1"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Instructions:</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Copy the embed code above</li>
                <li>Paste it into your website's HTML where you want the testimonials to appear</li>
                <li>The widget will automatically load and display your testimonials</li>
              </ol>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg p-4">
              <iframe
                src={`${origin}/embed/${widgetId}`}
                className="w-full min-h-[400px]"
                title="Widget Preview"
                loading="lazy"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This is how your widget will appear on your website. You can customize its appearance in the Widget Builder.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

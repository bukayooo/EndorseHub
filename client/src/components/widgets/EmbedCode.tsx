import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";

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
        <CardTitle>Embed Widget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <p className="text-sm text-muted-foreground">
          Copy this code and paste it where you want the widget to appear on your website.
        </p>
      </CardContent>
    </Card>
  );
}

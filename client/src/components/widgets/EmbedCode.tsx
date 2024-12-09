import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

interface EmbedCodeProps {
  widgetId: number;
}

export default function EmbedCode({ widgetId }: EmbedCodeProps) {
  const [copied, setCopied] = useState(false);
  
  // Get the current origin, fallback to a default for development
  const origin = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:5000';
  
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
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Embed Your Widget</h3>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </button>
        </div>
        
        <div className="relative">
          <pre className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Preview</h4>
          <div className="border rounded-md overflow-hidden bg-white">
            <iframe
              src={`${origin}/embed/${widgetId}`}
              className="w-full h-[400px] border-0"
              title="Widget Preview"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Add this code to any HTML page where you want to display your testimonials widget.</p>
        </div>
      </div>
    </Card>
  );
}

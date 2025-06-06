import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import ErrorBoundary from "@/components/testimonials/ErrorBoundary";
import { EmbedPreview } from "@/components/testimonials/WidgetPreview";

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
<script>
  (function() {
    console.log('[Widget Embed] Fetching widget data for ID:', ${widgetId});
    fetch('${origin}/api/widgets/${widgetId}/data')
      .then(response => response.json())
      .then(response => {
        console.log('[Widget Embed] Received response:', JSON.stringify(response, null, 2));
        if (!response.success || !response.data) {
          throw new Error('Invalid widget data response');
        }
        window.WIDGET_DATA = {
          testimonials: response.data.testimonials,
          template: response.data.template,
          customization: response.data.customization
        };
        console.log('[Widget Embed] Set window.WIDGET_DATA:', JSON.stringify(window.WIDGET_DATA, null, 2));
        const script = document.createElement('script');
        script.src = '${origin}/widget.js';
        document.body.appendChild(script);
      })
      .catch(error => {
        console.error('[Widget Embed] Error:', error);
      });
  })();
</script>`;

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
          <h3 className="text-lg font-medium">Embed Widget</h3>
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
            <div className="p-4">
              <ErrorBoundary>
                <EmbedPreview widgetId={widgetId} />
              </ErrorBoundary>
            </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Add this code to any HTML page where you want to display your testimonials widget.</p>
        </div>
      </div>
    </Card>
  );
}

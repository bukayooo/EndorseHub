import { useState } from "react";
import { Button } from "../ui/button";
import { Check, Copy } from "lucide-react";

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
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Embed Your Widget</h2>
        <p className="text-sm text-gray-600 mb-4">
          Copy and paste this code into your website where you want the testimonials to appear
        </p>
      </div>

      {/* Code Display */}
      <div className="relative mb-6">
        <pre className="bg-gray-50 p-4 rounded-lg font-mono text-sm overflow-x-auto border">
          {embedCode}
        </pre>
        <Button
          className="absolute right-2 top-2"
          size="sm"
          variant="outline"
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

      {/* Preview */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Live Preview</h3>
        <iframe
          src={`${origin}/embed/${widgetId}`}
          className="w-full min-h-[400px] border-0"
          title="Widget Preview"
          loading="lazy"
        />
      </div>
    </div>
  );
}
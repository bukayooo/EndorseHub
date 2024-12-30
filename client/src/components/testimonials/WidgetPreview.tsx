import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Testimonial } from "@/types/db";

export type WidgetTheme = 'light' | 'dark';

export interface WidgetCustomization {
  theme: WidgetTheme;
  showRatings: boolean;
}

interface WidgetPreviewProps {
  template: string;
  customization: WidgetCustomization;
  testimonialIds: number[];
}

interface EmbedPreviewProps {
  widgetId: number;
}

export function EmbedPreview({ widgetId }: EmbedPreviewProps) {
  const { data: widget } = useQuery({
    queryKey: ['widget', widgetId],
    queryFn: () => api.get(`/widgets/${widgetId}`).then(res => res.data),
  });

  if (!widget) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Loading widget preview...</p>
      </div>
    );
  }

  return (
    <WidgetPreview
      template={widget.template}
      customization={widget.customization}
      testimonialIds={widget.testimonial_ids || []}
    />
  );
}

export function WidgetPreview({ template, customization, testimonialIds }: WidgetPreviewProps) {
  const { data: testimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ['testimonials', testimonialIds],
    queryFn: () => api.get(`/testimonials/batch?ids=${testimonialIds.join(',')}`).then(res => res.data),
    enabled: testimonialIds.length > 0,
  });

  if (testimonials.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Select testimonials to preview</p>
      </div>
    );
  }

  return (
    <div className={`p-4 ${customization.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      {template === 'grid' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="p-4 border rounded">
              <p className="text-sm mb-2">{testimonial.content}</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{testimonial.author_name}</span>
                {customization.showRatings && testimonial.rating && (
                  <div className="flex">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : template === 'list' ? (
        <div className="space-y-4">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="p-4 border rounded">
              <p className="text-sm mb-2">{testimonial.content}</p>
              <div className="flex items-center justify-between">
                <span className="font-medium">{testimonial.author_name}</span>
                {customization.showRatings && testimonial.rating && (
                  <div className="flex">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <span key={i} className="text-yellow-400">★</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex space-x-4 p-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="flex-none w-80 p-4 border rounded">
                <p className="text-sm mb-2">{testimonial.content}</p>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{testimonial.author_name}</span>
                  {customization.showRatings && testimonial.rating && (
                    <div className="flex">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-400">★</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

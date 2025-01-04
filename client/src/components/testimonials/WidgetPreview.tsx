import type { Testimonial } from '@/types/db';

export type WidgetTheme = 'light' | 'dark';
export type WidgetLayout = 'grid' | 'list' | 'carousel';
export type WidgetCardStyle = 'minimal' | 'bordered' | 'shadowed';

export type WidgetCustomization = {
  theme: WidgetTheme;
  layout: WidgetLayout;
  showRatings: boolean;
  showDates: boolean;
  showSources: boolean;
  maxTestimonials: number;
  cardStyle: WidgetCardStyle;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
};

export type WidgetPreviewProps = {
  testimonials: Testimonial[];
  customization: WidgetCustomization;
};

export function WidgetPreview({ testimonials, customization }: WidgetPreviewProps) {
  const {
    theme,
    layout,
    showRatings,
    showDates,
    showSources,
    maxTestimonials,
    cardStyle,
    primaryColor,
    secondaryColor,
    fontFamily
  } = customization;

  const containerClasses = `
    w-full
    ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
    ${layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}
    ${layout === 'list' ? 'space-y-6' : ''}
    ${layout === 'carousel' ? 'flex overflow-x-auto space-x-6' : ''}
  `;

  const cardClasses = `
    ${cardStyle === 'minimal' ? '' : ''}
    ${cardStyle === 'bordered' ? 'border rounded-lg' : ''}
    ${cardStyle === 'shadowed' ? 'shadow-lg rounded-lg' : ''}
    ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
    p-6
    ${layout === 'carousel' ? 'min-w-[300px]' : ''}
  `;

  const displayedTestimonials = testimonials.slice(0, maxTestimonials);

  return (
    <div
      className={containerClasses}
      style={{ fontFamily }}
    >
      {displayedTestimonials.map((testimonial) => (
        <div key={testimonial.id} className={cardClasses}>
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <p className="text-lg font-medium" style={{ color: primaryColor }}>
                {testimonial.author_name}
              </p>
              {showSources && testimonial.source && (
                <p className="text-sm" style={{ color: secondaryColor }}>
                  {testimonial.source}
                </p>
              )}
              {showDates && (
                <p className="text-sm" style={{ color: secondaryColor }}>
                  {new Date(testimonial.created_at).toLocaleDateString()}
                </p>
              )}
              {showRatings && testimonial.rating && (
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
                        star <= testimonial.rating!
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 15.934l-6.18 3.254 1.18-6.892L.083 7.514l6.92-1.006L10 0l2.997 6.508 6.92 1.006-4.917 4.782 1.18 6.892z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="mt-4">{testimonial.content}</p>
        </div>
      ))}
    </div>
  );
}

export function EmbedPreview({ testimonials, customization }: WidgetPreviewProps) {
  return (
    <div className="w-full h-full">
      <div className="border rounded-lg p-4 bg-white">
        <WidgetPreview testimonials={testimonials} customization={customization} />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>This is how your widget will appear when embedded on your website.</p>
      </div>
    </div>
  );
}

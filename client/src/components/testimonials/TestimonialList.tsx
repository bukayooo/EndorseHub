import { useState } from 'react';
import type { Testimonial } from '@/types/db';

interface TestimonialListProps {
  testimonials: Testimonial[];
}

export function TestimonialList({ testimonials }: TestimonialListProps) {
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {testimonials.map((testimonial) => (
        <div
          key={testimonial.id}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          onClick={() => setSelectedTestimonial(testimonial)}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {testimonial.author_name}
              </h3>
              {testimonial.source && (
                <p className="text-sm text-gray-500">{testimonial.source}</p>
              )}
            </div>
            {testimonial.rating && (
              <div className="flex items-center">
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
          <p className="mt-4 text-gray-600">{testimonial.content}</p>
          <div className="mt-4 text-sm text-gray-500">
            {new Date(testimonial.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}

      {selectedTestimonial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTestimonial.author_name}
                </h2>
                {selectedTestimonial.source && (
                  <p className="text-sm text-gray-500">
                    {selectedTestimonial.source}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedTestimonial(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">{selectedTestimonial.content}</p>
            {selectedTestimonial.rating && (
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-6 h-6 ${
                      star <= selectedTestimonial.rating!
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
            <div className="text-sm text-gray-500">
              Added on {new Date(selectedTestimonial.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
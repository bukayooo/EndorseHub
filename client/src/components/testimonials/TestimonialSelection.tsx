import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Testimonial } from '@/types/db';

interface TestimonialSelectionProps {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

export function TestimonialSelection({
  selectedIds,
  onSelectionChange,
}: TestimonialSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: testimonials, isLoading } = useQuery<Testimonial[]>({
    queryKey: ['testimonials', debouncedQuery],
    queryFn: () => debouncedQuery 
      ? api.searchTestimonials(debouncedQuery)
      : api.getTestimonials(),
  });

  const handleToggleSelection = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700">
          Search Testimonials
        </label>
        <input
          type="text"
          id="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by author or content..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div>Loading testimonials...</div>
      ) : testimonials && testimonials.length > 0 ? (
        <div className="space-y-2">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50"
            >
              <input
                type="checkbox"
                id={`testimonial-${testimonial.id}`}
                checked={selectedIds.includes(testimonial.id)}
                onChange={() => handleToggleSelection(testimonial.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor={`testimonial-${testimonial.id}`}
                className="flex-1 cursor-pointer"
              >
                <div className="font-medium text-gray-900">
                  {testimonial.author_name}
                </div>
                <div className="text-sm text-gray-500">
                  {testimonial.content.length > 100
                    ? `${testimonial.content.substring(0, 100)}...`
                    : testimonial.content}
                </div>
                {testimonial.rating && (
                  <div className="flex items-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${
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
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No testimonials found.
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Widget, Testimonial } from '@/types/db';
import { WidgetPreview } from '@/components/testimonials/WidgetPreview';

type WidgetCustomization = {
  theme: 'light' | 'dark';
  layout: 'grid' | 'list' | 'carousel';
  showRatings: boolean;
  showDates: boolean;
  showSources: boolean;
  maxTestimonials: number;
  cardStyle: 'minimal' | 'bordered' | 'shadowed';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
};

const defaultCustomization: WidgetCustomization = {
  theme: 'light',
  layout: 'grid',
  showRatings: true,
  showDates: true,
  showSources: true,
  maxTestimonials: 6,
  cardStyle: 'bordered',
  primaryColor: '#3b82f6',
  secondaryColor: '#6b7280',
  fontFamily: 'Inter'
};

export function WidgetBuilder() {
  const [selectedTestimonials, setSelectedTestimonials] = useState<number[]>([]);
  const [customization, setCustomization] = useState<WidgetCustomization>(defaultCustomization);
  const [name, setName] = useState('My Widget');

  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: () => api.getTestimonials()
  });

  const handleSave = async () => {
    try {
      const widget: Omit<Widget, 'id' | 'user_id' | 'created_at'> = {
        name,
        template: 'default',
        customization,
        testimonial_ids: selectedTestimonials
      };

      await api.createWidget(widget);
      // TODO: Show success message and redirect
    } catch (error) {
      console.error('Failed to save widget:', error);
      // TODO: Show error message
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Widget Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900">Customization</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                Theme
              </label>
              <select
                id="theme"
                value={customization.theme}
                onChange={(e) => setCustomization({ ...customization, theme: e.target.value as 'light' | 'dark' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label htmlFor="layout" className="block text-sm font-medium text-gray-700">
                Layout
              </label>
              <select
                id="layout"
                value={customization.layout}
                onChange={(e) => setCustomization({ ...customization, layout: e.target.value as 'grid' | 'list' | 'carousel' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showRatings"
                checked={customization.showRatings}
                onChange={(e) => setCustomization({ ...customization, showRatings: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showRatings" className="ml-2 block text-sm text-gray-900">
                Show Ratings
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showDates"
                checked={customization.showDates}
                onChange={(e) => setCustomization({ ...customization, showDates: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showDates" className="ml-2 block text-sm text-gray-900">
                Show Dates
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showSources"
                checked={customization.showSources}
                onChange={(e) => setCustomization({ ...customization, showSources: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showSources" className="ml-2 block text-sm text-gray-900">
                Show Sources
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900">Selected Testimonials</h3>
          <div className="mt-4 space-y-2">
            {testimonials?.map((testimonial) => (
              <div key={testimonial.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`testimonial-${testimonial.id}`}
                  checked={selectedTestimonials.includes(testimonial.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTestimonials([...selectedTestimonials, testimonial.id]);
                    } else {
                      setSelectedTestimonials(selectedTestimonials.filter((id) => id !== testimonial.id));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`testimonial-${testimonial.id}`} className="ml-2 block text-sm text-gray-900">
                  {testimonial.author_name} - {testimonial.content.substring(0, 50)}...
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Widget
        </button>
      </div>

      <div className="sticky top-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
        <div className="border rounded-lg p-4 bg-white">
          <WidgetPreview
            testimonials={testimonials?.filter((t) => selectedTestimonials.includes(t.id)) || []}
            customization={customization}
          />
        </div>
      </div>
    </div>
  );
} 
import { useState } from "react";
import { api } from "@/lib/api";
import type { Testimonial } from "@/types/db";

interface AddTestimonialFormProps {
  onSuccess?: (testimonial: Testimonial) => void;
  onCancel?: () => void;
}

export function AddTestimonialForm({ onSuccess }: AddTestimonialFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const testimonial = await api.createTestimonial({
        author_name: authorName,
        content,
        rating,
        status: 'pending'
      });

      if (onSuccess) {
        onSuccess(testimonial);
      }

      // Reset form
      setAuthorName('');
      setContent('');
      setRating(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add testimonial');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="authorName" className="block text-sm font-medium text-gray-700">
          Author Name
        </label>
        <input
          type="text"
          id="authorName"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
          Rating (optional)
        </label>
        <select
          id="rating"
          value={rating || ''}
          onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} star{value !== 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Testimonial'}
        </button>
      </div>
    </form>
  );
} 
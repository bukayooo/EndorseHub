import { useState } from 'react';
import { api } from '@/lib/api';
import type { Testimonial } from '@/types/db';

interface ImportReviewsFormProps {
  onSuccess?: (testimonials: Testimonial[]) => void;
}

export function ImportReviewsForm({ onSuccess }: ImportReviewsFormProps) {
  const [source, setSource] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setError(null);

    try {
      const testimonials = await api.importTestimonials(source);
      if (onSuccess) {
        onSuccess(testimonials);
      }
      setSource('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import reviews');
    } finally {
      setIsImporting(false);
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
        <label htmlFor="source" className="block text-sm font-medium text-gray-700">
          Import Source
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="">Select a source</option>
          <option value="google">Google Reviews</option>
          <option value="trustpilot">Trustpilot</option>
          <option value="yelp">Yelp</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isImporting || !source}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isImporting ? 'Importing...' : 'Import Reviews'}
        </button>
      </div>
    </form>
  );
}

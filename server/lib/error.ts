export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const appErrors = {
  TESTIMONIAL_FETCH_ERROR: 'Failed to fetch testimonials',
  TESTIMONIAL_CREATE_ERROR: 'Failed to create testimonial',
  TESTIMONIAL_UPDATE_ERROR: 'Failed to update testimonial',
  TESTIMONIAL_DELETE_ERROR: 'Failed to delete testimonial',
  UNEXPECTED_ERROR: 'An unexpected error occurred'
} as const; 
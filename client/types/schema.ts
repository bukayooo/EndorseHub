import type { User, Testimonial, Widget } from '../../types/schema';

// Re-export the shared types
export type { User, Testimonial, Widget };

// Export client-specific types that extend the shared ones
export interface ClientUser extends User {
  isLoggedIn?: boolean;
}

export interface ClientTestimonial extends Testimonial {
  isSelected?: boolean;
}

export interface ClientWidget extends Widget {
  isEditing?: boolean;
}

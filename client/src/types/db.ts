import type { User, Testimonial, Widget } from "../../../db/schema";

export interface NewUser {
  email: string;
  password: string;
  username?: string;
}

export type { User, Testimonial, Widget }; 
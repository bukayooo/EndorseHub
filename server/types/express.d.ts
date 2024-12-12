import type { User } from '@db/schema';

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      isPremium: boolean | null;
      stripeCustomerId: string | null;
      createdAt: Date | null;
      marketingEmails: boolean | null;
      keepMeLoggedIn: boolean | null;
      username: string | null;
    }
    
    interface Request {
      user?: User;
      isAuthenticated(): this is { user: User };
      login(user: User, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
    }
  }
}

export {};

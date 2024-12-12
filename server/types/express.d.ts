import { User } from '@db/schema';

declare global {
  namespace Express {
    interface User extends User {}
    
    // Extend Request to include authenticated user
    interface Request {
      user?: User;
      isAuthenticated(): this is { user: User };
      login(user: User, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
    }
  }
}

export {};

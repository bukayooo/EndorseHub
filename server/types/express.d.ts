import type { User as DbUser } from "../../db/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      is_premium?: boolean | null;
      stripe_customer_id?: string | null;
      created_at?: Date | null;
      marketing_emails?: boolean | null;
      keep_me_logged_in?: boolean | null;
      username?: string | null;
    }

    interface Request {
      user?: User;
      isAuthenticated(): boolean;
      login(user: User | DbUser, done: (err: any) => void): void;
      logIn(user: User | DbUser, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
      logOut(done: (err: any) => void): void;
    }
  }
}

export {};

import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { findUserByEmail, findUserById, createUser, updateUser, deleteUser } from '../db';
import type { User, NewUser } from '../db/schema';

export const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    try {
      const user = await findUserByEmail(email);
      
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);

export async function register(userData: NewUser): Promise<User> {
  const existingUser = await findUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  return createUser({
    ...userData,
    password: hashedPassword,
  });
}

export async function login(email: string, password: string): Promise<User> {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return user;
}

export { findUserByEmail, findUserById, updateUser, deleteUser }; 
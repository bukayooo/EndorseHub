import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db } from "../db";
import { users } from "@db/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm/sql";
// Configure Passport's Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        if (!email || !password) {
            return done(new Error('Email and password are required'));
        }
        console.log('[Passport] Authenticating user:', { email });
        const result = await db
            .select()
            .from(users)
            .where(sql `LOWER(${users.email}) = LOWER(${email})`)
            .limit(1);
        const user = result[0];
        if (!user) {
            console.log('[Passport] User not found:', { email });
            return done(null, false, { message: 'Invalid email or password.' });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.log('[Passport] Invalid password:', { email });
            return done(null, false, { message: 'Invalid email or password.' });
        }
        // Remove password from user object before serializing
        const { password: _, ...userWithoutPassword } = user;
        console.log('[Passport] Authentication successful:', { userId: user.id });
        return done(null, userWithoutPassword);
    }
    catch (err) {
        console.error('[Passport] Authentication error:', err);
        return done(err);
    }
}));
// Serialize user for the session
passport.serializeUser((user, done) => {
    console.log('[Passport] Serializing user:', { userId: user.id });
    done(null, user.id);
});
// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        console.log('[Passport] Deserializing user:', { userId: id });
        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        if (!result[0]) {
            console.log('[Passport] User not found during deserialization:', { userId: id });
            return done(null, false);
        }
        // Remove password before returning
        const { password: _, ...userWithoutPassword } = result[0];
        console.log('[Passport] User deserialized successfully:', { userId: id });
        done(null, userWithoutPassword);
    }
    catch (err) {
        console.error('[Passport] Deserialization error:', err);
        done(err);
    }
});
// Helper functions
export async function findUserById(id) {
    const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
    return result[0] || null;
}
export async function findUserByEmail(email) {
    const result = await db
        .select()
        .from(users)
        .where(sql `LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);
    return result[0] || null;
}
export async function createUser(userData) {
    const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
    return user;
}
// Initialize Passport configuration
export function initializePassport() {
    console.log('[Auth] Initializing Passport configuration');
    return passport.initialize();
}
// Initialize Passport session handling
export function initializeSession() {
    console.log('[Auth] Initializing Passport session handling');
    return passport.session();
}

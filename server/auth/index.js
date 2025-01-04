import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { findUserByEmail, findUserById } from "../../db";
// Configure Passport's Local Strategy
export const localStrategy = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        console.log('[Passport] Authenticating user:', { email });
        const user = await findUserByEmail(email);
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
});
// Serialize user for the session
passport.serializeUser((user, done) => {
    console.log('[Passport] Serializing user:', { userId: user.id });
    done(null, user.id);
});
// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        console.log('[Passport] Deserializing user:', { userId: id });
        const user = await findUserById(id);
        if (!user) {
            console.log('[Passport] User not found during deserialization:', { userId: id });
            return done(null, false);
        }
        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;
        console.log('[Passport] User deserialized successfully:', { userId: id });
        done(null, userWithoutPassword);
    }
    catch (err) {
        console.error('[Passport] Deserialization error:', err);
        done(err);
    }
});
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

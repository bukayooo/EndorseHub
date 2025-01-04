import Stripe from 'stripe';
import { db, where, schema } from '../db';
const { users } = schema;
// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY');
}
// Price IDs for your products
const PRICES = {
    MONTHLY: process.env.STRIPE_TEST_PRICE_MONTHLY,
    YEARLY: process.env.STRIPE_TEST_PRICE_YEARLY,
};
// Validate price IDs
if (!PRICES.MONTHLY || !PRICES.YEARLY) {
    console.warn('Stripe price IDs not configured, checkout will not work:', {
        monthly: PRICES.MONTHLY ? 'configured' : 'missing',
        yearly: PRICES.YEARLY ? 'configured' : 'missing'
    });
}
// Define Stripe configuration
const STRIPE_CONFIG = {
    apiVersion: "2023-10-16",
    typescript: true,
    timeout: 10000,
};
// Initialize Stripe with proper typing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);
// Log initialization status (without exposing sensitive data)
console.log('Stripe initialized successfully:', {
    apiVersion: STRIPE_CONFIG.apiVersion,
    secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
    monthlyPriceId: PRICES.MONTHLY ? '✓' : '✗',
    yearlyPriceId: PRICES.YEARLY ? '✓' : '✗',
    webhookConfigured: process.env.STRIPE_WEBHOOK_SECRET ? '✓' : '✗'
});
export async function createCheckoutSession(userId, priceType = 'monthly') {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(where(users.id, userId))
            .limit(1);
        if (!user) {
            throw new Error('User not found');
        }
        const priceId = priceType === 'yearly' ? PRICES.YEARLY : PRICES.MONTHLY;
        console.log('Price IDs configuration:', {
            monthly: PRICES.MONTHLY || 'missing',
            yearly: PRICES.YEARLY || 'missing',
            requested: priceType,
            selectedPriceId: priceId
        });
        // Validate price ID
        if (!priceId) {
            throw new Error(`Price ID not found for ${priceType} subscription`);
        }
        // Get client URL from environment or use appropriate default
        const clientUrl = process.env.CLIENT_URL ||
            (process.env.REPL_ID // Check if running on Replit
                ? 'https://endorsehub.replit.app' // Use replit URL on Replit
                : 'http://localhost:5173'); // Use localhost otherwise
        // Create a checkout session
        console.log('Creating Stripe checkout session with config:', {
            priceId,
            userEmail: user.email,
            userId: user.id,
            successUrl: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${clientUrl}/dashboard?payment=cancelled`
        });
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/dashboard?payment=cancelled`,
            customer_email: user.email,
            metadata: {
                userId: user.id.toString(),
                priceType,
            },
            billing_address_collection: 'required',
            allow_promotion_codes: true,
            currency: 'usd',
        });
        console.log('Checkout session created:', {
            sessionId: session.id,
            url: session.url
        });
        return session;
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}
export async function handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = parseInt(session.metadata?.userId || '');
                if (userId) {
                    await db.update(users)
                        .set({
                        is_premium: true,
                        stripe_customer_id: session.customer
                    })
                        .where(where(users.id, userId));
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customer = subscription.customer;
                await db.update(users)
                    .set({ is_premium: false })
                    .where(where(users.stripe_customer_id, customer));
                break;
            }
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
}
export { stripe };

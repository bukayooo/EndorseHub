import { Router } from 'express';
import { schema } from '../../db';
import { stripe } from '../stripe';
const { users } = schema;
const router = Router();
router.post('/api/billing/create-checkout-session', async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.CLIENT_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/dashboard`,
            customer_email: req.user.email,
            metadata: {
                userId: req.user.id.toString()
            }
        });
        return res.json({
            success: true,
            data: {
                url: session.url
            }
        });
    }
    catch (error) {
        console.error('[Billing] Error creating checkout session:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
});
export default router;

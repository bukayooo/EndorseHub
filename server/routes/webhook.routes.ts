import { Router } from "express";
import { db } from "../../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export function setupWebhookRoutes(app: Router) {
  const router = Router();

  // Handle Stripe webhook
  router.post('/stripe-webhook', async (req, res) => {
    try {
      const event = req.body;

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = parseInt(session.metadata?.userId || '');
          
          if (userId) {
            await db.update(users)
              .set({ 
                is_premium: true,
                stripe_customer_id: session.customer as string 
              })
              .where(eq(users.id, userId));
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customer = subscription.customer as string;
          
          await db.update(users)
            .set({ is_premium: false })
            .where(eq(users.stripe_customer_id, customer));
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook error' });
    }
  });

  app.use('/webhooks', router);
  return router;
} 
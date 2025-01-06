import { Router } from "express";
import { db } from "../../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from '../middleware/auth';
export function setupUserRoutes(app) {
    const router = Router();
    // Get current user
    router.get('/', isAuthenticated, async (req, res) => {
        try {
            res.json({
                success: true,
                data: req.user
            });
        }
        catch (error) {
            console.error('Error getting user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user'
            });
        }
    });
    // Temporary endpoint to update premium status
    router.post('/update-premium', isAuthenticated, async (req, res) => {
        try {
            const [updatedUser] = await db.update(users)
                .set({ is_premium: true })
                .where(eq(users.id, req.user.id))
                .returning();
            res.json({
                success: true,
                data: updatedUser
            });
        }
        catch (error) {
            console.error('Error updating premium status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update premium status'
            });
        }
    });
    // Temporary endpoint to revert premium status
    router.post('/revert-premium', isAuthenticated, async (req, res) => {
        try {
            const [updatedUser] = await db.update(users)
                .set({ is_premium: false })
                .where(eq(users.id, req.user.id))
                .returning();
            res.json({
                success: true,
                data: updatedUser
            });
        }
        catch (error) {
            console.error('Error reverting premium status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to revert premium status'
            });
        }
    });
    app.use('/user', router);
    return router;
}

import { Router } from "express";
import { db } from "../../db";
import { users } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { isAuthenticated, requireAdmin } from '../middleware/auth';
import type { User } from "@db/schema";

export function setupAdminRoutes(app: Router) {
  const router = Router();

  // Get all users
  router.get('/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Admin] List request:', { requestingUser: req.user?.id });
      const allUsers = await db.select().from(users);
      res.json({
        success: true,
        data: allUsers
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }
  });

  // Search users by email
  router.get('/users/search', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Admin] Search request:', { email: req.query.email, requestingUser: req.user?.id });
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      const user = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`).limit(1);
      
      if (!user[0]) {
        console.log('[Admin] User not found:', { email });
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('[Admin] User found:', { userId: user[0].id });
      res.json({
        success: true,
        data: user[0]
      });
    } catch (error) {
      console.error('Error searching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search user'
      });
    }
  });

  // Get user by ID
  router.get('/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Admin] Get request:', { userId: req.params.id, requestingUser: req.user?.id });
      const userId = parseInt(req.params.id);
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user[0]) {
        console.log('[Admin] User not found:', { userId });
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('[Admin] User found:', { userId: user[0].id });
      res.json({
        success: true,
        data: user[0]
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      });
    }
  });

  // Update user
  router.patch('/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Admin] Update request:', { userId: req.params.id, updates: req.body, requestingUser: req.user?.id });
      const userId = parseInt(req.params.id);
      const updateData: Partial<User> = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.password;
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.is_admin; // Prevent changing admin status through this endpoint

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        console.log('[Admin] User not found:', { userId });
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('[Admin] User updated:', { userId: updatedUser.id });
      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  });

  // Delete user
  router.delete('/users/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Admin] Delete request:', { userId: req.params.id, requestingUser: req.user?.id });
      const userId = parseInt(req.params.id);
      
      // Prevent deleting your own admin account
      if (userId === req.user!.id) {
        console.log('[Admin] Cannot delete own account:', { userId });
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own admin account'
        });
      }

      await db.delete(users).where(eq(users.id, userId));

      console.log('[Admin] User deleted:', { userId });
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  });

  app.use('/admin', router);
  console.log('[Admin] Routes mounted at /admin');
  return router;
} 
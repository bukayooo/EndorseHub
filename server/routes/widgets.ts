import { Router } from 'express';
import { db, eq, desc } from '../db';
import { widgets } from '../db/schema';
import type { Widget, NewWidget } from '../db/schema';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all widgets for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userWidgets = await db
      .select()
      .from(widgets)
      .where(eq(widgets.userId, req.user.id))
      .orderBy(desc(widgets.createdAt));
    res.json({ data: userWidgets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new widget
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const widgetData: NewWidget = {
      ...req.body,
      userId: req.user.id,
    };
    const [newWidget] = await db
      .insert(widgets)
      .values(widgetData)
      .returning();
    res.json({ data: newWidget });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific widget
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.id);
    const [widget] = await db
      .select()
      .from(widgets)
      .where(eq(widgets.id, widgetId));
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    res.json({ data: widget });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a widget
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.id);
    const [updatedWidget] = await db
      .update(widgets)
      .set(req.body)
      .where(eq(widgets.id, widgetId))
      .returning();
    if (!updatedWidget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    res.json({ data: updatedWidget });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a widget
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.id);
    const [deletedWidget] = await db
      .delete(widgets)
      .where(eq(widgets.id, widgetId))
      .returning();
    if (!deletedWidget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    res.json({ data: deletedWidget });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 
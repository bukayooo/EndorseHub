import { Router } from 'express';
import { db, eq, desc } from '../db';
import { testimonials } from '../db/schema';
import type { Testimonial, NewTestimonial } from '../db/schema';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all testimonials for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userTestimonials = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.userId, req.user.id))
      .orderBy(desc(testimonials.createdAt));
    res.json({ data: userTestimonials });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new testimonial
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const testimonialData: NewTestimonial = {
      ...req.body,
      userId: req.user.id,
      status: 'pending',
      source: 'direct',
    };
    const [newTestimonial] = await db
      .insert(testimonials)
      .values(testimonialData)
      .returning();
    res.json({ data: newTestimonial });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Import testimonials from external source
router.post('/import', isAuthenticated, async (req, res) => {
  try {
    const { url } = req.body;
    // TODO: Implement testimonial import logic
    res.json({ data: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a testimonial
router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const testimonialId = parseInt(req.params.id);
    const [updatedTestimonial] = await db
      .update(testimonials)
      .set(req.body)
      .where(eq(testimonials.id, testimonialId))
      .returning();
    if (!updatedTestimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json({ data: updatedTestimonial });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a testimonial
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const testimonialId = parseInt(req.params.id);
    const [deletedTestimonial] = await db
      .delete(testimonials)
      .where(eq(testimonials.id, testimonialId))
      .returning();
    if (!deletedTestimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json({ data: deletedTestimonial });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 
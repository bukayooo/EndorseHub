import { Router } from 'express';
import passport from 'passport';
import { register, login } from '../auth/index';
import type { User, NewUser } from '../db/schema';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const userData = req.body as NewUser;
    const user = await register(userData);
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to login after registration' });
      }
      return res.json({ data: user });
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ data: req.user });
});

router.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ data: { success: true } });
  });
});

router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ data: req.user });
});

export default router; 
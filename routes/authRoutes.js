// routes/authRoutes.js
// Auth API: register, login, logout, and a simple /me check.

import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import User from '../models/User.js';
import { ensureAuthenticated, ensureAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// helper: never send passwordHash to the client
const safeUser = (user) => ({
  id: user._id,                // expose the id (Mongo _id)
  name: user.name,
  email: user.email,
  role: user.role,
  isAdmin: user.role === 'admin' || user.isAdmin === true, // convenience flag
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// POST /auth/register
// Body: { name, email, password }
// New signups are always "customer" (we seed an admin separately)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // basic field checks
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }

    // normalize email (lowercase + trim)
    const normalizedEmail = String(email).trim().toLowerCase();

    // must be unique
    const exists = await User.findOne({ email: normalizedEmail }).exec();
    if (exists) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // hash the password (bcrypt)
    const passwordHash = await bcrypt.hash(password, 10);

    // create user as a customer
    const newUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      user: safeUser(newUser),
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /auth/login
// Works with both JSON (Postman) and HTML form (login page)
router.post('/login', (req, res, next) => {
  const isFormPost = req.is('application/x-www-form-urlencoded');

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return isFormPost
        ? res.redirect('/login?error=1') // show alert on the login page
        : res.status(500).json({ error: 'Login failed.' });
    }

    if (!user) {
      // wrong credentials
      return isFormPost
        ? res.redirect('/login?error=1')
        : res.status(401).json({ error: info?.message || 'Invalid credentials.' });
    }

    // establish the session
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('Session error:', loginErr);
        return isFormPost
          ? res.redirect('/login?error=1')
          : res.status(500).json({ error: 'Could not establish session.' });
      }

      // if it was a form login, redirect by role
      const isAdmin = user.role === 'admin' || user.isAdmin === true;
      if (isFormPost) {
        return res.redirect(isAdmin ? '/admin' : '/my-orders');
      }

      // JSON login (Postman) → return user info
      return res.json({
        message: 'Login successful.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// GET /auth/logout
// Browser: redirect to home. Postman (Accept: application/json): return JSON.
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      const wantsJSON = req.get('accept')?.includes('application/json');
      return wantsJSON
        ? res.status(500).json({ error: 'Logout failed.' })
        : res.redirect('/login?error=1');
    }

    // kill the session + cookie
    req.session?.destroy(() => {
      res.clearCookie('connect.sid');

      const wantsJSON = req.get('accept')?.includes('application/json');
      if (wantsJSON) return res.json({ message: 'Logged out successfully.' });

      // normal browser flow → go to home
      return res.redirect('/');
    });
  });
});

// GET /auth/me
// Quick "am I logged in?" check for Postman or client code
router.get('/me', (req, res) => {
  const ok = typeof req.isAuthenticated === 'function' && req.isAuthenticated();
  if (!ok) return res.status(401).json({ authenticated: false });
  return res.json({ authenticated: true, user: safeUser(req.user) });
});

router.get('/secure-ping', ensureAuthenticated, (req, res) => {
  res.json({ ok: true, user: safeUser(req.user) });
});

router.get('/admin-ping', ensureAdmin, (req, res) => {
  res.json({ ok: true });
});

export default router;


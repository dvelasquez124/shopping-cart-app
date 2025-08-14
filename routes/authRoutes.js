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
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isAdmin: user.role === 'admin' || user.isAdmin === true, 
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// POST /auth/register
// Body: { name, email, password }
// NOTE: new signups are always customers (we seed the admin)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // basic checks
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // unique email
    const exists = await User.findOne({ email: normalizedEmail }).exec();
    if (exists) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // hash password
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
// supports: JSON (Postman) and HTML form (login page)
router.post('/login', (req, res, next) => {
    const isFormPost = req.is('application/x-www-form-urlencoded');
  
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Login error:', err);
        return isFormPost
          ? res.redirect('/login?error=1')
          : res.status(500).json({ error: 'Login failed.' });
      }
      if (!user) {
        // wrong creds
        return isFormPost
          ? res.redirect('/login?error=1')
          : res.status(401).json({ error: info?.message || 'Invalid credentials.' });
      }
  
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Session error:', loginErr);
          return isFormPost
            ? res.redirect('/login?error=1')
            : res.status(500).json({ error: 'Could not establish session.' });
        }
  
        // decide where to go for the form flow
        const isAdmin = user.role === 'admin' || user.isAdmin === true;
        if (isFormPost) {
          return res.redirect(isAdmin ? '/admin' : '/my-orders');
        }
  
        // JSON flow (Postman)
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
// browser: redirect to home
// Postman (Accept: application/json): return JSON
router.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        // if the browser posted a form, send them back to login with error
        const wantsJSON = req.get('accept')?.includes('application/json');
        return wantsJSON
          ? res.status(500).json({ error: 'Logout failed.' })
          : res.redirect('/login?error=1');
      }
      req.session?.destroy(() => {
        res.clearCookie('connect.sid');
  
        const wantsJSON = req.get('accept')?.includes('application/json');
        if (wantsJSON) return res.json({ message: 'Logged out successfully.' });
  
        // normal browser flow -> go to home
        return res.redirect('/');
      });
    });
  });
  

// GET /auth/me
// quick “am I logged in?”
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

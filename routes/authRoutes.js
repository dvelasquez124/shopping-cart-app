// routes/authRoutes.js
// Auth endpoints: register, login, logout ( + a handy /me for testing)

import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import User from '../models/User.js';
import { ensureAuthenticated, ensureAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Small helper: never leak passwordHash back to the client
const safeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// POST /auth/register
// Body: { name, email, password, role? }
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role = 'customer' } = req.body;
        
        // Basic validations for a clean submission
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Enforce unique email
        const existing = await User.findOne({ email: normalizedEmail }).exec();
        if (existing) {
            return res.status(409).json({ error: 'An account with that email already exists.' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({ 
            name,
            email: normalizedEmail, 
            passwordHash: hashedPassword, 
            role, // 'customer' or admin
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
// Body: { email, password }
router.post('/login', (req, res, next) => {
    // Use a custom callback so we can send clean JSON messages
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Login failed' });
        }
        if (!user) {
            // info?.message comes from the strategy ("Incorrect password.")
            return res.status(400).json({ error: info?.message || 'Invalid credentials.' });
        }

        // Establish the session
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('Session error:', loginErr);
                return res.status(500).json({ error: 'Could not establish session.' });
            }
            return res.json({
                message: 'Login successful.',
                user: safeUser(user),
            });
        });
    }) (req, res, next);
});

// GET /auth/logout
router.get('/logout', (req, res) => {
    // Passport 0.6+ requires a callback
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed.' })
        }
        // Destroy the session cookie for good measure
        req.session?.destroy(() => {
            res.clearCookie('connect.sid'); // name used by express-session
            return res.json({ message: 'Logged out successfully.' });
        });
    });
});

// GET /auth/me (quick sanity check: am I logged in?)
router.get('/me', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: safeUser(req.user) });
});

// quick sanity checks
router.get('/secure-ping', ensureAuthenticated, (req, res) => {
    res.json({ ok: true, user: safeUser(req.user) });
});

router.get('/admin-ping', ensureAdmin, (req, res) => {
    res.json({ ok: true });
});

export default router;
// routes/customerRoutes.js
// Admin-only routes for managing customers and viewing their orders

import express from 'express';
import mongoose from 'mongoose';
import { ensureAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Order from '../models/Order.js'

const router = express.Router();

/**
 * GET /api/customers
 * @desc List all users (basic fields only)
 * @access Admin
 */
router.get('/', ensureAdmin, async (req, res) => {
    try {
        // only selecting fields that we want to appear in the response
        const users = await User.find({}, 'name email role createdAt')
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        // Normalize Mongo _id -> id (string) for cleaner API output
        const list = users.map(u => ({
            id: String(u._id),
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt
        }));

        return res.json({
            count: list.length,
            users: list
        });
    } catch (err) {
        console.error('List customers error:', err);
        return res.status(500).json({ error: 'Failed to list customers.' });

    }
});

/**
 * GET /api/customers/:id/orders
 * @desc All orders for a specific user (by id)
 * @access Admin
 */
router.get('/:id/orders', ensureAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectID early to avoid CastError
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid user id: ${id}` });
        }
        // Make sure the user exists
        const user = await User.findById(id, 'name email role').lean().exec();
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Get orders for that user (most recent first)
        const orders = await Order.find({ user: id })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        // Return both user (header info) and their orders
        return res.json({ user, count: orders.length, orders });
    } catch (err) {
        console.error('Customer orders error:', err);
        return res.status(500).json({ error: 'Failed to load customer orders.' });
    }
});


export default router;
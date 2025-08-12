import express from 'express';
import mongoose from 'mongoose';
import { ensureAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Order from '../models/Order.js'

const router = express.Router();

// GET /api/customers --> list all users (admin)
router.get('/', ensureAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'name email role createdAt')
            .sort({ createdAt: -1 })
            .lean();

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
        return res.status(500).json({ error: 'Failed to list customers', detail: err.message });

    }
});

// GET /api/customers/:id/orders --> orders for a given user (admin)
router.get('/:id/orders', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid user id: ${id}' });
    }
    const orders = await Order.find({ user: id })
    .sort({ createdAt: -1 })
    .lean();
    return res.json({ count: orders.length, orders });
});

export default router;
// routes/customerRoutes.js
// Admin endpoints: list customers and view a customer's orders.

import express from 'express';
import mongoose from 'mongoose';
import { ensureAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

const router = express.Router();

/**
 * GET /api/customers  (admin)
 * Default: show customers only (role === 'customer') to match the UI.
 * Tip: add ?includeAdmins=1 to include admin accounts too.
 */
router.get('/', ensureAdmin, async (req, res) => {
  try {
    // toggle via query param if you want admins included
    const includeAdmins =
      req.query.includeAdmins === '1' || req.query.includeAdmins === 'true';

    // default filter = customers only
    const filter = includeAdmins ? {} : { role: 'customer' };

    // only pick basic fields (never send passwordHash)
    const users = await User.find(filter, 'name email role createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // normalize _id → id for cleaner API output
    const list = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return res.json({ count: list.length, users: list });
  } catch (err) {
    console.error('list customers error:', err);
    return res.status(500).json({ error: 'Failed to list customers.' });
  }
});

/**
 * GET /api/customers/:id/orders  (admin)
 * Returns the selected user + all of their orders (newest first).
 */
router.get('/:id/orders', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // quick format check to avoid CastError
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid user id: ${id}` });
    }

    // make sure the user exists (basic fields only)
    const user = await User.findById(id, 'name email role').lean().exec();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // load orders for that user (and show product name/price in each item)
    const orders = await Order.find({ user: id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.product', select: 'name price' })
      .select('-__v')
      .lean({ virtuals: true })
      .exec();

    return res.json({
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error('customer orders error:', err);
    return res.status(500).json({ error: 'Failed to load customer orders.' });
  }
});

export default router;


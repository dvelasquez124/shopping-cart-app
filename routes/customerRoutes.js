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
 * Returns basic info for all users (no passwords).
 * NOTE: This includes admins too; the UI can filter if needed.
 */
router.get('/', ensureAdmin, async (req, res) => {
  try {
    // only pick the fields we want to show
    const users = await User.find({}, 'name email role createdAt')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // normalize _id -> id (string) for cleaner API output
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
      .select('-__v')                 // versionKey is off, but keeping this is harmless
      .lean({ virtuals: true })       // include virtual "id" if defined on the model
      .exec();

    // send back a simple header + list
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

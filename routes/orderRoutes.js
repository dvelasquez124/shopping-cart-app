// routes/orderRoutes.js
import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ensureAdmin, ensureAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/orders
 * Body: { items: [{ productId, quantity }, ...] }
 * Requires login
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required.' });
    }
    for (const it of items) {
      if (!it?.productId || !Number.isInteger(it?.quantity) || it.quantity < 1) {
        return res.status(400).json({ error: 'Each item needs productId and quantity >= 1.' });
      }
    }

    const ids = items.map(i => String(i.productId));
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'Duplicate productIds in items.' });
    }

    // validate ObjectId format early (nicer 400s)
    for (const pid of ids) {
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        return res.status(400).json({ error: `Invalid productId: ${pid}` });
      }
    }

    const products = await Product.find({ _id: { $in: ids } }).exec();
    if (products.length !== items.length) {
      return res.status(400).json({ error: 'One or more productIds are invalid.' });
    }

    const orderItems = [];
    for (const it of items) {
      const prod = products.find(p => String(p._id) === String(it.productId));
      if (!prod) return res.status(400).json({ error: `Product not found: ${it.productId}` });

      if (typeof prod.quantityInStock !== 'number' || prod.quantityInStock < it.quantity) {
        return res
          .status(400)
          .json({ error: `Not enough stock for ${prod.name}. Available: ${prod.quantityInStock}` });
      }

      orderItems.push({
        product: prod._id,
        name: prod.name,
        priceAtPurchase: prod.price,
        quantity: it.quantity,
      });
    }

    const subtotal = orderItems.reduce(
      (acc, item) => acc + item.priceAtPurchase * item.quantity,
      0
    );

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      subtotal,
    });

    // decrement stock
    for (const it of items) {
      await Product.updateOne(
        { _id: it.productId, quantityInStock: { $gte: it.quantity } },
        { $inc: { quantityInStock: -it.quantity } }
      ).exec();
    }

    return res.status(201).json({
      message: 'Order placed.',
      order: {
        id: order._id,
        user: String(order.user),
        items: order.items,
        subtotal: order.subtotal,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (err) {
    console.error('Place order error:', err);
    return res.status(500).json({ error: 'Failed to place order.' });
  }
});

/**
 * GET /api/orders/mine
 * Requires login
 */
router.get('/mine', ensureAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return res.json({ count: orders.length, orders });
  } catch (err) {
    console.error('Get my orders error:', err);
    return res.status(500).json({ error: 'Failed to load your orders.' });
  }
});

/**
 * PUT /api/orders/:id
 * Update status (admins only)
 */
router.put('/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ALLOWED = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid order id: ${id}` });
    }
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED.join(', ')}` });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Order not found' });
    return res.json({ message: 'Order updated.', order: updated });
  } catch (err) {
    console.error('Update order error:', err);
    return res.status(500).json({ error: 'Failed to update order.' });
  }
});

// DELETE /api/orders/:id --> delete and restock (admin only)
router.delete('/:id', ensureAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid order id: ${id}`});
        }

        const order = await Order.findById(id).lean();
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Restock each product from the order
        if (Array.isArray(order.items) && order.items.length) {
            const ops = order.items.map(item => ({
                updateOne: {
                    filter: { _id: item.product },
                    update: { $inc: { quantityInStock: item.quantity } }
                }
            }));
            await Product.bulkWrite(ops);
        }
        await Order.deleteOne({ _id: id });
        return res.json({ message: "Order deleted and items restocked." });
    } catch (err) {
        console.error('Delete order error:', err);
        return res.status(500).json({ error: 'Failed to delete order.' });
    }
})
export default router;

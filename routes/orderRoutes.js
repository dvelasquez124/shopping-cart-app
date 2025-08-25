// routes/orderRoutes.js
// Orders API: place order, see my orders, and admin update/delete.

import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ensureAdmin, ensureAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// helper: check items array format
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'items must be a non-empty array' };
  }
  const ids = [];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const productId = String(items[i]?.productId || '').trim();
    const quantity = Number(items[i]?.quantity);
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return { error: `items[${i}].productId is invalid` };
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: `items[${i}].quantity must be an integer >= 1` };
    }
    ids.push(productId);
    out.push({ productId, quantity });
  }
  if (new Set(ids).size !== ids.length) return { error: 'duplicate productIds not allowed' };
  return { items: out, ids };
}

// POST /api/orders  (must be logged in)
// - validate input
// - make sure stock is enough (no backorders)
// - subtract stock and create order in a transaction (all-or-nothing)
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { items: raw } = req.body;
    const check = normalizeItems(raw);
    if (check.error) return res.status(400).json({ error: check.error });

    const { items, ids } = check;

    // load products we’re buying
    const products = await Product.find({ _id: { $in: ids } })
      .select('name price quantityInStock')
      .lean()
      .exec();
    if (products.length !== items.length) {
      return res.status(400).json({ error: 'one or more productIds do not exist' });
    }

    // quick lookup by id
    const byId = new Map(products.map(p => [String(p._id), p]));

    // build order lines + subtotal, and check stock
    const orderItems = [];
    let subtotal = 0;
    for (const it of items) {
      const p = byId.get(it.productId);
      if (!p) return res.status(400).json({ error: `product not found: ${it.productId}` });
      if (p.quantityInStock < it.quantity) {
        return res.status(400).json({
          error: `not enough stock for ${p.name} (have ${p.quantityInStock})`,
        });
      }
      subtotal += p.price * it.quantity;
      orderItems.push({
        product: it.productId,      // ref to Product
        name: p.name,             
        priceAtPurchase: p.price,   // snapshot
        quantity: it.quantity,
      });
    }

    // do stock updates + order create together (transaction)
    const session = await mongoose.startSession();
    let createdId = null;

    try {
      await session.withTransaction(async () => {
        // subtract stock, but only if enough remains (race-safe)
        for (const it of items) {
          const resu = await Product.updateOne(
            { _id: it.productId, quantityInStock: { $gte: it.quantity } },
            { $inc: { quantityInStock: -it.quantity } },
            { session }
          );
          if (resu.modifiedCount === 0) {
            throw new Error('stock changed while ordering, please try again');
          }
        }

        // create the order
        const [doc] = await Order.create(
          [{ user: req.user._id, items: orderItems, subtotal }],
          { session }
        );
        createdId = doc._id;
      });
    } finally {
      session.endSession();
    }

    // return the saved order (cleaned up)
    const order = await Order.findById(createdId)
      .populate({ path: 'items.product', select: 'name price' })
      .select('-__v')
      .lean({ virtuals: true })
      .exec();

    return res.status(201).json({ message: 'order placed', order });
  } catch (err) {
    console.error('place order error:', err);
    return res.status(400).json({ error: err.message || 'failed to place order' });
  }
});

// GET /api/orders/mine  (must be logged in)
// - get the current user’s orders (newest first)
router.get('/mine', ensureAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.product', select: 'name price' })
      .select('-__v')
      .lean({ virtuals: true })
      .exec();

    return res.json({ count: orders.length, orders });
  } catch (err) {
    console.error('get my orders error:', err);
    return res.status(500).json({ error: 'failed to load your orders' });
  }
});

// PUT /api/orders/:id  (admin)
// - update status only
router.put('/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const OK = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `invalid order id: ${id}` });
    }
    if (!OK.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${OK.join(', ')}` });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .select('-__v')
      .lean({ virtuals: true })
      .exec();

    if (!order) return res.status(404).json({ error: 'order not found' });
    return res.json({ message: 'order updated', order });
  } catch (err) {
    console.error('update order error:', err);
    return res.status(500).json({ error: 'failed to update order' });
  }
});

// DELETE /api/orders/:id --> delete and restock (admin only)
router.delete('/:id', ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: `Invalid order id: ${id}` });
      }
  
      // get the order so we know what to restock
      const order = await Order.findById(id).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
  
      let restocked = [];
  
      // bump stock back for each item in the order
      if (Array.isArray(order.items) && order.items.length) {
        const ops = order.items.map((item) => ({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { quantityInStock: item.quantity } },
          },
        }));
        await Product.bulkWrite(ops);
  
        // fetch updated products so we can show the new counts
        const ids = order.items.map((i) => i.product);
        const updated = await Product.find({ _id: { $in: ids } })
          .select('name quantityInStock')
          .lean();
  
        restocked = updated.map((p) => ({
          id: String(p._id),
          name: p.name,
          quantityInStock: p.quantityInStock,
        }));
      }
  
      // finally remove the order
      await Order.deleteOne({ _id: id });
  
      return res.json({
        message: 'Order deleted and items restocked.',
        restocked, // quick confirmation of new stock levels
      });
    } catch (err) {
      console.error('Delete order error:', err);
      return res.status(500).json({ error: 'Failed to delete order.' });
    }
  });

export default router;

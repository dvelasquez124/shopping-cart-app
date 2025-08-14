// routes/productRoutes.js
// Product API: public product endpoints + admin CRUD.

import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { ensureAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// helper: escape special chars so our regex doesn't break
const escapeForRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products (public)
// list all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({})
      .select('-__v')            // hide __v
      .lean({ virtuals: true }); // include virtual "id" if present
    return res.json(products);
  } catch (error) {
    console.error('get products error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/search?name=... (public)
// search by name or description (case-insensitive)
router.get('/search', async (req, res) => {
  try {
    const term = String(req.query.name || '').trim();
    if (!term) return res.json([]); // no term → empty list

    const rx = new RegExp(escapeForRegex(term), 'i');

    const products = await Product.find({ $or: [{ name: rx }, { description: rx }] })
      .select('-__v')
      .lean({ virtuals: true });

    return res.json(products);
  } catch (error) {
    console.error('search products error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/products/range?min=&max= (public)
// filter by price range; auto-swap if min > max
router.get('/range', async (req, res) => {
  try {
    let min = Number.isFinite(+req.query.min) ? +req.query.min : 0;
    let max = Number.isFinite(+req.query.max) ? +req.query.max : Number.MAX_SAFE_INTEGER;
    if (min > max) [min, max] = [max, min];

    const products = await Product.find({ price: { $gte: min, $lte: max } })
      .select('-__v')
      .lean({ virtuals: true });

    return res.json(products);
  } catch (error) {
    console.error('range products error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ----------------------------- Admin-only CRUD ----------------------------- */

// POST /api/products (admin)
// create a product
router.post('/', ensureAdmin, async (req, res) => {
  try {
    const { name, description = '', price, quantityInStock } = req.body;

    // quick input checks
    if (!name || typeof price !== 'number' || typeof quantityInStock !== 'number') {
      return res.status(400).json({
        error: 'name, price (number), and quantityInStock (number) are required.',
      });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number.' });
    }
    if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
      return res.status(400).json({ error: 'quantityInStock must be an integer >= 0.' });
    }

    const doc = await Product.create({ name, description, price, quantityInStock });

    // send back a clean object (no __v, include virtuals)
    const product = doc.toObject({ virtuals: true });
    delete product.__v;

    return res.status(201).json({ message: 'Product created.', product });
  } catch (err) {
    console.error('create product error:', err);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
});

// PUT /api/products/:id (admin)
// update allowed fields only
router.put('/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid product id: ${id}` });
    }

    const allow = ['name', 'description', 'price', 'quantityInStock'];
    const updates = {};
    for (const k of allow) if (k in req.body) updates[k] = req.body[k];

    if ('price' in updates) {
      if (typeof updates.price !== 'number' || !Number.isFinite(updates.price) || updates.price < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number.' });
      }
    }
    if ('quantityInStock' in updates) {
      if (!Number.isInteger(updates.quantityInStock) || updates.quantityInStock < 0) {
        return res.status(400).json({ error: 'quantityInStock must be an integer >= 0.' });
      }
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .select('-__v')
      .lean({ virtuals: true });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    return res.json({ message: 'Product updated.', product });
  } catch (err) {
    console.error('update product error:', err);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id (admin)
// delete a product
router.delete('/:id', ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid product id: ${id}` });
    }

    const deleted = await Product.findByIdAndDelete(id)
      .select('-__v')
      .lean({ virtuals: true });

    if (!deleted) return res.status(404).json({ error: 'Product not found.' });

    return res.json({ message: 'Product deleted.', product: deleted });
  } catch (err) {
    console.error('delete product error:', err);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
});

export default router;

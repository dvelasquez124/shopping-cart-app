// routes/productRoutes.js
// This file contains all public routes for viewing products.
// These routes do not require authentication (per the rubric).

import express from 'express';
import Product from '../models/Product.js';
import { ensureAdmin } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose'; // for ObjectId validation

const router = express.Router();

/** 
 * @desc Get all products
 * @route GET /api/products
 * @access Public
 */

router.get('/', async(req, res) => {
    try {
        // Fetch all products from the database
        const products = await Product.find({});
        res.json(products); // Return as JSON // Send the list of products as JSON
    } catch (error) {
        console.error('Error fetching products: ', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @desc Search products by name or description
 * @route GET /api/products/search?name=...
 * @access Public
 */
router.get('/search', async (req, res) => {
    try {
        const { name } = req.query;

        // If no search term is provided, return a 400 error
        if (!name) {
            return res.status(400),json({ message: 'Please provide a search term' });
        }

        // Find products where name or description contains the search term (case-insensitive)
        const products = await Product.find({
            $or: [
                { name: { $regex: name, $options: 'i' } }, // 'i' = case-insensitive
                { description: { $regex: name, $options:'i' } }
            ]
        });

        res.json(products);
    } catch (error) {
        console.error('Error searching products: ', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @desc Get products in a price range
 * @route GET /api/products/range?min=xx&max=yy
 * @access Public
 */
router.get('/range', async (req, res) => {
    try {
        // If no min or max is provided, default to all prices
        const min = parseFloat(req.query.min) || 0;
        const max = parseFloat(req.query.max) || Number.MAX_SAFE_INTEGER;

        // Find products where price is between min and max
        const products = await Product.find({
            price: { $gte: min, $lte: max }
        });

        res.json(products);
    } catch (error) {
        console.error('Error fetching products by range: ', error);
        res.status(500).json({ message: 'Server error '});
    }
});

// -- Admin-only Product CRUD --

// POST /api/products [ADMIN] create product
router.post('/', ensureAdmin, async (req,res) => {
    try {
        const { name, description = '', price, quantityInStock } = req.body;

        if (!name || typeof price !== 'number' || typeof quantityInStock !== 'number') {
            return res.status(400).json({ error: 'name, price (number), and quantityInStock (number) are required.' })
        }
        if (price <  0 || !Number.isFinite(price)) {
            return res.status(400).json({ error: 'price must be a non-negative number.' });
        }
        if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
            return res.status(400).json({ error: 'quantityInStock must be an integer >= 0.'});
        }

        const product = await Product.create({ name, description, price, quantityInStock });
        return res.status(201).json({ message: 'Product created.', product });
    } catch (err) {
        console.error('Create product error:', err);
        return res.status(500).json({ error: 'Failed to create product.' });
    }
});

// PUT /api/products/:id [ADMIN] update product
router.put('/:id', ensureAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid product id: ${id}` });
        }

        // only allow specific fields 
        const allow = ['name', 'description', 'price', 'quanitityInStock'];
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

        const product = await Product.findByIdAndUpdate(id, updates, {new: true }).exec();
        if (!product) return res.status(404).json({ error: 'Product not found' });

        return res.json({ message: 'Product updated.', product });
    } catch (err) {
        console.error('Update product error:', err);
        return res.status(500).json({ error: 'Failed to update product.'});
    }
});

// DELETE /api/products/:id [ADMIN] delete product
router.delete('/:id', ensureAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid product id: ${id}`});
        }

        const deleted = await Product.findByIdAndDelete(id).exec();
        if (!deleted) return res.status(404).json({ error: 'Product not found.' });

        return res.json({ message: 'Product deleted.', product: deleted });
    } catch (err) {
        console.error('Delete product error:', err);
        return res.status(500).json({ error: 'Failed to delete product.' });
    }
})


export default router;
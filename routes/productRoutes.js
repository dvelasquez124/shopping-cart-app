// routes/productRoutes.js
// This file contains all public routes for viewing products.
// These routes do not require authentication (per the rubric).

import express from 'express';
import Product from '../models/Product.js';

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

export default router;
// routes/OrderRoutes.js
import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { ensureAuthenticated  } from '../middleware/authMiddleware.js';

const router = express.Router();

/** POST /api/orders
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
            if (!it?.productId || !Number.isInteger(it?.quantity) || it.quantity < 1)  {
                return res.status(400).json({ error: 'Each item needs productId and quantity >= 1.' });
            }
        }

        const ids = items.map(i => String(i.productId));
        if (new Set(ids).size != ids.length) {
            return res.status(400).json({ error: "Duplicate productIds in items" });
        }
        const products = await Product.find({ _id: { $in: ids } }).exec();
        if (products.length !== items.length) {
            return res.status(400).jsom({ error: 'One of more productIds are invalid.' });
        }
        const orderItems = [];
        for (const it of items) {
            const prod = products.find(p => String(p._id) === String(it.productId));
            if (!prod) return res.status(400).json({ error: 'Product not found: ${it.productId}' });
            if (prod.quantityInStock < it.quantity) {
                return res.status(400).json({ error: 'Not enough stock for ${prod.name}. Available: ${prod.quanitityInStock}' });
            }
            orderItems.push({
                product: prod._id,
                name: prod.name,
                priceAtPurchase: prod.price,
                quantity: it.quantity
            });
        }

        const subtotal = orderItems.reduce(
            (acc, item) => acc + item.priceAtPurchase * item.quantity,
            0
        );

        const order = await Order.create({
            user: req.user._id,
            items: orderItems,
            subtotal
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
                createdAt: order.createdAt
            }
        });
    } catch (err) {
        console.error('Place order error:', err);
        return res.status(500).json({ error: 'Failure to place order.' });
    }
});

/** GET /api/orders/mine
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
        console.error('Get my order error: ', err);
        return res.status(500).json({ error: 'Failed to load your order.' });
    }
});

export default router;
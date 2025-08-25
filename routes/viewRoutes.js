// routes/viewRoutes.js
// Simple server-rendered pages (Handlebars): home, login, my orders, and admin pages.

import { Router } from 'express';
import { ensureAuthenticated, ensureAdmin } from '../middleware/authMiddleware.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const router = Router();

/* ------------------------------ Public: Home ------------------------------ */
// GET / → list products on the home page
router.get('/', async (req, res) => {
  try {
    const raw = await Product.find({})
      .select('name description price quantityInStock')
      .lean({ virtuals: true });

    // small helpers for display
    const products = raw.map((p) => ({
      ...p,
      priceFmt: Number(p.price).toFixed(2),
      outOfStock: Number(p.quantityInStock) <= 0,
      stockLabel: `In stock: ${p.quantityInStock}`,
    }));

    res.render('home', {
      title: 'Home',
      products,
      hasProducts: products.length > 0,
      // note: auth flags are provided by res.locals in index.js (navbar)
    });
  } catch (err) {
    console.error('view / error:', err);
    res.status(500).send('Server error');
  }
});

/* ------------------------------ Public: Login ----------------------------- */
// GET /login → show login form (uses ?error=1 to show a small alert)
router.get('/login', (req, res) => {
  const showError = req.query?.error === '1';
  res.render('login', { title: 'Login', showError });
});

/* ---------------------- Customer: My Orders (requires auth) ---------------- */
// GET /my-orders → show current user's orders
router.get('/my-orders', ensureAuthenticated, async (req, res) => {
  // admins don't have a personal orders page → send them to /admin
  if (req.user.role === 'admin' || req.user.isAdmin === true) {
    return res.redirect('/admin');
  }

  try {
    const raw = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.product', select: 'name price' })
      .select('-__v')
      .lean({ virtuals: true });

    const orders = raw.map((o) => ({
      ...o,
      createdAtFmt: new Date(o.createdAt).toLocaleString(),
      subtotalFmt: Number(o.subtotal).toFixed(2),
    }));

    res.render('my-orders', {
      title: 'My Orders',
      orders,
      hasOrders: orders.length > 0,
    });
  } catch (err) {
    console.error('view /my-orders error:', err);
    res.status(500).send('Server error');
  }
});

/* -------------------------- Admin: Customers index ------------------------- */
// GET /admin → list all customers (basic info)
router.get('/admin', ensureAdmin, async (req, res) => {
  try {
    // only customers (hide admins in this list)
    const users = await User.find({ role: 'customer' }, 'name email role createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // convert _id to id for template links
    const list = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      createdAtFmt: new Date(u.createdAt).toLocaleString(),
    }));

    res.render('admin', {
      title: 'Admin',
      users: list,
      hasUsers: list.length > 0,
    });
  } catch (err) {
    console.error('view /admin error:', err);
    res.status(500).send('Server error');
  }
});

/* ------------------------ Admin: Single customer's orders ------------------ */
// GET /admin/customer/:id → show all orders for a specific user
router.get('/admin/customer/:id', ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, 'name email role').lean();
    if (!user) return res.status(404).send('User not found');

    const raw = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.product', select: 'name price' })
      .select('-__v')
      .lean({ virtuals: true });

    const orders = raw.map((o) => ({
      ...o,
      createdAtFmt: new Date(o.createdAt).toLocaleString(),
      subtotalFmt: Number(o.subtotal).toFixed(2),
    }));

    res.render('admin-customer', {
      title: `Orders — ${user.email}`,
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
      orders,
      hasOrders: orders.length > 0,
    });
  } catch (err) {
    console.error('view /admin/customer error:', err);
    res.status(500).send('Server error');
  }
});

/* ----------------------- Admin: Product management page -------------------- */
// GET /admin/products → list + simple CRUD form
router.get('/admin/products', ensureAdmin, async (req, res) => {
  try {
    const raw = await Product.find({})
      .sort({ createdAt: -1 })
      .select('name description price quantityInStock createdAt')
      .lean({ virtuals: true });

    const products = raw.map((p) => ({
      ...p,
      priceFmt: Number(p.price).toFixed(2),
      createdAtFmt: new Date(p.createdAt).toLocaleString(),
    }));

    res.render('admin-products', {
      title: 'Admin — Products',
      products,
      hasProducts: products.length > 0,
    });
  } catch (err) {
    console.error('view /admin/products error:', err);
    res.status(500).send('Server error');
  }
});

export default router;


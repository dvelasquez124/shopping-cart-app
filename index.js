/**
 * File: index.js
 * Purpose: App bootstrap (Express v5, ESM). Connects MongoDB, configures sessions + Passport,
 *          mounts REST routes, GraphQL Yoga, and Handlebars views.
 * Rubric Coverage: Server-side functionality, Persistence (Mongo/Mongoose), REST (public product endpoints),
 *                  GraphQL endpoints, PassportJS, Handlebars.
 * Testing Notes:
 *  - Postman: GET /api/products, /api/products/search?name=..., /api/products/range?min=&max=
 *  - GraphiQL: open /graphql and run products/searchProducts/productsInPriceRange
 *  - Browser: GET / (Home), /login, /my-orders, /admin, /admin/products
 */

// core libs
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';

// REST routers
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

// server-rendered pages (Handlebars)
import viewRoutes from './routes/viewRoutes.js';

// GraphQL Yoga (works well with Express v5)
import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';

// load passport strategy configuration (local strategy + serialize/deserialize)
import './config/passportConfig.js';

// read .env (MONGO_URI, SESSION_SECRET, PORT)
dotenv.config();

// spin up Express app
const app = express();

/* ----------------------------- Handlebars setup ---------------------------- */
// resolve __dirname (ESM)
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// register the Handlebars engine + a tiny helper
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  // helpers used in views (ex: select the current status in a <select>)
  helpers: {
    eq: (a, b) => String(a) === String(b),
  },
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

/* ------------------------------ MongoDB connect ---------------------------- */
// connect once at startup; MONGO_URI is from .env
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

/* ------------------------------ Session + Auth ----------------------------- */
// express-session stores the session id in a cookie (connect.sid)
// NOTE: set cookie.secure=true only when using HTTPS (like in production)
app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'superSecretSessionKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JS can’t read this cookie (more secure)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // secure: true, // uncomment in production (HTTPS)
    },
  })
);

// hook Passport into Express
app.use(passport.initialize());
app.use(passport.session());

// make auth info available to all views (navbar uses these)
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.isAuthenticated = !!req.user;
  res.locals.isAdmin =
    !!(req.user && (req.user.role === 'admin' || req.user.isAdmin === true));
  res.locals.showMyOrdersNav = !!(req.user && req.user.role === 'customer'); // only customers see "My Orders"
  next();
});

/* --------------------------- Body parsers (REST) --------------------------- */
// parse JSON bodies and simple HTML form posts
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* --------------------------------- GraphQL -------------------------------- */
// build schema from SDL + resolvers and mount at /graphql
const schema = createSchema({ typeDefs, resolvers });
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  graphiql: true, // built-in IDE for testing
});
app.use('/graphql', yoga);

/* --------------------------------- Routes --------------------------------- */
// Public product REST endpoints (plus admin CRUD)
app.use('/api/products', productRoutes);

// Auth (register, login, logout, me, sanity pings)
app.use('/auth', authRoutes);

// Orders (place order, my orders, admin update/delete)
app.use('/api/orders', orderRoutes);

// Admin: customers + a customer’s orders
app.use('/api/customers', customerRoutes);

// Handlebars pages: home, login, my orders, admin pages
app.use(viewRoutes);

/* ----------------------------- Simple error pages ------------------------- */
// 404 for unknown routes
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// generic 500 handler (plain text)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('500 Server Error');
});

/* --------------------------------- Server --------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

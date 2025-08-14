/**
 * File: index.js
 * Purpose: App bootstrap (Express v5, ESM). Connects MongoDB, configures sessions + Passport, mounts REST routes and GraphQL Yoga.
 * Rubric Coverage: Server-side functionality, Persistence (Mongo/Mongoose), REST (public product endpoints), GraphQL endpoints, PassportJS.
 * Testing Notes:
 *  - Postman: GET /api/products, /api/products/search?name=..., /api/products/range?min=&max=
 *  - GraphiQL: open /graphql and run products/searchProducts/productsInPriceRange
 *  - Browser: GET / shows the API status page for now (views added later)
 */

// Import Express, dotenv, mongoose, session, and passport
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import customerRoutes from './routes/customerRoutes.js';

import viewRoutes from './routes/viewRoutes.js';




// GraphQL Yoga
import { createYoga, createSchema } from 'graphql-yoga';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';


// Import routes
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import './config/passportConfig.js'; // load strategy
import orderRoutes from './routes/orderRoutes.js';

// Load environment variables
dotenv.config();

// Create the Express app 
const app = express();

// resolve __dirname
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up handlebars
app.engine('hbs', engine({ 
    extname: '.hbs', 
    defaultLayout: 'main', 
    // helpers for views
    helpers: {
        eq: (a, b) => String(a) === String(b), // used for <option selected>
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB using connection string in .env 
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Set up session middleware
app.use(session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'superSecretSessionKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // secure: true,
    },
}));

// Initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Expose auth state to views (used by Handlebars nav/login/logout)
app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    res.locals.isAuthenticated = !!req.user;
    res.locals.isAdmin = !!(req.user && (req.user.role === 'admin' || req.user.isAdmin === true));
    res.locals.showMyOrdersNav = !!(req.user && req.user.role === 'customer'); // only customers see my orders
    next();
});

// Middleware to parse incoming JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- GraphQL (Yoga) ---
// Build GraphQlSchema from our SDL + resolvers
const schema = createSchema({ typeDefs, resolvers });

// Create Yoga request handler
const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql', 
    graphiql: true,
});

// Mount it on Express (for built-in GraphiQL UI)
app.use('/graphql', yoga);


// REST routes
app.use('/api/products', productRoutes);

app.use('/auth', authRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/customers', customerRoutes);

app.use(viewRoutes);

/// 404 for unknown routes 
app.use((req, res) => {
    res.status(404).send('404 Not Found');
  });
  
  // Generic 500 handler 
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('500 Server Error');
  });
  

// Use environment variable or fallback to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Import Express, dotenv, mongoose, session, and passport
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';



// Import routes
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import './config/passportConfig.js'; // load strategy

// Load environment variables
dotenv.config();

// Create the Express app 
const app = express();

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
    secret: process.env.SESSION_SECRET || 'superSecretSessionKey',
    resave: false,
    saveUninitialized: false,
}));

// Initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Middleware to parse incoming JSON
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register product routes after app is defined
app.use('/api/products', productRoutes);

app.use('/auth', authRoutes);

// Sample homepage route
app.get('/', (req, res) => {
    res.send('Shopping Cart API is running!');
});

// Start the server
// Use enviroment variable or fallback to 3000
const PORT = process.env.PORT || 3000;

// // temp import
// import Product from './models/Product.js';

// // Test: create a dummy product (not saved yet)
// const testProduct = new Product({
//     name: 'Test Product',
//     description: 'Just for testing',
//     price: 9.99,
//     quantityInStock: 100
// })

// console.log('Product model is working:', testProduct)

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
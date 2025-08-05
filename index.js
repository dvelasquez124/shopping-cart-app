// Import Express and dotenv using ES6 syntax
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Connect to MongoDB using connection string in .env file
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Create the Express app 
const app = express();

// Use enviroment variable or fallback to 3000
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON
app.use(express.json());

// Sample route for the homepage
app.get('/', (req, res) => {
    res.send('Shopping Cart API is running!');
});

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
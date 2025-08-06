// Import Express and dotenv using ES6 syntax
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import productRoutes from './routes/productRoutes.js';



// Load environment variables
dotenv.config();

// Create the Express app 
const app = express();

// Connect to MongoDB using connection string in .env file
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});


// Middleware to parse incoming JSON
app.use(express.json());

// Register product routes after app is defined
app.use('/api/products', productRoutes);

// Sample route for the homepage
app.get('/', (req, res) => {
    res.send('Shopping Cart API is running!');
});

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
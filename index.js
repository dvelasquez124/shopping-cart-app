// Import Express and dotenv using ES6 syntax
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
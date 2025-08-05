// seed.js
// This script seeds the database with sample products and users.
// It is meant to be run manually from the terminal (node seed.js) for testing/demo purposes.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; // Library for hashing passwords securely
import Product from './models/Product.js';
import User from './models/User.js';

dotenv.config(); // Load environment variables from .env

const seedData = async () => {
    try {
        // 1. Connect to MongoDB using the MONGO_URI from .env
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding');

        // 2. Clear existing data from collections to avoid duplicates
        await Product.deleteMany({});
        await User.deleteMany({});

        // 3. Create Sample products (with basic name, description, price, quantity)
        const products = [
            { name: 'Laptop', description: '14 inch laptop', price: 899.99, quantityInStock: 10 },
            { name: 'Headphones', description: 'Noise cancelling', price: 199.99, quantityInStock: 25 },
            { name: 'Mouse', description: 'Wireless mouse', price: 29.99, quantityInStock: 50 }
        ];

        // 4. Create sample users (one admin, one customer)
        // Note: We store hashed passwords instead of plain text for security.
        // bcrypt.hash('plainPassword', saltRounds) creates a scrambled version of the password
        // The second parameter (10) = salt rounds: how many times the hashing is run (more rounds = more secure but slower)

        const users = [
            {
                name: 'Admin User',
                email: 'admin@example.com',
                passwordHash: await bcrypt.hash('admin123', 10), // Store the hashed password, not "admin123"
                role: 'admin'
            },
            {
                name: 'Customer User',
                email: 'customer@example.com',
                passwordHash: await bcrypt.hash('customer123', 10),
                role: 'customer'
            }
        ];

        // 5. Insert the sample data into the database
        await Product.insertMany(products);
        await User.insertMany(users);

        console.log('Database seeded successfully');
        process.exit(); // Exit the script
    } catch (error) {
        console.error('Error seeding database: ', error);
        process.exit(1); // Exit with error
    }
};

// Call the function to run the seeding process
seedData();
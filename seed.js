// seed.js
// NOTE: This will CLEAR the Product and User collections and insert fresh sample data.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

import Product from './models/Product.js';
import User from './models/User.js';

dotenv.config();

async function main() {
  try {
    // 1) Connect
    if (!process.env.MONGO_URI) {
      console.error('Missing MONGO_URI in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 2) Wipe existing data (keeps the DB clean for demos)
    await Product.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared Product and User collections');

    // 3) Sample products (name, description, price, stock)
    const products = [
      { name: 'Laptop',              description: '14 inch laptop',             price: 899.99, quantityInStock: 10 },
      { name: 'Headphones',          description: 'Noise cancelling',           price: 199.99, quantityInStock: 25 },
      { name: 'Mouse',               description: 'Wireless mouse',             price: 29.99,  quantityInStock: 50 },
      { name: 'Keyboard',            description: 'Mechanical',                 price: 79.99,  quantityInStock: 30 },
      { name: 'Bluetooth Speaker',   description: 'Portable speaker, 12h batt', price: 59.95,  quantityInStock: 20 }
    ];

    // 4) Sample users (one admin, one customer)
    // Passwords are basic for demo purposes ONLY.
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
      },
      {
        name: 'Customer User',
        email: 'customer@example.com',
        passwordHash: await bcrypt.hash('customer123', 10),
        role: 'customer',
      },
    ];

    // 5) Insert data
    await Product.insertMany(products);
    await User.insertMany(users);
    console.log('Inserted products and users');

    // 6) Done
    console.log('--- Seed complete ---');
    console.log('Admin login:    admin@example.com / admin123');
    console.log('Customer login: customer@example.com / customer123');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();

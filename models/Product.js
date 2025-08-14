// models/Product.js
// Purpose: Product schema powering REST + GraphQL queries for the shopping cart.

import mongoose from 'mongoose';

// This schema describes the structure of each product in the database
const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // product name is required
    description: { type: String, default: '' }, // optional product description
    price: {
        type: Number,
        required: true, // product price is required
        min: [0, 'Price must be >= 0'],
    },
    quantityInStock: {
        type: Number,
        required: true,
        min: [0, 'Stock must be >= 0'],
    },
},
    {
        timestamps: true, // Automatically add createdAt and updatedAt fields
    }
);

productSchema.index({ name: 'text', description: 'text' });

// Friendly "id" virtual (clients can use _id or id)
productSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Make virtuals appear when NOT using .lean()
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Create a model called 'Product' based on the schema
const Product = mongoose.model('Product', productSchema);

// Export the model so it can be used elsewhere in the app
export default Product;
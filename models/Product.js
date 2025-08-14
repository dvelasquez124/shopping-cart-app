// models/Product.js
// Purpose: Product schema powering REST + GraphQL queries for the shopping cart.

import mongoose from 'mongoose';

// Define the shape of a product in MongoDB
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },     // product name is required
    description: { type: String, default: '' },             // short text about the product
    price: { type: Number, required: true, min: 0 },        // price must be >= 0
    quantityInStock: { type: Number, required: true, min: 0 } // stock must be >= 0
  },
  {
    timestamps: true,   // adds createdAt / updatedAt
    // versionKey: false // OPTIONAL: uncomment to hide "__v" everywhere
  }
);

// Text search on name + description (used by /api/products/search)
productSchema.index({ name: 'text', description: 'text' });

// Friendly "id" virtual (so clients can use id instead of _id)
productSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Make virtuals show up when converting docs to JSON/objects
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Build and export the model
const Product = mongoose.model('Product', productSchema);
export default Product;

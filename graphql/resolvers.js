// graphql/resolvers.js
// Simple resolvers that read from Mongo via Mongoose.

import Product from '../models/Product.js';

// escape user input before making a RegExp
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const resolvers = {
  // Map Mongo _id → GraphQL id
  Product: {
    id: (p) => (p._id ? String(p._id) : p.id),
    _id: (p) => String(p._id ?? p.id),
  },

  Query: {
    // all products
    products: async () => {
      try {
        return await Product.find({}).lean();
      } catch (err) {
        console.error('products resolver error:', err);
        return [];
      }
    },

    // search by name or description (case-insensitive)
    searchProducts: async (_, { name }) => {
      try {
        const term = (name || '').trim();
        if (!term) return [];
        const rx = new RegExp(escapeRegex(term), 'i');
        return await Product.find({ $or: [{ name: rx }, { description: rx }] }).lean();
      } catch (err) {
        console.error('searchProducts resolver error:', err);
        return [];
      }
    },

    // products within [min, max] price
    productsInPriceRange: async (_, { min, max }) => {
      try {
        const lo = Number.isFinite(min) ? Number(min) : 0;
        const hi = Number.isFinite(max) ? Number(max) : Number.MAX_SAFE_INTEGER;
        return await Product.find({ price: { $gte: lo, $lte: hi } }).lean();
      } catch (err) {
        console.error('productsInPriceRange resolver error:', err);
        return [];
      }
    },
  },
};

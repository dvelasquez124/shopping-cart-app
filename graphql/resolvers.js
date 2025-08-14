// graphql/resolvers.js
// Purpose: Resolvers that fetch via Mongoose with defensive error handling.

import Product from '../models/Product.js';

// helper: escape user input before building a RegExp
function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const resolvers = {
    Product: {
      // Map Mongo's _id to GraphQL id 
      id: (p) => (p._id ? p._id.toString() : p.id),
    },
  
    Query: {
      products: async () => {
        try {
          // lean() returns plain objects
          return await Product.find({}).lean();
        } catch (err) {
          console.error('GraphQL products resolver error:', err);
          return []; // never crash the transport
        }
      },
  
      searchProducts: async (_, { name }) => {
        try {
          const term = (name || '').trim();
          if (!term) return [];
  
          const rx = new RegExp(escapeForRegex(term), 'i');
          return await Product.find(
            { $or: [{ name: rx }, { description: rx }] },
            null,
            { lean: true }
          );
        } catch (err) {
          console.error('GraphQL searchProducts resolver error:', err);
          return [];
        }
      },
  
      productsInPriceRange: async (_, { min, max }) => {
        try {
          // guard numeric inputs
          const lo = Number.isFinite(min) ? Number(min) : 0;
          const hi = Number.isFinite(max) ? Number(max) : Number.MAX_SAFE_INTEGER;
  
          return await Product.find(
            { price: { $gte: lo, $lte: hi } },
            null,
            { lean: true }
          );
        } catch (err) {
          console.error('GraphQL productsInPriceRange resolver error:', err);
          return [];
        }
      },
    },
  };
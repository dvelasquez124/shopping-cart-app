// graphql/resolvers.js

import Product from '../models/Product.js';

// helper: escape user input before building a RegExp
function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const resolvers = {
    Product: {
        id: (parent) => String(parent._id), // Mapping _id (Mongo) to id (GraphQL)
    },
    
    // Query resolvers
    Query: {
        // Return all products
        products: async () => {
            return Product.find({}).lean().exec();
        },
        
        // Search by name 
        searchProducts: async (_, { name }) => {
            try {
                const term = escapeRegex(name || '');
                const rx = new RegExp(term, 'i'); // case-insensitive

                // debug to server console
                console.log('searchProducts -> term:', term);

                const results = await Product.find({
                    $or: [{ name: rx },  { description: rx }],
                })
                .lean()
                .exec();

                console.log('searchProducts -> results:', results.length);
                return results;
            } catch (err) {
                console.error('GraphQL searchProducts error:', err.message);
                throw new Error('Search failed');
            }
        },

        // Price range (if min > max, auto-swap)
        productsInPriceRange: async (_, { min, max }) => {
            let a = Number(min), b = Number(max);
            if (!Number.isFinite(a) || !Number.isFinite(b)) {
                throw new Error('min and max must be numbers');
            }
            if (a > b) [a, b] = [b, a]; // swap if user reversed min and max
            return Product.find({ price: { $gte: a, $lte: b } }).lean().exec();
        },
    },
};
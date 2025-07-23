// Import mongoose to define a schema and model
import mongoose from 'mongoose';

// This schema describes the structure of each product in the database
const productSchema = new mongoose.Schema({
    name: { type: String, required: true }, // product name is required
    description: String, // optional product description
    price: {type: Number, required: true}, // product price is required
    quantityInStock: { type: Number, required: true }, // how many are available
}, {timestamps: true}); // Automatically add createdAt and updatedAt fields

// Create a model called 'Product' based on the schema
const Product = mongoose.model('Product', productSchema);

// Export the model so it can be used elsewhere in the app
export default Product;
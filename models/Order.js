import mongoose from 'mongoose';

// This schema represents a customer's order
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // reference to the User who placed the order
        ref: 'User',
        required: true
    },
    items: [ // an array of products in the order
        {
            product: {
                type: mongoose.Schema.Types.ObjectId, // reference to a Product
                ref: 'Product'
            },
            quantity: Number, // how many of this product
            priceAtPurchase: Number // price at the time of purchase

        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create the Order model
const Order = mongoose.model('Order', orderSchema);

export default Order;
// models/Order.js
import mongoose from 'mongoose';

// Snapshot of what was purchased at that moment
const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // product name at purchase time
    priceAtPurchase: { type: Number, require: true }, // product price at purchase time
    quantity: { type: Number, min: 1, required: true }
}, { _id: false });

// This schema represents a customer's order
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // reference to the User who placed the order
        ref: 'User',
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: v => Array.isArray(v) && v.length > 0
    },
    subtotal: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['placed','processing','shipped','delivered','cancelled'],
        default: 'placed'
    }
}, { timestamps: true }); // Adds createdAt + updatedAt automatically

export default mongoose.model('Order', orderSchema);
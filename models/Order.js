// models/Order.js
// Order model: who bought what, when, and for how much.

import mongoose from 'mongoose';

// One line item from the Product at purchase time (snapshot name/price)
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },                     // product name at that time
    priceAtPurchase: { type: Number, required: true, min: 0 },  // product price at that time
    quantity: { type: Number, required: true, min: 1 },         // how many units were bought
  },
  { _id: false } // no separate _id for each item row
);

// The order itself
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who placed it
    items: {
      type: [orderItemSchema],
      required: true,
      // must have at least one item
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must have at least one item.',
      },
    },
    subtotal: { type: Number, required: true, min: 0 }, // computed in the route
    status: {
      type: String,
      enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
  },
  {
    timestamps: true,  // adds createdAt / updatedAt
    versionKey: false, // hides __v
  }
);

// Helpful index for "my orders" sorted newest first
orderSchema.index({ user: 1, createdAt: -1 });

// Friendly "id" virtual (Mongo _id still exists)
orderSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Include virtuals when converting to JSON/objects (if not using .lean())
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

export default mongoose.model('Order', orderSchema);

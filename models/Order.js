// models/Order.js
// Order model: stores who bought what, when, and for how much.

import mongoose from 'mongoose';

// one line from Product at purchase time (we snapshot name/price)
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },                 // name at that time
    priceAtPurchase: { type: Number, required: true, min: 0 }, // price at that time
    quantity: { type: Number, required: true, min: 1 },     // how many units
  },
  { _id: false } // no separate _id for each item
);

// the order itself
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who placed it
    items: {
      type: [orderItemSchema],
      required: true,
      // simple check: must have at least one item
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must have at least one item.',
      },
    },
    subtotal: { type: Number, required: true, min: 0 }, // computed server-side in the route
    status: {
      type: String,
      enum: ['placed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
  },
  {
    timestamps: true,  // createdAt / updatedAt
    versionKey: false, // hide __v
  }
);

// quick helpers for queries like "my orders", newest first
orderSchema.index({ user: 1, createdAt: -1 });

// expose a friendly "id" (keeps Mongo _id too)
orderSchema.virtual('id').get(function () {
  return this._id.toString();
});

// include virtuals when converting to JSON/objects (when not using .lean())
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

export default mongoose.model('Order', orderSchema);

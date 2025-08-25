// models/User.js
// User model: basic account info for login and roles.

import mongoose from 'mongoose';

// Define what a user looks like in MongoDB
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // full name

    email: {
      type: String,
      required: true,     // needed to log in
      unique: true,       // creates a unique index in Mongo
      trim: true,
      lowercase: true,    // normalize so "A@B.com" == "a@b.com"
      // Note: 'unique' is not a validator; it's an index. We still check duplicates in code.
    },

    passwordHash: { type: String, required: true }, // bcrypt hash (set at register time)

    role: {
      type: String,
      enum: ['customer', 'admin'], // two roles only
      default: 'customer',
    },
  },
  {
    timestamps: true,   // adds createdAt / updatedAt
    versionKey: false,  // hide __v
  }
);

// Virtual: friendly string id (Mongo _id still exists)
userSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Virtual: easy boolean for templates / checks
userSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

// Include virtuals when converting to JSON/objects (when not using .lean())
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Build and export the model
const User = mongoose.model('User', userSchema);
export default User;

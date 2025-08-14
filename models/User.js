// models/User.js
// User model: basic account info for login and roles.

import mongoose from 'mongoose';

// This schema describes a user in the system
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // full name
    email: {
      type: String,
      required: true,       // required to log in
      unique: true,         // emails should be unique
      trim: true,
      lowercase: true,      // normalize so uniqueness works as expected
    },
    passwordHash: { type: String, required: true }, // bcrypt hash (set during registration)
    role: {
      type: String,
      enum: ['customer', 'admin'], // two roles only
      default: 'customer',
    },
  },
  {
    timestamps: true,  // createdAt / updatedAt
    versionKey: false, // hide __v in JSON
  }
);

// virtual: friendly id (keeps Mongo _id too)
userSchema.virtual('id').get(function () {
  return this._id.toString();
});

// virtual: isAdmin flag so code can check user.isAdmin
userSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

// include virtuals when converting to JSON/objects (when not using .lean())
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Create the User model from the schema
const User = mongoose.model('User', userSchema);
export default User;

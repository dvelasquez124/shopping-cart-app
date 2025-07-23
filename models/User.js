import mongoose from 'mongoose';

// This schema desribes a user in the system
const userSchema = new mongoose.Schema({
    name: {type: String, required: true }, // full name
    email: {type: String, unique: true }, // must be unique
    passwordHash: { type: String, required: true }, // hashed password (for security)
    role: {
        type: String,
        enum: ['customer', 'admin'], // user can be customer or admin
        default: 'customer'
    }
}, { timestamps: true });

// Create the User model from the schema
const User = mongoose.model('User', userSchema);

export default User;
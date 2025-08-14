// config/passportConfig.js
// Sets up Passport Local Strategy (email + password) for login

import passportLocal from 'passport-local'; // To define a username/password login strategy
import passport from 'passport'; // the main passport library
import bcrypt from 'bcrypt'; // to compare hashed passwords
import User from '../models/User.js'; // default export


const LocalStrategy = passportLocal.Strategy; // Assigning strategy from passport-local to LocalStrategy



// On each request with a session, load a lightweight user which includes email
passport.deserializeUser(async (id, done) => {
    try {
      // pick only safe fields we need in views
      const user = await User.findById(id, 'name email role').lean().exec();
      if (user) user.isAdmin = user.role === 'admin';
      done(null, user); // now req.user has name/email/role
    } catch (err) {
      done(err);
    }
  });
  
// LocalStrategy: try to find the user by email, then compare passwords
passport.use(
    new LocalStrategy(
    {
        usernameField: 'email', // expect req.body.email
        passwordField: 'password' // expect req.body.password
    },
    async (email, password, done) => {
        try {
            // normalize email a bit to reduce "works on my machine" bugs
            const normalizedEmail = String(email).trim().toLowerCase();

            const user = await User.findOne({ email: normalizedEmail }).exec();
            if (!user) {
                return done(null, false, { message: 'No account with that email.' });
            }

            const ok = await bcrypt.compare(password, user.passwordHash);

            if (!ok) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user); // Login successful
        } catch (err) {
            return done(err);
        }
    }
));

// store only the user id in the session
passport.serializeUser((user, done) => {
    done(null, user._id);
});
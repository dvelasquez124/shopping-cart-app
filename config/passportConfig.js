// config/passportConfig.js
// Sets up Passport Local Strategy (email + password) for login.
// This file doesn't export anything; importing it once configures passport globally.

import passportLocal from 'passport-local';   // username/password strategy
import passport from 'passport';              // passport core
import bcrypt from 'bcrypt';                  // compare hashed passwords
import User from '../models/User.js';         // our User model

const LocalStrategy = passportLocal.Strategy; // convenience alias

// When a session exists, Passport calls this to turn the user id into a user object.
// We load only safe, small fields for views/nav (name/email/role).
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id, 'name email role').lean().exec();
    if (user) user.isAdmin = user.role === 'admin'; // handy boolean used in views
    done(null, user); // (err, user) → attaches to req.user
  } catch (err) {
    done(err);
  }
});

// LocalStrategy: find the user by email, then verify the password with bcrypt.
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',    // look at req.body.email
      passwordField: 'password', // look at req.body.password
    },
    async (email, password, done) => {
      try {
        // normalize email (helps avoid case/space bugs)
        const normalizedEmail = String(email).trim().toLowerCase();

        // find the user by email
        const user = await User.findOne({ email: normalizedEmail }).exec();
        if (!user) {
          return done(null, false, { message: 'No account with that email.' });
        }

        // compare the plain password with the stored hash
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        // success → pass the user through
        return done(null, user);
      } catch (err) {
        // any unexpected error
        return done(err);
      }
    }
  )
);

// Store only the user id in the session cookie payload.
// Passport will call deserializeUser with this id on the next request.
passport.serializeUser((user, done) => {
  done(null, user._id); // (err, id)
});

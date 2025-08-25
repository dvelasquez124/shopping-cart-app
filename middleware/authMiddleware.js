// middleware/authMiddleware.js
// Tiny helpers to protect routes using Passport session info.

// If the user is logged in, continue; otherwise send 401 (used by API routes).
export const ensureAuthenticated = (req, res, next) => {
    // req.isAuthenticated() is added by Passport
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ message: 'Unauthorized' });
  };
  
  // Only allow admins; everyone else gets 403.
  // Tip: we set req.user.role in passport deserialize.
  export const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  };
  
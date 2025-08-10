export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(401).json({ message: 'Unauthorized' });
};

export const ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    return res.status(403).json({ message: 'Forbidden: Admins only' });
};
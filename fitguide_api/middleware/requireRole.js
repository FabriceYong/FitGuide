/**
 * Allow only users with one of the given roles. Use after authMiddleware.
 * Roles: user (default), creator (can submit programs), admin (everything).
 */
const requireRole = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) return next();
  return res.status(403).json({ success: false, message: "You don't have access to this." });
};

module.exports = { requireRole };

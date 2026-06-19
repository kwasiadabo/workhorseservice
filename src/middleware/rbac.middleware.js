const ApiError = require('../utils/ApiError');

// Restricts a route to one or more roles, e.g. requireRole('tenant_owner', 'manager').
const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };

// Restricts a route to users whose token includes the given permission key.
const requirePermission = (permissionKey) => (req, res, next) => {
  if (!req.user || !req.user.permissions.includes(permissionKey)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  return next();
};

module.exports = { requireRole, requirePermission };

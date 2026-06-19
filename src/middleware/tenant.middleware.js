const ApiError = require('../utils/ApiError');

// Resolves req.tenantId from the authenticated user. Must run after
// `authenticate`. Super admins (tenantId === null) should not use this
// middleware on routes — they are gated by requireRole('super_admin')
// instead and operate across all tenants by design.
const resolveTenant = (req, res, next) => {
  if (!req.user?.tenantId) {
    return next(ApiError.forbidden('This action requires a tenant account'));
  }
  req.tenantId = req.user.tenantId;
  return next();
};

module.exports = { resolveTenant };

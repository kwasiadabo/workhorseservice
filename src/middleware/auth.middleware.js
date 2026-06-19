const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const { Tenant } = require('../models');
const { tenantHasFeature } = require('../utils/planFeatures');

// Verifies the `Authorization: Bearer <token>` access token and attaches
// `req.user = { id, tenantId, role, permissions }`.
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or invalid Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      permissions: payload.permissions || [],
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
};

// Blocks access to everything except the auth endpoints needed to change a
// password while `mustChangePassword` is set (e.g. first login). Place after
// `authenticate` on routers other than `/auth`.
const requirePasswordChanged = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    return next(ApiError.forbidden('You must change your password before continuing'));
  }
  return next();
};

// Blocks tenant routes when the trial has expired or account is suspended/cancelled.
// Must run after `authenticate` + `resolveTenant` so req.tenantId is set.
const requireActiveSubscription = async (req, _res, next) => {
  try {
    const tenant = await Tenant.findByPk(req.tenantId, {
      attributes: ['status', 'trialEndsAt'],
    });

    if (!tenant) return next(ApiError.forbidden('Tenant not found'));

    if (tenant.status === 'trial') {
      if (tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
        return next(ApiError.paymentRequired('Your free trial has expired. Please subscribe to continue.', 'TRIAL_EXPIRED'));
      }
      return next();
    }

    if (tenant.status === 'active') return next();

    if (tenant.status === 'suspended') {
      return next(ApiError.paymentRequired('Your account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED'));
    }

    return next(ApiError.paymentRequired('Your account has been cancelled.', 'ACCOUNT_CANCELLED'));
  } catch (err) {
    return next(err);
  }
};

// Blocks a route unless the tenant's plan includes the given feature key.
// Must run after `resolveTenant` so req.tenantId is set. Mirrors
// requireActiveSubscription's 402 + code shape, which the frontend already
// hard-redirects to /app/subscription on.
const requireFeature = (key) => async (req, _res, next) => {
  try {
    const hasFeature = await tenantHasFeature(req.tenantId, key);
    if (!hasFeature) {
      return next(
        ApiError.paymentRequired('SMS features require a Business+ or Advanced+ plan.', 'FEATURE_NOT_AVAILABLE')
      );
    }
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { authenticate, requirePasswordChanged, requireActiveSubscription, requireFeature };

const crypto = require('crypto');
const { Tenant, Plan, Subscription, User, Role, UserRole, RefreshToken, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} = require('../utils/jwt');
const { getPermissionsForRole } = require('../config/permissions');
const slugify = require('../utils/slugify');
const env = require('../config/env');
const { sendMail } = require('../utils/mailer');

const TRIAL_DAYS = 30;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const getTenantMeta = async (tenantId) => {
  if (!tenantId) return { tenantName: null, businessType: null, subscriptionStatus: null, trialEndsAt: null };
  const [tenant, sub] = await Promise.all([
    Tenant.findByPk(tenantId, { attributes: ['name', 'businessType', 'status', 'trialEndsAt'] }),
    Subscription.findOne({ where: { tenantId }, attributes: ['status', 'currentPeriodEnd', 'trialStartedAt'] }),
  ]);
  // Derive a single subscriptionStatus for the client:
  // 'trialing' | 'active' | 'expired' | 'suspended' | 'cancelled'
  let subscriptionStatus = sub?.status ?? tenant?.status ?? null;
  if (subscriptionStatus === 'trialing' && tenant?.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
    subscriptionStatus = 'expired';
  }
  return {
    tenantName: tenant?.name ?? null,
    businessType: tenant?.businessType ?? null,
    subscriptionStatus,
    trialEndsAt: tenant?.trialEndsAt ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  };
};

const generateUniqueSlug = async (name) => {
  const base = slugify(name) || 'tenant';
  let slug = base;
  let counter = 1;
  while (await Tenant.findOne({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

const sanitizeUser = (user) => {
  const plain = user.toJSON();
  delete plain.passwordHash;
  delete plain.passwordResetTokenHash;
  delete plain.passwordResetExpiresAt;
  return plain;
};

const getUserRoleAndPermissions = async (userId) => {
  const userWithRoles = await User.findByPk(userId, { include: [{ model: Role }] });
  const role = userWithRoles?.Roles?.[0]?.name || null;
  const permissions = getPermissionsForRole(role);
  return { role, permissions };
};

const issueTokens = async (user, role, permissions, meta = {}) => {
  const accessToken = signAccessToken({
    sub: user.id,
    tenantId: user.tenantId,
    role,
    permissions,
    mustChangePassword: user.mustChangePassword,
  });

  const refreshTokenRaw = generateRefreshToken();
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshTokenRaw),
    expiresAt: refreshExpiryDate(),
    createdByIp: meta.ip,
    userAgent: meta.userAgent,
  });

  return { accessToken, refreshToken: refreshTokenRaw };
};

const registerTenant = async (data, meta = {}) => {
  const existing = await User.findOne({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const slug = await generateUniqueSlug(data.businessName);
  const defaultPlan = await Plan.findOne({ where: { isActive: true }, order: [['priceMonthly', 'ASC']] });

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { tenant, user } = await sequelize.transaction(async (t) => {
    const newTenant = await Tenant.create(
      {
        name: data.businessName,
        slug,
        businessType: data.businessType,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: 'trial',
        planId: defaultPlan?.id ?? null,
        trialEndsAt: trialEnd,
      },
      { transaction: t }
    );

    await Subscription.create(
      {
        tenantId: newTenant.id,
        planId: defaultPlan?.id ?? null,
        status: 'trialing',
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
        trialStartedAt: trialStart,
      },
      { transaction: t }
    );

    const passwordHash = await hashPassword(data.password);
    const newUser = await User.scope('withPassword').create(
      {
        tenantId: newTenant.id,
        email: data.email,
        passwordHash,
        firstName: data.ownerFirstName,
        lastName: data.ownerLastName,
        phone: data.phone,
      },
      { transaction: t }
    );

    const ownerRole = await Role.findOne({ where: { name: 'tenant_owner' }, transaction: t });
    if (!ownerRole) {
      throw new Error('tenant_owner role is not seeded. Run `npm run db:seed` before registering tenants.');
    }
    await UserRole.create(
      { userId: newUser.id, roleId: ownerRole.id, tenantId: newTenant.id },
      { transaction: t }
    );

    return { tenant: newTenant, user: newUser };
  });

  const permissions = getPermissionsForRole('tenant_owner');
  const tokens = await issueTokens(user, 'tenant_owner', permissions, meta);

  return {
    tenant,
    user: {
      ...sanitizeUser(user),
      role: 'tenant_owner',
      permissions,
      tenantName: tenant.name,
      businessType: tenant.businessType,
      subscriptionStatus: 'trialing',
      trialEndsAt: trialEnd,
      currentPeriodEnd: trialEnd,
    },
    ...tokens,
  };
};

const login = async ({ email, password }, meta = {}) => {
  const user = await User.scope('withPassword').findOne({ where: { email } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const { role, permissions } = await getUserRoleAndPermissions(user.id);

  user.lastLoginAt = new Date();
  await user.save();

  const [tokens, { tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }] = await Promise.all([
    issueTokens(user, role, permissions, meta),
    getTenantMeta(user.tenantId),
  ]);

  return { user: { ...sanitizeUser(user), role, permissions, tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }, ...tokens };
};

const refresh = async (refreshTokenRaw, meta = {}) => {
  if (!refreshTokenRaw) {
    throw ApiError.unauthorized('Missing refresh token');
  }

  const tokenHash = hashRefreshToken(refreshTokenRaw);
  const existing = await RefreshToken.findOne({ where: { tokenHash } });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findByPk(existing.userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  existing.revokedAt = new Date();
  await existing.save();

  const { role, permissions } = await getUserRoleAndPermissions(user.id);
  const [tokens, { tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }] = await Promise.all([
    issueTokens(user, role, permissions, meta),
    getTenantMeta(user.tenantId),
  ]);

  return { user: { ...sanitizeUser(user), role, permissions, tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }, ...tokens };
};

const logout = async (refreshTokenRaw) => {
  if (!refreshTokenRaw) return;
  const tokenHash = hashRefreshToken(refreshTokenRaw);
  await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: null } });
};

const getMe = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  const [{ role, permissions }, { tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }] = await Promise.all([
    getUserRoleAndPermissions(userId),
    getTenantMeta(user.tenantId),
  ]);
  return { ...sanitizeUser(user), role, permissions, tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd };
};

const changePassword = async (userId, { currentPassword, newPassword }, meta = {}) => {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid user');
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });

  const { role, permissions } = await getUserRoleAndPermissions(user.id);
  const [tokens, { tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }] = await Promise.all([
    issueTokens(user, role, permissions, meta),
    getTenantMeta(user.tenantId),
  ]);

  return { user: { ...sanitizeUser(user), role, permissions, tenantName, businessType, subscriptionStatus, trialEndsAt, currentPeriodEnd }, ...tokens };
};

const forgotPassword = async (email) => {
  const user = await User.scope('withPassword').findOne({ where: { email } });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${env.FRONTEND_URL}/reset-password?email=${encodeURIComponent(email)}&token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your VX-Workhorse password',
      text: `We received a request to reset your password. Click the link below to choose a new one. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    });
  }
};

const resetPassword = async ({ email, token, newPassword }) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.scope('withPassword').findOne({ where: { email, passwordResetTokenHash: tokenHash } });

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset link');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });
};

module.exports = {
  registerTenant,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
};

const { Op } = require('sequelize');
const { User, Role, Employee, Branch, Tenant, RefreshToken } = require('../models');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { hashPassword, generateTemporaryPassword } = require('../utils/password');
const ApiError = require('../utils/ApiError');

// Platform-wide user management is scoped to users that belong to a tenant
// (`tenantId` is not null) — platform accounts (super admins) are not
// manageable through this resource.
const buildIncludes = ({ role } = {}) => [
  {
    model: Role,
    attributes: ['id', 'name'],
    through: { attributes: [] },
    ...(role ? { where: { name: role }, required: true } : {}),
  },
  { model: Tenant, attributes: ['id', 'name', 'slug', 'status'] },
  {
    model: Employee,
    attributes: ['id', 'branchId'],
    include: [{ model: Branch, attributes: ['id', 'name'] }],
  },
];

const formatUser = (user) => {
  const { Roles, Employee: employee, Tenant: tenant, ...plain } = user.toJSON();
  return {
    ...plain,
    role: Roles?.[0]?.name ?? null,
    employeeId: employee?.id ?? null,
    branchId: employee?.branchId ?? null,
    branch: employee?.Branch ?? null,
    tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status } : null,
  };
};

const findTenantUser = async (id, include) => {
  const user = await User.findByPk(id, { include });
  if (!user || !user.tenantId) {
    throw ApiError.notFound('User not found');
  }
  return user;
};

const list = async (query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = { tenantId: { [Op.ne]: null } };

  if (query.tenantId) where.tenantId = query.tenantId;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where[Op.or] = ['firstName', 'lastName', 'email'].map((field) => ({
      [field]: { [Op.like]: `%${query.search}%` },
    }));
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: buildIncludes(query),
    limit,
    offset,
    order: order || [['firstName', 'ASC'], ['lastName', 'ASC']],
    distinct: true,
  });

  return { items: rows.map(formatUser), meta: buildPaginationMeta({ page, limit, count }) };
};

const getById = async (id) => {
  const user = await findTenantUser(id, buildIncludes());
  return formatUser(user);
};

const update = async (id, data) => {
  const user = await findTenantUser(id, [{ model: Role }]);
  const currentRole = user.Roles?.[0]?.name;

  if (data.isActive === false && currentRole === 'tenant_owner') {
    throw ApiError.forbidden('The tenant owner cannot be deactivated here — suspend the tenant instead');
  }

  const fields = {};
  ['firstName', 'lastName', 'phone', 'isActive'].forEach((key) => {
    if (data[key] !== undefined) fields[key] = data[key];
  });
  if (Object.keys(fields).length) {
    await user.update(fields);
  }

  return getById(id);
};

// Admin-initiated password reset, mirroring `users.service.js#resetPassword`
// but without tenant scoping.
const resetPassword = async (id) => {
  const user = await User.scope('withPassword').findByPk(id);
  if (!user || !user.tenantId) {
    throw ApiError.notFound('User not found');
  }

  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });

  return { user: await getById(id), temporaryPassword };
};

module.exports = { list, getById, update, resetPassword };

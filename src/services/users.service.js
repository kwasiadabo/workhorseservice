const { Op } = require('sequelize');
const { User, Role, UserRole, Employee, Branch, RefreshToken, sequelize } = require('../models');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { withTenantScope, assertTenantOwnership } = require('../utils/tenantScope');
const { hashPassword, generateTemporaryPassword } = require('../utils/password');
const ApiError = require('../utils/ApiError');

const buildIncludes = ({ role, branchId } = {}) => [
  {
    model: Role,
    attributes: ['id', 'name'],
    through: { attributes: [] },
    ...(role ? { where: { name: role }, required: true } : {}),
  },
  {
    model: Employee,
    attributes: ['id', 'branchId'],
    required: Boolean(branchId),
    ...(branchId ? { where: { branchId } } : {}),
    include: [{ model: Branch, attributes: ['id', 'name'] }],
  },
];

const formatUser = (user) => {
  const { Roles, Employee: employee, ...plain } = user.toJSON();
  return {
    ...plain,
    role: Roles?.[0]?.name ?? null,
    employeeId: employee?.id ?? null,
    branchId: employee?.branchId ?? null,
    branch: employee?.Branch ?? null,
  };
};

const verifyBranch = async (tenantId, branchId) => {
  const branch = await Branch.findByPk(branchId);
  return assertTenantOwnership(branch, tenantId);
};

const list = async (tenantId, query = {}) => {
  const { page, limit, offset, order } = parsePagination(query);
  const where = withTenantScope(tenantId, {});

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

const getById = async (tenantId, id) => {
  const user = await User.findByPk(id, { include: buildIncludes() });
  assertTenantOwnership(user, tenantId);
  return formatUser(user);
};

const create = async (tenantId, data) => {
  const existing = await User.findOne({ where: { email: data.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const role = await Role.findOne({ where: { name: data.role } });
  if (!role) {
    throw ApiError.badRequest('Invalid role');
  }

  let employee = null;
  if (data.employeeId) {
    employee = await Employee.findByPk(data.employeeId);
    assertTenantOwnership(employee, tenantId);
    if (employee.userId) {
      throw ApiError.conflict('This employee is already linked to a user account');
    }
  }

  const branch = !employee && data.branchId ? await verifyBranch(tenantId, data.branchId) : null;

  const userId = await sequelize.transaction(async (t) => {
    const passwordHash = await hashPassword(data.password);
    const user = await User.scope('withPassword').create(
      {
        tenantId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        mustChangePassword: true,
      },
      { transaction: t }
    );

    await UserRole.create({ userId: user.id, roleId: role.id, tenantId }, { transaction: t });

    if (employee) {
      await employee.update({ userId: user.id }, { transaction: t });
    } else if (branch) {
      await Employee.create(
        {
          tenantId,
          branchId: branch.id,
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          status: 'active',
        },
        { transaction: t }
      );
    }

    return user.id;
  });

  return getById(tenantId, userId);
};

const update = async (tenantId, id, data, currentUserId) => {
  const user = await User.findByPk(id, { include: [{ model: Role }, { model: Employee }] });
  assertTenantOwnership(user, tenantId);

  const currentRole = user.Roles?.[0]?.name;

  if (data.role && data.role !== currentRole) {
    if (currentRole === 'tenant_owner') {
      throw ApiError.forbidden("The tenant owner's role cannot be changed");
    }
    const newRole = await Role.findOne({ where: { name: data.role } });
    if (!newRole) {
      throw ApiError.badRequest('Invalid role');
    }
    await UserRole.destroy({ where: { userId: user.id } });
    await UserRole.create({ userId: user.id, roleId: newRole.id, tenantId });
  }

  if (data.branchId) {
    const branch = await verifyBranch(tenantId, data.branchId);
    if (user.Employee) {
      await user.Employee.update({ branchId: branch.id });
    } else {
      await Employee.create({
        tenantId,
        branchId: branch.id,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        status: 'active',
      });
    }
  }

  if (data.isActive === false) {
    if (currentRole === 'tenant_owner') {
      throw ApiError.forbidden('The tenant owner cannot be deactivated');
    }
    if (id === currentUserId) {
      throw ApiError.forbidden('You cannot deactivate your own account');
    }
  }

  const fields = {};
  ['firstName', 'lastName', 'phone', 'isActive'].forEach((key) => {
    if (data[key] !== undefined) fields[key] = data[key];
  });
  if (Object.keys(fields).length) {
    await user.update(fields);
  }

  return getById(tenantId, id);
};

// "Removing" a user account deactivates it rather than deleting it, so
// historical references (bookings, payments, employee records) stay intact.
const remove = (tenantId, id, currentUserId) => update(tenantId, id, { isActive: false }, currentUserId);

// Admin-initiated password reset: issues a one-time temporary password,
// forces a change on next login, and revokes existing sessions.
const resetPassword = async (tenantId, id, currentUserId) => {
  if (id === currentUserId) {
    throw ApiError.forbidden('Use "Change password" to update your own password');
  }

  const user = await User.scope('withPassword').findByPk(id);
  assertTenantOwnership(user, tenantId);

  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });

  return { user: await getById(tenantId, id), temporaryPassword };
};

module.exports = { list, getById, create, update, remove, resetPassword };

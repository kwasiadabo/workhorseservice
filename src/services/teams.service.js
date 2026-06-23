const { Team, Employee, Position, Branch, sequelize } = require('../models');
const { createCrudService } = require('../utils/crudService');
const { assertTenantOwnership } = require('../utils/tenantScope');
const ApiError = require('../utils/ApiError');

const memberInclude = {
  model: Employee,
  as: 'members',
  attributes: ['id', 'firstName', 'lastName', 'positionId'],
  through: { attributes: [] },
  include: [{ model: Position, attributes: ['id', 'name'] }],
};

const base = createCrudService(Team, {
  searchableFields: ['name'],
  defaultOrder: [['name', 'ASC']],
  buildWhere: (query) => {
    const where = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return where;
  },
  include: [memberInclude],
});

const verifyBranch = async (tenantId, branchId) => {
  const branch = await Branch.findByPk(branchId);
  assertTenantOwnership(branch, tenantId);
};

const verifyMembers = async (tenantId, branchId, memberIds) => {
  if (!memberIds?.length) return;
  const count = await Employee.count({ where: { id: memberIds, tenantId, branchId } });
  if (count !== memberIds.length) {
    throw ApiError.badRequest('One or more team members are invalid for this branch');
  }
};

const create = async (tenantId, data) => {
  const { memberIds, ...rest } = data;
  await verifyBranch(tenantId, rest.branchId);
  await verifyMembers(tenantId, rest.branchId, memberIds);

  const team = await sequelize.transaction(async (t) => {
    const created = await Team.create({ ...rest, tenantId }, { transaction: t });
    if (memberIds?.length) {
      await created.setMembers(memberIds, { transaction: t, through: { tenantId } });
    }
    return created;
  });

  return base.getById(tenantId, team.id);
};

const update = async (tenantId, id, data) => {
  const { memberIds, ...rest } = data;
  const existing = await base.getById(tenantId, id);
  const branchId = rest.branchId ?? existing.branchId;

  if (rest.branchId !== undefined) {
    await verifyBranch(tenantId, rest.branchId);
  }
  await verifyMembers(tenantId, branchId, memberIds);

  await sequelize.transaction(async (t) => {
    if (Object.keys(rest).length > 0) await existing.update(rest, { transaction: t });
    if (memberIds !== undefined) {
      await existing.setMembers(memberIds, { transaction: t, through: { tenantId } });
    }
  });

  return base.getById(tenantId, id);
};

module.exports = { ...base, create, update };

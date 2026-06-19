const { Employee, Branch, Position } = require('../models');
const { createCrudService } = require('../utils/crudService');
const { assertTenantOwnership } = require('../utils/tenantScope');
const ApiError = require('../utils/ApiError');

const base = createCrudService(Employee, {
  searchableFields: ['firstName', 'lastName', 'email'],
  defaultOrder: [['firstName', 'ASC'], ['lastName', 'ASC']],
  buildWhere: (query) => {
    const where = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;
    if (query.unassigned) where.userId = null;
    return where;
  },
  include: [{ model: Position, attributes: ['id', 'name'] }],
});

// Flattens the joined Position into a plain `position` name string — the
// frontend (booking/staff-assignment pickers) reads `employee.position`
// directly rather than the nested association.
const withFlatPosition = (employee) => {
  const plain = employee.toJSON();
  return { ...plain, position: plain.Position?.name ?? null };
};

const list = async (tenantId, query) => {
  const { items, meta } = await base.list(tenantId, query);
  return { items: items.map(withFlatPosition), meta };
};

const getById = async (tenantId, id) => withFlatPosition(await base.getById(tenantId, id));

const verifyBranch = async (tenantId, branchId) => {
  const branch = await Branch.findByPk(branchId);
  assertTenantOwnership(branch, tenantId);
};

const verifyPosition = async (tenantId, positionId) => {
  const position = await Position.findByPk(positionId);
  assertTenantOwnership(position, tenantId);
};

const create = async (tenantId, data) => {
  await verifyBranch(tenantId, data.branchId);
  if (data.positionId) {
    await verifyPosition(tenantId, data.positionId);
  }
  return base.create(tenantId, data);
};

const update = async (tenantId, id, data) => {
  if (data.branchId) {
    await verifyBranch(tenantId, data.branchId);
  }
  if (data.positionId) {
    await verifyPosition(tenantId, data.positionId);
  }
  return base.update(tenantId, id, data);
};

const getMyRecord = async (tenantId, userId) => {
  const employee = await Employee.findOne({ where: { tenantId, userId } });
  if (!employee) {
    throw ApiError.notFound('No employee record is linked to this account');
  }
  return employee;
};

module.exports = { ...base, list, getById, create, update, getMyRecord };

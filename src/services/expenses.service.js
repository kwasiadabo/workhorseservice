const { Op } = require('sequelize');
const { Expense, Branch, ExpenseCategory, User } = require('../models');
const { createCrudService } = require('../utils/crudService');
const { assertTenantOwnership } = require('../utils/tenantScope');

const include = [
  { model: Branch, attributes: ['id', 'name'] },
  { model: ExpenseCategory, attributes: ['id', 'name'] },
  { model: User, as: 'recorder', attributes: ['id', 'firstName', 'lastName'] },
];

const base = createCrudService(Expense, {
  searchableFields: ['description'],
  defaultOrder: [['expenseDate', 'DESC'], ['createdAt', 'DESC']],
  include,
  buildWhere: (query) => {
    const where = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate[Op.gte] = query.startDate;
      if (query.endDate) where.expenseDate[Op.lte] = query.endDate;
    }
    return where;
  },
});

const verifyBranch = async (tenantId, branchId) => {
  if (!branchId) return;
  const branch = await Branch.findByPk(branchId);
  assertTenantOwnership(branch, tenantId);
};

const verifyCategory = async (tenantId, categoryId) => {
  if (!categoryId) return;
  const category = await ExpenseCategory.findByPk(categoryId);
  assertTenantOwnership(category, tenantId);
};

const create = async (tenantId, data, recordedBy) => {
  await verifyBranch(tenantId, data.branchId);
  await verifyCategory(tenantId, data.categoryId);
  return base.create(tenantId, { ...data, recordedBy });
};

const update = async (tenantId, id, data) => {
  if (data.branchId !== undefined) {
    await verifyBranch(tenantId, data.branchId);
  }
  if (data.categoryId !== undefined) {
    await verifyCategory(tenantId, data.categoryId);
  }
  return base.update(tenantId, id, data);
};

module.exports = { ...base, create, update };

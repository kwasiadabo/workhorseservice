const { BankAccount, Bank, Branch } = require('../models');
const { createCrudService } = require('../utils/crudService');
const { assertTenantOwnership } = require('../utils/tenantScope');

const include = [
  { model: Bank, attributes: ['id', 'name', 'shortCode'] },
  { model: Branch, attributes: ['id', 'name'] },
];

const base = createCrudService(BankAccount, {
  searchableFields: ['accountName', 'accountNumber'],
  defaultOrder: [['accountName', 'ASC']],
  include,
  buildWhere: (query) => {
    const where = {};
    if (query.bankId) where.bankId = query.bankId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return where;
  },
});

const verifyBank = async (tenantId, bankId) => {
  const bank = await Bank.findByPk(bankId);
  assertTenantOwnership(bank, tenantId);
};

const verifyBranch = async (tenantId, branchId) => {
  if (!branchId) return;
  const branch = await Branch.findByPk(branchId);
  assertTenantOwnership(branch, tenantId);
};

const create = async (tenantId, data) => {
  await verifyBank(tenantId, data.bankId);
  await verifyBranch(tenantId, data.branchId);
  return base.create(tenantId, data);
};

const update = async (tenantId, id, data) => {
  if (data.bankId !== undefined) await verifyBank(tenantId, data.bankId);
  if (data.branchId !== undefined) await verifyBranch(tenantId, data.branchId);
  return base.update(tenantId, id, data);
};

module.exports = { ...base, create, update };

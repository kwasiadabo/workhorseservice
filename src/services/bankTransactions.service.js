const { Op } = require('sequelize');
const { BankTransaction, BankAccount, Bank, User } = require('../models');
const { createCrudService } = require('../utils/crudService');
const { assertTenantOwnership } = require('../utils/tenantScope');

const include = [
  {
    model: BankAccount,
    attributes: ['id', 'accountName', 'accountNumber', 'currency'],
    include: [{ model: Bank, attributes: ['id', 'name', 'shortCode'] }],
  },
  { model: User, as: 'recorder', attributes: ['id', 'firstName', 'lastName'] },
];

const base = createCrudService(BankTransaction, {
  searchableFields: ['referenceNumber', 'description', 'branch'],
  defaultOrder: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
  include,
  buildWhere: (query) => {
    const where = {};
    if (query.bankAccountId) where.bankAccountId = query.bankAccountId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate[Op.gte] = query.startDate;
      if (query.endDate) where.transactionDate[Op.lte] = query.endDate;
    }
    return where;
  },
});

const verifyAccount = async (tenantId, bankAccountId) => {
  const account = await BankAccount.findByPk(bankAccountId);
  assertTenantOwnership(account, tenantId);
};

const create = async (tenantId, data, recordedBy) => {
  await verifyAccount(tenantId, data.bankAccountId);
  return base.create(tenantId, { ...data, recordedBy });
};

const update = async (tenantId, id, data) => {
  if (data.bankAccountId !== undefined) await verifyAccount(tenantId, data.bankAccountId);
  return base.update(tenantId, id, data);
};

module.exports = { ...base, create, update };

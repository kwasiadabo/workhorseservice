const { createCrudController } = require('../utils/crudController');
const asyncHandler = require('../utils/asyncHandler');
const bankAccountsService = require('../services/bankAccounts.service');

const base = createCrudController(bankAccountsService);

const create = asyncHandler(async (req, res) => {
  const item = await bankAccountsService.create(req.tenantId, req.body);
  res.status(201).json({ success: true, data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await bankAccountsService.update(req.tenantId, req.params.id, req.body);
  res.json({ success: true, data: item });
});

module.exports = { ...base, create, update };

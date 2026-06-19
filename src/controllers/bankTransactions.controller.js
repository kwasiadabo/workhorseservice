const { createCrudController } = require('../utils/crudController');
const asyncHandler = require('../utils/asyncHandler');
const bankTransactionsService = require('../services/bankTransactions.service');

const base = createCrudController(bankTransactionsService);

const create = asyncHandler(async (req, res) => {
  const item = await bankTransactionsService.create(req.tenantId, req.body, req.user.id);
  res.status(201).json({ success: true, data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await bankTransactionsService.update(req.tenantId, req.params.id, req.body);
  res.json({ success: true, data: item });
});

module.exports = { ...base, create, update };

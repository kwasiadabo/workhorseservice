const asyncHandler = require('../utils/asyncHandler');
const { createCrudController } = require('../utils/crudController');
const expensesService = require('../services/expenses.service');

const base = createCrudController(expensesService);

module.exports = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await expensesService.create(req.tenantId, req.body, req.user.id);
    res.status(201).json({ success: true, data: item });
  }),
};

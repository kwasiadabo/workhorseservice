const asyncHandler = require('../utils/asyncHandler');
const paymentsService = require('../services/payments.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta, totals } = await paymentsService.list(req.tenantId, req.query);
  res.json({ success: true, data: items, meta: { ...meta, totals } });
});

const create = asyncHandler(async (req, res) => {
  const payment = await paymentsService.create(req.tenantId, req.user, req.body);
  res.status(201).json({ success: true, data: payment });
});

const getById = asyncHandler(async (req, res) => {
  const payment = await paymentsService.getById(req.tenantId, req.params.id);
  res.json({ success: true, data: payment });
});

module.exports = { list, create, getById };

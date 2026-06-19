const asyncHandler = require('../utils/asyncHandler');
const cashHandoversService = require('../services/cashHandovers.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta, totals } = await cashHandoversService.list(req.tenantId, req.query);
  res.json({ success: true, data: items, meta: { ...meta, totals } });
});

const preview = asyncHandler(async (req, res) => {
  const result = await cashHandoversService.preview(req.tenantId, req.query);
  res.json({ success: true, data: result });
});

const create = asyncHandler(async (req, res) => {
  const handover = await cashHandoversService.create(req.tenantId, req.user, req.body);
  res.status(201).json({ success: true, data: handover });
});

const getById = asyncHandler(async (req, res) => {
  const handover = await cashHandoversService.getById(req.tenantId, req.params.id);
  res.json({ success: true, data: handover });
});

const review = asyncHandler(async (req, res) => {
  const handover = await cashHandoversService.review(req.tenantId, req.user, req.params.id, req.body);
  res.json({ success: true, data: handover });
});

module.exports = { list, preview, create, getById, review };

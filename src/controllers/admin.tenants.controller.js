const asyncHandler = require('../utils/asyncHandler');
const tenantsService = require('../services/admin.tenants.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await tenantsService.list(req.query);
  res.json({ success: true, data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const tenant = await tenantsService.getById(req.params.id);
  res.json({ success: true, data: tenant });
});

const update = asyncHandler(async (req, res) => {
  const tenant = await tenantsService.update(req.params.id, req.body);
  res.json({ success: true, data: tenant });
});

const remove = asyncHandler(async (req, res) => {
  const tenant = await tenantsService.remove(req.params.id);
  res.json({ success: true, data: tenant });
});

module.exports = { list, getById, update, remove };

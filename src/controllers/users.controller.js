const asyncHandler = require('../utils/asyncHandler');
const usersService = require('../services/users.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await usersService.list(req.tenantId, req.query);
  res.json({ success: true, data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const item = await usersService.getById(req.tenantId, req.params.id);
  res.json({ success: true, data: item });
});

const create = asyncHandler(async (req, res) => {
  const item = await usersService.create(req.tenantId, req.body);
  res.status(201).json({ success: true, data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await usersService.update(req.tenantId, req.params.id, req.body, req.user.id);
  res.json({ success: true, data: item });
});

const remove = asyncHandler(async (req, res) => {
  const item = await usersService.remove(req.tenantId, req.params.id, req.user.id);
  res.json({ success: true, data: item });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await usersService.resetPassword(req.tenantId, req.params.id, req.user.id);
  res.json({ success: true, data: result });
});

module.exports = { list, getById, create, update, remove, resetPassword };

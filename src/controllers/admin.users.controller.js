const asyncHandler = require('../utils/asyncHandler');
const usersService = require('../services/admin.users.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await usersService.list(req.query);
  res.json({ success: true, data: items, meta });
});

const getById = asyncHandler(async (req, res) => {
  const item = await usersService.getById(req.params.id);
  res.json({ success: true, data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await usersService.update(req.params.id, req.body);
  res.json({ success: true, data: item });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await usersService.resetPassword(req.params.id);
  res.json({ success: true, data: result });
});

module.exports = { list, getById, update, resetPassword };

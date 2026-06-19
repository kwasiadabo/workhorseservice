const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/admin.businessTypes.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  res.json({ success: true, data: items, meta });
});

const listPublic = asyncHandler(async (req, res) => {
  const items = await service.listActive();
  res.json({ success: true, data: items });
});

const getById = asyncHandler(async (req, res) => {
  const item = await service.getById(req.params.id);
  res.json({ success: true, data: item });
});

const create = asyncHandler(async (req, res) => {
  const item = await service.create(req.body);
  res.status(201).json({ success: true, data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await service.update(req.params.id, req.body);
  res.json({ success: true, data: item });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, listPublic, getById, create, update, remove };

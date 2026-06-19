const asyncHandler = require('./asyncHandler');

// Wraps a service produced by createCrudService into Express handlers.
const createCrudController = (service) => ({
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await service.list(req.tenantId, req.query);
    res.json({ success: true, data: items, meta });
  }),

  create: asyncHandler(async (req, res) => {
    const item = await service.create(req.tenantId, req.body);
    res.status(201).json({ success: true, data: item });
  }),

  getById: asyncHandler(async (req, res) => {
    const item = await service.getById(req.tenantId, req.params.id);
    res.json({ success: true, data: item });
  }),

  update: asyncHandler(async (req, res) => {
    const item = await service.update(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: item });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.remove(req.tenantId, req.params.id);
    res.status(204).send();
  }),
});

module.exports = { createCrudController };

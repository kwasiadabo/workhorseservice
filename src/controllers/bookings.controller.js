const asyncHandler = require('../utils/asyncHandler');
const bookingsService = require('../services/bookings.service');
const paymentsService = require('../services/payments.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await bookingsService.list(req.tenantId, req.user, req.query);
  res.json({ success: true, data: items, meta });
});

const create = asyncHandler(async (req, res) => {
  const booking = await bookingsService.create(req.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: booking });
});

const getById = asyncHandler(async (req, res) => {
  const booking = await bookingsService.getByIdForUser(req.tenantId, req.user, req.params.id);
  res.json({ success: true, data: booking });
});

const update = asyncHandler(async (req, res) => {
  const booking = await bookingsService.update(req.tenantId, req.params.id, req.body);
  res.json({ success: true, data: booking });
});

const remove = asyncHandler(async (req, res) => {
  await bookingsService.remove(req.tenantId, req.params.id);
  res.status(204).send();
});

const addService = asyncHandler(async (req, res) => {
  const booking = await bookingsService.addService(req.tenantId, req.params.id, req.body);
  res.status(201).json({ success: true, data: booking });
});

const removeService = asyncHandler(async (req, res) => {
  const booking = await bookingsService.removeService(req.tenantId, req.params.id, req.params.bsId);
  res.json({ success: true, data: booking });
});

const addAssignment = asyncHandler(async (req, res) => {
  const booking = await bookingsService.addAssignment(req.tenantId, req.user, req.params.id, req.body);
  res.status(201).json({ success: true, data: booking });
});

const updateAssignment = asyncHandler(async (req, res) => {
  const booking = await bookingsService.updateAssignment(req.tenantId, req.params.id, req.params.aId, req.body);
  res.json({ success: true, data: booking });
});

const removeAssignment = asyncHandler(async (req, res) => {
  await bookingsService.removeAssignment(req.tenantId, req.params.id, req.params.aId);
  res.status(204).send();
});

const listPayments = asyncHandler(async (req, res) => {
  const payments = await paymentsService.listForBooking(req.tenantId, req.params.id);
  res.json({ success: true, data: payments });
});

module.exports = {
  list,
  create,
  getById,
  update,
  remove,
  addService,
  removeService,
  addAssignment,
  updateAssignment,
  removeAssignment,
  listPayments,
};

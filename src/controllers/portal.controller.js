'use strict';

const asyncHandler = require('../utils/asyncHandler');
const portalService = require('../services/portal.service');

exports.getInfo = asyncHandler(async (req, res) => {
  const data = await portalService.getInfo(req.params.slug);
  res.json({ success: true, data });
});

exports.getStaff = asyncHandler(async (req, res) => {
  const data = await portalService.getStaff(req.params.slug);
  res.json({ success: true, data });
});

exports.getServices = asyncHandler(async (req, res) => {
  const data = await portalService.getServices(req.params.slug);
  res.json({ success: true, data });
});

exports.getAvailability = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'date query param required (YYYY-MM-DD)' });
  }
  const data = await portalService.getAvailability(req.params.slug, req.params.employeeId, date);
  res.json({ success: true, data });
});

exports.initializePayment = asyncHandler(async (req, res) => {
  const data = await portalService.initializeDepositPayment(req.params.slug, req.body);
  res.json({ success: true, data });
});

exports.createBooking = asyncHandler(async (req, res) => {
  const data = await portalService.createBooking(req.params.slug, req.body);
  res.status(201).json({ success: true, data });
});

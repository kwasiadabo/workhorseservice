'use strict';

const asyncHandler = require('../utils/asyncHandler');
const loyaltyService = require('../services/loyalty.service');

exports.getSettings = asyncHandler(async (req, res) => {
  const data = await loyaltyService.getSettings(req.tenantId);
  res.json({ success: true, data });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const data = await loyaltyService.updateSettings(req.tenantId, req.body);
  res.json({ success: true, data });
});

exports.listCustomerPoints = asyncHandler(async (req, res) => {
  const { items, meta } = await loyaltyService.listCustomerPoints(req.tenantId, req.query);
  res.json({ success: true, data: items, meta });
});

exports.redeemPoints = asyncHandler(async (req, res) => {
  const data = await loyaltyService.redeemPoints(req.tenantId, req.params.customerId);
  res.json({ success: true, data });
});

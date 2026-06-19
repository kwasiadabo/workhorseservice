'use strict';

const asyncHandler = require('../utils/asyncHandler');
const smsService = require('../services/sms.service');

exports.previewAudience = asyncHandler(async (req, res) => {
  const data = await smsService.previewAudience(req.tenantId, req.query);
  res.json({ success: true, data });
});

exports.sendCampaign = asyncHandler(async (req, res) => {
  const data = await smsService.sendCampaign(req.tenantId, req.user, req.body);
  res.status(201).json({ success: true, data });
});

exports.listCampaigns = asyncHandler(async (req, res) => {
  const { items, meta } = await smsService.listCampaigns(req.tenantId, req.query);
  res.json({ success: true, data: items, meta });
});

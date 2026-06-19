'use strict';

const asyncHandler = require('../utils/asyncHandler');
const reviewsService = require('../services/reviews.service');

// Public
exports.getByToken = asyncHandler(async (req, res) => {
  const data = await reviewsService.getReviewByToken(req.params.token);
  res.json({ success: true, data });
});

exports.submit = asyncHandler(async (req, res) => {
  const data = await reviewsService.submitReview(req.params.token, req.body);
  res.json({ success: true, data });
});

// Tenant-scoped
exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await reviewsService.list(req.tenantId, req.query);
  res.json({ success: true, data: items, meta });
});

exports.getSummary = asyncHandler(async (req, res) => {
  const data = await reviewsService.getSummary(req.tenantId);
  res.json({ success: true, data });
});

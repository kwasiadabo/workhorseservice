const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/serviceProviderReport.service');

exports.getPerformance = asyncHandler(async (req, res) => {
  const data = await service.getPerformance(req.tenantId, req.query);
  res.json({ success: true, data });
});

exports.getAssignments = asyncHandler(async (req, res) => {
  const data = await service.getAssignments(req.tenantId, req.query);
  res.json({ success: true, data });
});

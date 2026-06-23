const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/teamPerformanceReport.service');

exports.getPerformance = asyncHandler(async (req, res) => {
  const data = await service.getPerformance(req.tenantId, req.query);
  res.json({ success: true, data });
});

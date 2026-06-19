const asyncHandler = require('../utils/asyncHandler');
const reportsService = require('../services/reports.service');

const overview = asyncHandler(async (req, res) => {
  const data = await reportsService.getOverview(req.tenantId, req.query);
  res.json({ success: true, data });
});

module.exports = { overview };

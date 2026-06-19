const asyncHandler = require('../utils/asyncHandler');
const { getRevenueReport } = require('../services/revenueReport.service');

const getReport = asyncHandler(async (req, res) => {
  const data = await getRevenueReport(req.tenantId, req.query);
  res.json({ success: true, data });
});

module.exports = { getReport };

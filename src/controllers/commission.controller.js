const asyncHandler = require('../utils/asyncHandler');
const { getCommissionReport } = require('../services/commission.service');

const getReport = asyncHandler(async (req, res) => {
  const data = await getCommissionReport(req.tenantId, req.query);
  res.json({ success: true, data });
});

module.exports = { getReport };

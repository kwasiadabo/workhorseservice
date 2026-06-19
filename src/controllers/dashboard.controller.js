const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const me = asyncHandler(async (req, res) => {
  const data = await dashboardService.getMyDashboard(req.tenantId, req.user.id);
  res.json({ success: true, data });
});

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOwnerSummary(req.tenantId);
  res.json({ success: true, data });
});

module.exports = { me, summary };

const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/admin.dashboard.service');

const overview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOverview();
  res.json({ success: true, data });
});

module.exports = { overview };

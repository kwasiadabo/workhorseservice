const asyncHandler = require('../utils/asyncHandler');
const setupService = require('../services/setup.service');

const getStatus = asyncHandler(async (req, res) => {
  const data = await setupService.getStatus(req.tenantId);
  res.json({ success: true, data });
});

module.exports = { getStatus };

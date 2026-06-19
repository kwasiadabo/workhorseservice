const asyncHandler = require('../utils/asyncHandler');
const plansService = require('../services/plans.service');

const list = asyncHandler(async (req, res) => {
  const plans = await plansService.listActive();
  res.json({ success: true, data: plans });
});

module.exports = { list };

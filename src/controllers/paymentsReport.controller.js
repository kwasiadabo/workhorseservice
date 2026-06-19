const asyncHandler = require('../utils/asyncHandler');
const { getPaymentsReport } = require('../services/paymentsReport.service');

module.exports = {
  getReport: asyncHandler(async (req, res) => {
    const data = await getPaymentsReport(req.tenantId, req.query);
    res.json({ success: true, data });
  }),
};

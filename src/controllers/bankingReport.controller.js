const asyncHandler = require('../utils/asyncHandler');
const bankingReportService = require('../services/bankingReport.service');
const { subDays } = require('date-fns');

const getReport = asyncHandler(async (req, res) => {
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const startDate = req.query.startDate ? new Date(req.query.startDate) : subDays(endDate, 29);
  const bankAccountId = req.query.bankAccountId || undefined;

  const data = await bankingReportService.getReport(req.tenantId, { startDate, endDate, bankAccountId });
  res.json({ success: true, data });
});

module.exports = { getReport };

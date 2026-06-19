const asyncHandler = require('../utils/asyncHandler');
const expenseReportService = require('../services/expenseReport.service');

const getReport = asyncHandler(async (req, res) => {
  const data = await expenseReportService.getExpenseReport(req.tenantId, req.query);
  res.json({ success: true, data });
});

module.exports = { getReport };

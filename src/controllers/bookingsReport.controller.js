const asyncHandler = require('../utils/asyncHandler');
const { getBookingsReport } = require('../services/bookingsReport.service');

module.exports = {
  getReport: asyncHandler(async (req, res) => {
    const data = await getBookingsReport(req.tenantId, req.query);
    res.json({ success: true, data });
  }),
};

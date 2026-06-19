const { z } = require('zod');

const getRevenueReportSchema = {
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    branchId: z.string().uuid().optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  }),
};

module.exports = { getRevenueReportSchema };

const { z } = require('zod');

const getPerformanceSchema = {
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    branchId: z.string().uuid().optional(),
  }),
};

module.exports = { getPerformanceSchema };

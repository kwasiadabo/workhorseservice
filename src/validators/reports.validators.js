const { z } = require('zod');

const getOverviewSchema = {
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    branchId: z.string().uuid().optional(),
  }),
};

module.exports = { getOverviewSchema };

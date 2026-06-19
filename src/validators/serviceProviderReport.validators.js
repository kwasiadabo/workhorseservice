const { z } = require('zod');

const periodFields = {
  startDate: z.string().optional(),
  endDate: z.string().optional(),
};

const getPerformanceSchema = {
  query: z.object({
    ...periodFields,
    branchId: z.string().uuid().optional(),
  }),
};

const getAssignmentsSchema = {
  query: z.object({
    ...periodFields,
    employeeId: z.string().uuid(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

module.exports = { getPerformanceSchema, getAssignmentsSchema };

const { z } = require('zod');

const idParamSchema = z.object({ id: z.string().uuid() });

// For nested routes like /bookings/:id/services/:bsId
const nestedIdParamSchema = (key) => z.object({ id: z.string().uuid(), [key]: z.string().uuid() });

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
});

module.exports = { idParamSchema, nestedIdParamSchema, paginationQuerySchema };

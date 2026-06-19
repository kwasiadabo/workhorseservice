const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');
const { ROLES } = require('../config/permissions');

const listUsersSchema = {
  query: paginationQuerySchema.extend({
    tenantId: z.string().uuid().optional(),
    role: z.enum(ROLES).optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
};

const updateUserSchema = {
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional(),
    isActive: z.boolean().optional(),
  }),
};

module.exports = { listUsersSchema, updateUserSchema };

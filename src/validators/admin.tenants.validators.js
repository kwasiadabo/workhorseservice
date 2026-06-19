const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const TENANT_STATUSES = ['trial', 'active', 'suspended', 'cancelled'];

const updateTenantSchema = {
  body: z.object({
    name: z.string().min(2).max(150).optional(),
    status: z.enum(TENANT_STATUSES).optional(),
    planId: z.string().uuid().nullable().optional(),
    trialEndsAt: z.coerce.date().nullable().optional(),
  }),
};

const listTenantsSchema = {
  query: paginationQuerySchema.extend({
    status: z.enum(TENANT_STATUSES).optional(),
  }),
};

module.exports = { TENANT_STATUSES, updateTenantSchema, listTenantsSchema };

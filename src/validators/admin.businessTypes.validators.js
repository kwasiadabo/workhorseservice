const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const valueSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_]+$/, 'Value must contain only lowercase letters, digits, or underscores');

const createBusinessTypeSchema = {
  body: z.object({
    value: valueSchema,
    label: z.string().min(1).max(150),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
};

const updateBusinessTypeSchema = {
  body: z.object({
    value: valueSchema.optional(),
    label: z.string().min(1).max(150).optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
};

const listBusinessTypesSchema = {
  query: paginationQuerySchema,
};

module.exports = { createBusinessTypeSchema, updateBusinessTypeSchema, listBusinessTypesSchema };

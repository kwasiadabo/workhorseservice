const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const serviceCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const createServiceCategorySchema = { body: serviceCategorySchema };
const updateServiceCategorySchema = { body: serviceCategorySchema.partial() };
const listServiceCategoriesSchema = { query: paginationQuerySchema };

module.exports = { createServiceCategorySchema, updateServiceCategorySchema, listServiceCategoriesSchema };

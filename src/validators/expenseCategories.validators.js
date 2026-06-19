const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const expenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const createExpenseCategorySchema = { body: expenseCategorySchema };
const updateExpenseCategorySchema = { body: expenseCategorySchema.partial() };
const listExpenseCategoriesSchema = { query: paginationQuerySchema };

module.exports = { createExpenseCategorySchema, updateExpenseCategorySchema, listExpenseCategoriesSchema };

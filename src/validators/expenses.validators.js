const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const expenseSchema = z.object({
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  description: z.string().max(1000).optional().or(z.literal('')),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).optional(),
  expenseDate: z.coerce.date(),
});

const createExpenseSchema = { body: expenseSchema };
const updateExpenseSchema = { body: expenseSchema.partial() };
const listExpensesSchema = {
  query: paginationQuerySchema.extend({
    branchId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
};

module.exports = { createExpenseSchema, updateExpenseSchema, listExpensesSchema };

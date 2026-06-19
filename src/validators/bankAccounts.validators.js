const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const bankAccountSchema = z.object({
  bankId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  accountName: z.string().min(1).max(150),
  accountNumber: z.string().min(1).max(50),
  accountType: z.enum(['savings', 'current']).optional(),
  openingBalance: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
});

const createBankAccountSchema = { body: bankAccountSchema };
const updateBankAccountSchema = { body: bankAccountSchema.partial() };
const listBankAccountsSchema = {
  query: paginationQuerySchema.extend({
    bankId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    isActive: z.string().optional(),
  }),
};

module.exports = { createBankAccountSchema, updateBankAccountSchema, listBankAccountsSchema };

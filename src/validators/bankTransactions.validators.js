const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const bankTransactionSchema = z.object({
  bankAccountId: z.string().uuid(),
  branch: z.string().max(150).optional().or(z.literal('')),
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.coerce.number().positive(),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  transactionDate: z.coerce.date(),
});

const createBankTransactionSchema = { body: bankTransactionSchema };
const updateBankTransactionSchema = { body: bankTransactionSchema.partial() };
const listBankTransactionsSchema = {
  query: paginationQuerySchema.extend({
    bankAccountId: z.string().uuid().optional(),
    type: z.enum(['deposit', 'withdrawal']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
};

module.exports = { createBankTransactionSchema, updateBankTransactionSchema, listBankTransactionsSchema };

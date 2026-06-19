const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const bankSchema = z.object({
  name: z.string().min(1).max(150),
  shortCode: z.string().max(20).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const createBankSchema = { body: bankSchema };
const updateBankSchema = { body: bankSchema.partial() };
const listBanksSchema = { query: paginationQuerySchema };

module.exports = { createBankSchema, updateBankSchema, listBanksSchema };

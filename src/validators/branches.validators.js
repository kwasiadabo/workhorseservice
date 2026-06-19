const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const branchSchema = z.object({
  name: z.string().min(1).max(150),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(150).optional(),
  isActive: z.boolean().optional(),
});

const createBranchSchema = { body: branchSchema };
const updateBranchSchema = { body: branchSchema.partial() };
const listBranchesSchema = { query: paginationQuerySchema };

module.exports = { createBranchSchema, updateBranchSchema, listBranchesSchema };

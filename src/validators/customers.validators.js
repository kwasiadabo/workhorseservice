const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().max(150).optional(),
  phone: z.string().min(1, 'Phone is required').max(30),
  notes: z.string().optional(),
  smsOptOut: z.boolean().optional(),
});

const createCustomerSchema = { body: customerSchema };
const updateCustomerSchema = { body: customerSchema.partial() };
const listCustomersSchema = { query: paginationQuerySchema };

module.exports = { createCustomerSchema, updateCustomerSchema, listCustomersSchema };

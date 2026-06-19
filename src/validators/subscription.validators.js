const { z } = require('zod');

const activateSchema = {
  body: z.object({
    planId: z.string().uuid('Invalid plan ID'),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  }),
};

const initializePaymentSchema = {
  body: z.object({
    planId: z.string().uuid('Invalid plan ID'),
    billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  }),
};

const verifyPaymentSchema = {
  body: z.object({
    reference: z.string().min(1).max(100),
  }),
};

module.exports = { activateSchema, initializePaymentSchema, verifyPaymentSchema };

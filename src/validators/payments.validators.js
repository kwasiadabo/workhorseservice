const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const PAYMENT_METHODS = ['cash', 'card', 'mobile_money', 'bank_transfer', 'other'];

const createPaymentSchema = {
  body: z.object({
    bookingId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    currency: z.string().length(3).optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    referenceNumber: z.string().max(100).optional(),
    paidAt: z.coerce.date().optional(),
    notes: z.string().optional(),
  }),
};

const listPaymentsSchema = {
  query: paginationQuerySchema
    .extend({
      bookingId: z.string().uuid().optional(),
      employeeId: z.string().uuid().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }),
};

module.exports = { PAYMENT_METHODS, createPaymentSchema, listPaymentsSchema };

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const CASH_HANDOVER_STATUSES = ['submitted', 'reconciled', 'disputed'];
const REVIEW_STATUSES = ['reconciled', 'disputed'];

const periodRefinement = (data) => data.periodEnd >= data.periodStart;
const periodRefinementOptions = {
  message: 'periodEnd must be on or after periodStart',
  path: ['periodEnd'],
};

const createCashHandoverSchema = {
  body: z
    .object({
      employeeId: z.string().uuid().optional(),
      branchId: z.string().uuid().optional(),
      periodStart: z.coerce.date(),
      periodEnd: z.coerce.date(),
      declaredAmount: z.coerce.number().min(0),
      notes: z.string().optional(),
    })
    .refine(periodRefinement, periodRefinementOptions),
};

const listCashHandoversSchema = {
  query: paginationQuerySchema
    .extend({
      employeeId: z.string().uuid().optional(),
      branchId: z.string().uuid().optional(),
      status: z.enum(CASH_HANDOVER_STATUSES).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }),
};

const previewCashHandoverSchema = {
  query: z
    .object({
      employeeId: z.string().uuid().optional(),
      periodStart: z.coerce.date(),
      periodEnd: z.coerce.date(),
    })
    .refine(periodRefinement, periodRefinementOptions),
};

const reviewCashHandoverSchema = {
  body: z.object({
    status: z.enum(REVIEW_STATUSES),
    reviewNotes: z.string().optional(),
  }),
};

module.exports = {
  CASH_HANDOVER_STATUSES,
  REVIEW_STATUSES,
  createCashHandoverSchema,
  listCashHandoversSchema,
  previewCashHandoverSchema,
  reviewCashHandoverSchema,
};

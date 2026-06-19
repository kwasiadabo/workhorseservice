const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const baseAudienceSchema = z.object({
  audienceType: z.enum(['all', 'branch']).optional().default('all'),
  branchId: z.string().uuid().optional(),
});

const requireBranchIdWhenBranch = (data, ctx) => {
  if (data.audienceType === 'branch' && !data.branchId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'branchId is required when audienceType is "branch"',
      path: ['branchId'],
    });
  }
};

const previewAudienceSchema = { query: baseAudienceSchema.superRefine(requireBranchIdWhenBranch) };

const sendCampaignSchema = {
  body: baseAudienceSchema
    .extend({ message: z.string().min(1, 'Message is required').max(480) })
    .superRefine(requireBranchIdWhenBranch),
};

const listCampaignsSchema = { query: paginationQuerySchema };

module.exports = { sendCampaignSchema, previewAudienceSchema, listCampaignsSchema };

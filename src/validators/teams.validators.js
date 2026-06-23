const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const teamSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

const createTeamSchema = { body: teamSchema };
const updateTeamSchema = { body: teamSchema.partial() };
const listTeamsSchema = {
  query: paginationQuerySchema.extend({
    branchId: z.string().uuid().optional(),
    isActive: z.coerce.boolean().optional(),
  }),
};

module.exports = { createTeamSchema, updateTeamSchema, listTeamsSchema };

const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const positionSchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const createPositionSchema = { body: positionSchema };
const updatePositionSchema = { body: positionSchema.partial() };
const listPositionsSchema = { query: paginationQuerySchema };

module.exports = { createPositionSchema, updatePositionSchema, listPositionsSchema };

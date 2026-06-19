const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const vehicleTypeSchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

const createVehicleTypeSchema = { body: vehicleTypeSchema };
const updateVehicleTypeSchema = { body: vehicleTypeSchema.partial() };
const listVehicleTypesSchema = { query: paginationQuerySchema };

module.exports = { createVehicleTypeSchema, updateVehicleTypeSchema, listVehicleTypesSchema };

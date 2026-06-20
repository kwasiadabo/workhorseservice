const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const vehicleSchema = z.object({
  customerId: z.string().uuid(),
  vehicleTypeId: z.string().uuid().optional(),
  registration: z.string().min(1, 'Registration is required').max(50),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
});

const createVehicleSchema = { body: vehicleSchema };
const updateVehicleSchema = { body: vehicleSchema.partial() };
const listVehiclesSchema = {
  query: paginationQuerySchema.extend({ customerId: z.string().uuid().optional() }),
};

module.exports = { createVehicleSchema, updateVehicleSchema, listVehiclesSchema };

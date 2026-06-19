const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const vehiclePriceSchema = z.object({
  vehicleTypeId: z.string().uuid(),
  price: z.coerce.number().min(0),
});

const serviceSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  price: z.coerce.number().min(0).optional().default(0),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
  vehiclePrices: z.array(vehiclePriceSchema).optional(),
});

const createServiceSchema = { body: serviceSchema };
const updateServiceSchema = { body: serviceSchema.partial() };
const listServicesSchema = {
  query: paginationQuerySchema.extend({
    categoryId: z.string().uuid().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
};

module.exports = { createServiceSchema, updateServiceSchema, listServicesSchema };

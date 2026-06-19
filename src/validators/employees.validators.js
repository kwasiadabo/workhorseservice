const { z } = require('zod');
const { paginationQuerySchema } = require('./common.validators');

const employeeSchema = z.object({
  branchId: z.string().uuid(),
  userId: z.string().uuid().nullable().optional(),
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(150).optional(),
  phone: z.string().max(30).optional(),
  positionId: z.string().uuid().nullable().optional(),
  hireDate: z.string().date().optional(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
});

const createEmployeeSchema = { body: employeeSchema };
const updateEmployeeSchema = { body: employeeSchema.partial() };
const listEmployeesSchema = {
  query: paginationQuerySchema.extend({
    branchId: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive', 'on_leave']).optional(),
    unassigned: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
};

module.exports = { createEmployeeSchema, updateEmployeeSchema, listEmployeesSchema };
